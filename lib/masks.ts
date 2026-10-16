import { formatAmount } from "@/lib/money";

// Máscaras de digitação. Funções puras: recebem o texto do campo e devolvem
// o texto formatado.

const MAX_DIGITS = 13; // até 99.999.999.999,99

// Dinheiro no estilo de app de banco: só números, e os dois últimos são os
// centavos. "1" → "0,01", "123" → "1,23", "123456" → "1.234,56".
// Com `allowNegative`, digitar "-" troca o sinal.
export function maskMoney(raw: string, allowNegative = false) {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
  if (!digits) return "";
  const minus = allowNegative && (raw.match(/-/g)?.length ?? 0) % 2 === 1;
  const value = Number(digits) / 100;
  return `${minus && value !== 0 ? "-" : ""}${formatAmount(value)}`;
}

export function moneyToMasked(value: number | null | undefined, allowNegative = false) {
  if (value === null || value === undefined) return "";
  const cents = Math.round(Math.abs(value) * 100);
  return maskMoney(`${allowNegative && value < 0 ? "-" : ""}${cents}`, allowNegative);
}

// Troca o sinal de um valor já mascarado (botão ±).
export function toggleMoneySign(masked: string) {
  if (!masked) return masked;
  return masked.startsWith("-") ? masked.slice(1) : `-${masked}`;
}

// Código de convite: 8 letras e números, em maiúsculas.
export function maskInviteCode(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

// Dia do mês: só números, de 1 a 31.
export function maskDay(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  const n = Number(digits);
  if (n > 31) return "31";
  return digits === "0" || digits === "00" ? "" : String(n);
}
