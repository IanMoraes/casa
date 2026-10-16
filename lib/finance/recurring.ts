import { diffInDays, dueDateIn, type IsoDate, type MonthKey } from "@/lib/dates";

// Contas fixas não viram lançamentos com antecedência: a lista de cada mês é
// calculada juntando as contas fixas ativas com os pagamentos já feitos.

export type BillStatus = "paga" | "atrasada" | "vence-logo" | "prevista";

export const DUE_SOON_DAYS = 3;

export type RecurringBillLike = {
  id: string;
  due_day: number;
  start_month: MonthKey;
  end_month: MonthKey | null;
  active: boolean;
};

export type BillPaymentLike = {
  id: string;
  recurring_bill_id: string | null;
  reference_month: MonthKey | null;
  amount: number;
  occurred_on: IsoDate;
};

export type BillOccurrence<B, P> = {
  bill: B;
  month: MonthKey;
  dueDate: IsoDate;
  status: BillStatus;
  payment: P | null;
};

export function isBillInMonth(bill: RecurringBillLike, month: MonthKey) {
  if (bill.start_month > month) return false;
  if (bill.end_month && bill.end_month < month) return false;
  return true;
}

export function statusFor(dueDate: IsoDate, paid: boolean, todayIso: IsoDate): BillStatus {
  if (paid) return "paga";
  const days = diffInDays(todayIso, dueDate);
  if (days < 0) return "atrasada";
  if (days <= DUE_SOON_DAYS) return "vence-logo";
  return "prevista";
}

// Uma ocorrência por conta fixa no mês, ordenada pelo vencimento.
// Contas inativas só aparecem se já tiverem pagamento naquele mês.
export function billsForMonth<B extends RecurringBillLike, P extends BillPaymentLike>(
  bills: B[],
  payments: P[],
  month: MonthKey,
  todayIso: IsoDate,
): BillOccurrence<B, P>[] {
  const paidByBill = new Map<string, P>();
  for (const p of payments) {
    if (p.recurring_bill_id && p.reference_month === month) {
      paidByBill.set(p.recurring_bill_id, p);
    }
  }

  return bills
    .filter((bill) => isBillInMonth(bill, month))
    .filter((bill) => bill.active || paidByBill.has(bill.id))
    .map((bill) => {
      const payment = paidByBill.get(bill.id) ?? null;
      const dueDate = dueDateIn(month, bill.due_day);
      return {
        bill,
        month,
        dueDate,
        status: statusFor(dueDate, payment !== null, todayIso),
        payment,
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function summarizeBills<B extends RecurringBillLike & { amount: number }, P extends BillPaymentLike>(
  occurrences: BillOccurrence<B, P>[],
) {
  let paid = 0;
  let pendingAmount = 0;
  for (const o of occurrences) {
    if (o.status === "paga") paid += 1;
    else pendingAmount += o.bill.amount;
  }
  return {
    total: occurrences.length,
    paid,
    pending: occurrences.length - paid,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
  };
}
