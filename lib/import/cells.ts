import { toIsoDate, type IsoDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";

import type { Cell } from "./types";

export function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return toIsoDate(cell);
  return String(cell).trim();
}

// Cabeçalhos comparados sem acento, sem caixa e sem pontuação.
export function normalizeHeader(cell: Cell) {
  return cellText(cell)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cellAmount(cell: Cell): number | null {
  if (cell instanceof Date) return null;
  return parseAmount(cell ?? null);
}

// Excel guarda datas como número de dias desde 30/12/1899.
function fromExcelSerial(serial: number): IsoDate {
  const ms = Math.round((serial - 25569) * 86_400_000);
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Aceita "16-10-2026", "16/10/2026", "2026-10-16", com ou sem hora, Date e
// número serial do Excel.
export function cellDate(cell: Cell): IsoDate | null {
  if (cell === null || cell === undefined || cell === "") return null;
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : toIsoDate(cell);
  if (typeof cell === "number") return cell > 20000 && cell < 80000 ? fromExcelSerial(cell) : null;

  const s = cell.trim();
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return valid(Number(year), Number(m[2]), Number(m[1]));
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

function valid(year: number, month: number, day: number): IsoDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
