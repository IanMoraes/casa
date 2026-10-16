import { addMonths, monthOf, type MonthKey } from "@/lib/dates";
import { round2 } from "@/lib/money";
import type { TransactionKind } from "@/lib/database.types";

type TxLike = {
  account_id: string;
  kind: TransactionKind;
  amount: number;
  occurred_on: string;
  category_id: string | null;
};

// Saldo = saldo inicial + todos os lançamentos (inclui transferências e ajustes).
export function balanceOf(initialBalance: number, transactions: Pick<TxLike, "amount">[]) {
  return round2(transactions.reduce((acc, t) => acc + t.amount, initialBalance));
}

// Entradas e saídas "de verdade": transferências entre contas da casa e
// ajustes de saldo não são ganho nem gasto.
export function isIncomeOrExpense(t: Pick<TxLike, "kind">) {
  return t.kind === "entrada" || t.kind === "saida";
}

export function totals(transactions: TxLike[]) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!isIncomeOrExpense(t)) continue;
    if (t.amount > 0) income += t.amount;
    else expense += -t.amount;
  }
  return { income: round2(income), expense: round2(expense), net: round2(income - expense) };
}

export function totalsByMonth(transactions: TxLike[], months: MonthKey[]) {
  const byMonth = new Map(months.map((m) => [m, [] as TxLike[]]));
  for (const t of transactions) {
    byMonth.get(monthOf(t.occurred_on))?.push(t);
  }
  return months.map((month) => ({ month, ...totals(byMonth.get(month) ?? []) }));
}

export function expensesByCategory(transactions: TxLike[]) {
  const map = new Map<string | null, number>();
  for (const t of transactions) {
    if (!isIncomeOrExpense(t) || t.amount >= 0) continue;
    map.set(t.category_id, (map.get(t.category_id) ?? 0) - t.amount);
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

// Saldo no fim de cada mês, a partir do saldo inicial somado de todas as contas.
export function balanceHistory(initialTotal: number, transactions: TxLike[], months: MonthKey[]) {
  const sorted = [...transactions].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const result: { month: MonthKey; balance: number }[] = [];
  let running = initialTotal;
  let i = 0;
  for (const month of months) {
    const next = addMonths(month, 1);
    while (i < sorted.length && sorted[i].occurred_on < next) {
      running += sorted[i].amount;
      i += 1;
    }
    result.push({ month, balance: round2(running) });
  }
  return result;
}
