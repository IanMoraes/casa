import "server-only";

import type { BillOccurrenceView } from "@/components/finance/bill-wall";
import { today, type MonthKey } from "@/lib/dates";
import { billsForMonth, summarizeBills } from "@/lib/finance/recurring";

import { getBillPayments, getRecurringBills } from "./finance";

// Contas fixas projetadas no mês, já com o pagamento de cada uma (se houver).
export async function getBillOccurrences(month: MonthKey, ownerId: string | null) {
  const bills = await getRecurringBills(ownerId);
  const payments = await getBillPayments(
    month,
    bills.map((b) => b.id),
  );
  const occurrences = billsForMonth(bills, payments, month, today());
  const view: BillOccurrenceView[] = occurrences.map((o) => ({
    bill: o.bill,
    month: o.month,
    dueDate: o.dueDate,
    status: o.status,
    payment: o.payment ? { id: o.payment.id, amount: o.payment.amount, occurred_on: o.payment.occurred_on } : null,
  }));
  return { occurrences: view, summary: summarizeBills(occurrences) };
}
