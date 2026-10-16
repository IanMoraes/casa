const brl = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Só o número ("1.234,56"); o "R$" é desenhado à parte, em peso mais leve.
export function formatAmount(value: number) {
  return brl.format(Math.abs(value));
}

export function formatBRL(value: number) {
  return `${value < 0 ? "-" : ""}R$ ${formatAmount(value)}`;
}

// Aceita "1.234,56", "1234.56", "-150,00", "R$ 10" e números.
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? round2(input) : null;

  let s = input.trim().replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (!s) return null;

  const negative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[-()+]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // Formato brasileiro: ponto separa milhar, vírgula separa centavos.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    // Formato americano com milhar: "1,234.56".
    s = s.replace(/,/g, "");
  } else if (lastDot !== -1 && lastComma === -1) {
    // Só pontos: "1.234" (milhar) ou "12.5" (decimal).
    const decimals = s.length - lastDot - 1;
    if (decimals === 3 && s.split(".").length >= 2) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return round2(negative ? -n : n);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function sum(values: number[]) {
  return round2(values.reduce((acc, v) => acc + v, 0));
}
