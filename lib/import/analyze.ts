import { addMonths, diffInDays, monthOf, parts, type IsoDate, type MonthKey } from "@/lib/dates";
import { round2 } from "@/lib/money";

// Análise do extrato antes de importar: o que já existe (para não duplicar) e
// o que se repete todo mês (para sugerir virar conta fixa). Funções puras.

export type ExistingTx = {
  occurredOn: IsoDate;
  amount: number;
  description: string;
  externalId: string | null;
  categoryId: string | null;
};

export type StatementLine = { occurredOn: IsoDate; description: string; amount: number };

const STOP_WORDS = new Set([
  "pix", "transferencia", "enviada", "enviado", "recebida", "recebido", "pagamento", "pagto", "compra",
  "com", "qr", "de", "da", "do", "das", "dos", "no", "na", "em", "e", "a", "o", "para", "por",
  "debito", "credito", "cartao", "mp", "pg", "ltda", "me", "sa",
]);

// Chave para comparar descrições: sem acento, sem números e sem palavras
// genéricas ("Pagamento Enel 10/2026" e "Pagamento de conta Enel" → "conta enel"
// e "enel" ficam próximos o bastante para o teste de contém).
export function normalizeDescription(text: string) {
  const words = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const meaningful = words.filter((w) => !STOP_WORDS.has(w));
  return (meaningful.length > 0 ? meaningful : words).join(" ").trim();
}

function similar(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.includes(short);
}

// ---------------------------------------------------------------------------
// Repetidas "parecidas": mesma conta, mesmo valor, data no mesmo dia ou no dia
// seguinte/anterior, que já existem (lançadas à mão ou vindas de outro arquivo,
// com outro ID). O ID igual é tratado à parte (duplicata certa).
// ---------------------------------------------------------------------------

export type PossibleDuplicate = { existingDescription: string; existingDate: IsoDate };

export function findPossibleDuplicates(
  rows: (StatementLine & { externalId: string })[],
  existing: ExistingTx[],
): Map<number, PossibleDuplicate> {
  const used = new Set<number>();
  const result = new Map<number, PossibleDuplicate>();

  rows.forEach((row, rowIndex) => {
    let best: { index: number; score: number } | null = null;
    existing.forEach((tx, index) => {
      if (used.has(index) || tx.externalId === row.externalId) return;
      if (Math.abs(tx.amount - row.amount) > 0.005) return;
      const days = Math.abs(diffInDays(tx.occurredOn, row.occurredOn));
      if (days > 1) return;
      const sameText = similar(normalizeDescription(tx.description), normalizeDescription(row.description));
      // Mesmo dia pesa mais que texto parecido; texto parecido desempata.
      const score = (days === 0 ? 2 : 0) + (sameText ? 1 : 0);
      if (!best || score > best.score) best = { index, score };
    });
    if (best) {
      const { index } = best as { index: number };
      used.add(index);
      result.set(rowIndex, { existingDescription: existing[index].description, existingDate: existing[index].occurredOn });
    }
  });
  return result;
}

// ---------------------------------------------------------------------------
// Gastos que se repetem todo mês → sugestão de conta fixa.
// ---------------------------------------------------------------------------

export type RecurringSuggestion = {
  key: string;
  description: string;
  kind: "entrada" | "saida";
  amount: number; // sempre positivo
  dueDay: number;
  months: number;
  occurrences: number;
  lastMonth: MonthKey;
  startMonth: MonthKey; // mês seguinte ao último visto
  categoryId: string | null;
};

const MIN_MONTHS = 3;
const AMOUNT_TOLERANCE = 0.2; // ±20% da mediana
const DAY_TOLERANCE = 6; // ±6 dias da mediana
const MIN_COVERAGE = 0.6; // meses vistos ÷ meses do intervalo

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function monthIndex(month: MonthKey) {
  const { year, month: m } = parts(month);
  return year * 12 + (m - 1);
}

export function detectRecurring(
  entries: (StatementLine & { categoryId?: string | null })[],
  existingBillDescriptions: string[] = [],
): RecurringSuggestion[] {
  const billKeys = existingBillDescriptions.map(normalizeDescription).filter(Boolean);
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    if (e.amount === 0) continue;
    const key = `${e.amount > 0 ? "in" : "out"}|${normalizeDescription(e.description)}`;
    if (key.length < 6) continue;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const suggestions: RecurringSuggestion[] = [];
  for (const [key, group] of groups) {
    const textKey = key.slice(key.indexOf("|") + 1);
    if (billKeys.some((b) => similar(b, textKey))) continue;

    // Fica só com os valores perto da mediana (reajustes pequenos são normais).
    const mid = median(group.map((g) => Math.abs(g.amount)));
    const consistent = group.filter((g) => Math.abs(Math.abs(g.amount) - mid) <= mid * AMOUNT_TOLERANCE);
    if (consistent.length < MIN_MONTHS) continue;

    const months = [...new Set(consistent.map((g) => monthOf(g.occurredOn)))].sort();
    if (months.length < MIN_MONTHS) continue;
    // Várias vezes no mesmo mês (mercado, Uber) não é conta fixa.
    if (consistent.length > months.length * 1.5) continue;

    const span = monthIndex(months.at(-1)!) - monthIndex(months[0]) + 1;
    if (span > 14 || months.length / span < MIN_COVERAGE) continue;

    const days = consistent.map((g) => parts(g.occurredOn).day);
    const medianDay = Math.round(median(days));
    if (days.some((d) => Math.abs(d - medianDay) > DAY_TOLERANCE)) continue;

    const latest = [...consistent].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0];
    const categoryCount = new Map<string, number>();
    for (const g of consistent) if (g.categoryId) categoryCount.set(g.categoryId, (categoryCount.get(g.categoryId) ?? 0) + 1);
    const categoryId = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const lastMonth = months.at(-1)!;

    suggestions.push({
      key,
      description: latest.description,
      kind: latest.amount > 0 ? "entrada" : "saida",
      amount: round2(Math.abs(latest.amount) > 0 ? median(consistent.map((g) => Math.abs(g.amount))) : 0),
      dueDay: Math.min(31, Math.max(1, medianDay)),
      months: months.length,
      occurrences: consistent.length,
      lastMonth,
      startMonth: addMonths(lastMonth, 1),
      categoryId,
    });
  }

  return suggestions.sort((a, b) => b.amount - a.amount);
}
