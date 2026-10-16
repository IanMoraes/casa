// Datas como texto ISO ("2026-10-16") para não sofrer com fuso horário:
// o banco guarda `date`, e o app só precisa de dia, mês e ano.

export type IsoDate = string; // "AAAA-MM-DD"
export type MonthKey = string; // "AAAA-MM-01"

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): IsoDate {
  return toIsoDate(new Date());
}

export function parts(iso: IsoDate) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m, day: d ?? 1 };
}

export function monthOf(iso: IsoDate): MonthKey {
  const { year, month } = parts(iso);
  return `${year}-${pad(month)}-01`;
}

export function currentMonth(): MonthKey {
  return monthOf(today());
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const { year, month: m } = parts(month);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
}

export function daysInMonth(month: MonthKey) {
  const { year, month: m } = parts(month);
  return new Date(year, m, 0).getDate();
}

export function endOfMonth(month: MonthKey): IsoDate {
  return `${month.slice(0, 8)}${pad(daysInMonth(month))}`;
}

// Dia de vencimento dentro do mês; dia 31 vira o último dia em meses curtos.
export function dueDateIn(month: MonthKey, dueDay: number): IsoDate {
  return `${month.slice(0, 8)}${pad(Math.min(dueDay, daysInMonth(month)))}`;
}

export function diffInDays(from: IsoDate, to: IsoDate) {
  const a = parts(from);
  const b = parts(to);
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
  return Math.round(ms / 86_400_000);
}

// "?mes=2026-10" na URL. Qualquer valor inválido cai no mês atual.
export function parseMonthParam(value: string | string[] | undefined): MonthKey {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return `${raw}-01`;
  return currentMonth();
}

export function toMonthParam(month: MonthKey) {
  return month.slice(0, 7);
}

export function monthLabel(month: MonthKey, withYear = true) {
  const { year, month: m } = parts(month);
  const name = MONTHS[m - 1];
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return withYear ? `${label} de ${year}` : label;
}

export function shortMonthLabel(month: MonthKey) {
  const { year, month: m } = parts(month);
  return `${MONTHS[m - 1].slice(0, 3)}/${String(year).slice(2)}`;
}

export function formatDay(iso: IsoDate) {
  const { day, month } = parts(iso);
  return `${pad(day)}/${pad(month)}`;
}

export function formatDate(iso: IsoDate) {
  const { day, month, year } = parts(iso);
  return `${pad(day)}/${pad(month)}/${year}`;
}
