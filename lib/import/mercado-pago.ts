import { cellAmount, cellDate, cellText, normalizeHeader } from "./cells";
import type { ParsedStatement, Sheet, StatementParser, StatementRow } from "./types";

// Extratos do Mercado Pago (CSV ou Excel). Há vários relatórios com nomes de
// colunas diferentes; o leitor procura a linha de cabeçalho e aceita os nomes
// conhecidos, em inglês ou português. O formato mais comum:
//
//   INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE
//   1.000,00;500,00;-200,00;1.300,00
//
//   RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE
//   01-10-2026;Transferência Pix recebida Fulano;123456789;500,00;1.500,00
//
// Também aceita valor em duas colunas (crédito e débito) e relatórios com
// linhas de resumo (RECORD_TYPE), que são ignoradas.

// Em cada lista, o primeiro nome encontrado ganha.
const COLUMNS = {
  date: [
    "release date", "date", "transaction date", "data", "data de liberacao", "data da operacao",
    "data da transacao", "data de lancamento", "fecha",
  ],
  description: [
    "transaction type", "description", "descricao", "detalhe", "detalhes", "tipo de transacao",
    "tipo de operacao", "operacao", "historico", "descripcion",
  ],
  id: [
    "reference id", "source id", "operation id", "id da operacao", "id da transacao", "id de referencia",
    "id de operacao", "numero da operacao", "id",
  ],
  amount: [
    "transaction net amount", "settlement net amount", "net amount", "valor", "valor liquido",
    "valor liquido da transacao", "transaction amount", "amount", "monto",
  ],
  credit: ["net credit amount", "net credit", "credito", "creditos", "valor de entrada", "entrada", "entradas"],
  debit: ["net debit amount", "net debit", "debito", "debitos", "valor de saida", "saida", "saidas"],
  balance: ["partial balance", "saldo", "saldo parcial", "balance"],
  recordType: ["record type"],
} as const;

const SUMMARY = {
  initial: ["initial balance", "saldo inicial", "initial available balance"],
  final: ["final balance", "saldo final", "final available balance"],
} as const;

function findColumn(headers: string[], names: readonly string[]) {
  for (const name of names) {
    const i = headers.indexOf(name);
    if (i !== -1) return i;
  }
  return -1;
}

function findHeaderRow(sheet: Sheet) {
  for (let i = 0; i < Math.min(sheet.length, 60); i++) {
    const headers = (sheet[i] ?? []).map(normalizeHeader);
    const date = findColumn(headers, COLUMNS.date);
    const amount = findColumn(headers, COLUMNS.amount);
    const credit = findColumn(headers, COLUMNS.credit);
    const debit = findColumn(headers, COLUMNS.debit);
    if (date !== -1 && (amount !== -1 || credit !== -1 || debit !== -1)) {
      return {
        index: i,
        date,
        amount,
        credit,
        debit,
        description: findColumn(headers, COLUMNS.description),
        id: findColumn(headers, COLUMNS.id),
        balance: findColumn(headers, COLUMNS.balance),
        recordType: findColumn(headers, COLUMNS.recordType),
      };
    }
  }
  return null;
}

function findSummary(sheet: Sheet, beforeRow: number) {
  for (let i = 0; i < beforeRow - 1; i++) {
    const headers = (sheet[i] ?? []).map(normalizeHeader);
    const initial = findColumn(headers, SUMMARY.initial);
    const final = findColumn(headers, SUMMARY.final);
    if (initial !== -1 || final !== -1) {
      const values = sheet[i + 1] ?? [];
      return {
        initialBalance: initial !== -1 ? cellAmount(values[initial]) : null,
        finalBalance: final !== -1 ? cellAmount(values[final]) : null,
      };
    }
  }
  return { initialBalance: null, finalBalance: null };
}

export function parseMercadoPago(sheet: Sheet): ParsedStatement {
  const header = findHeaderRow(sheet);
  if (!header) {
    const sample = sheet
      .slice(0, 8)
      .map((line) => (line ?? []).map(cellText).filter(Boolean).join(" | "))
      .filter(Boolean)
      .slice(0, 3)
      .join(" / ");
    throw new Error(
      `Não encontrei as colunas de data e valor no arquivo. Confira se é o extrato da conta do Mercado Pago. Início do arquivo: ${sample.slice(0, 200) || "(vazio)"}`,
    );
  }

  const { initialBalance, finalBalance } = findSummary(sheet, header.index);
  const rows: StatementRow[] = [];
  const skipped: ParsedStatement["skipped"] = [];
  // O mesmo ID pode aparecer em mais de uma linha (pagamento e tarifa, por
  // exemplo). Repetições ganham um sufixo estável (#2, #3…).
  const seenIds = new Map<string, number>();

  for (let i = header.index + 1; i < sheet.length; i++) {
    const line = sheet[i];
    if (!line || line.every((c) => cellText(c) === "")) continue;

    if (header.recordType !== -1) {
      const type = normalizeHeader(line[header.recordType]);
      if (type && type !== "release") continue; // saldos e totais do relatório
    }

    const occurredOn = cellDate(line[header.date]);
    let amount: number | null = null;
    if (header.amount !== -1) {
      amount = cellAmount(line[header.amount]);
    } else {
      const credit = header.credit !== -1 ? (cellAmount(line[header.credit]) ?? 0) : 0;
      const debit = header.debit !== -1 ? (cellAmount(line[header.debit]) ?? 0) : 0;
      amount = Math.round((Math.abs(credit) - Math.abs(debit)) * 100) / 100;
    }
    const description =
      header.description !== -1 ? cellText(line[header.description]).replace(/\s+/g, " ") : "";

    if (!occurredOn) {
      // Linhas de rodapé ("Total", observações) não são erro.
      if (cellText(line[header.date])) skipped.push({ line: i + 1, reason: "Data inválida" });
      continue;
    }
    if (amount === null || amount === 0) {
      skipped.push({ line: i + 1, reason: "Valor vazio ou zero" });
      continue;
    }

    let baseId = header.id !== -1 ? cellText(line[header.id]) : "";
    if (!baseId) baseId = `${occurredOn}|${amount}|${description}`;
    const n = (seenIds.get(baseId) ?? 0) + 1;
    seenIds.set(baseId, n);

    rows.push({
      occurredOn,
      description: (description || "Movimentação").slice(0, 200),
      amount,
      externalId: `mp:${baseId}${n > 1 ? `#${n}` : ""}`.slice(0, 300),
      balanceAfter: header.balance !== -1 ? cellAmount(line[header.balance]) : null,
    });
  }

  return {
    rows,
    initialBalance,
    finalBalance: finalBalance ?? rows.at(-1)?.balanceAfter ?? null,
    skipped,
  };
}

export const mercadoPago: StatementParser = {
  id: "mercado_pago",
  label: "Mercado Pago",
  parse: parseMercadoPago,
};
