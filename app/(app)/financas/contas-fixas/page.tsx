import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { getBillOccurrences } from "@/lib/data/bills";
import { getAccounts, getCategories, getRecurringBills } from "@/lib/data/finance";
import { toAccountOptions, toCategoryOptions, toMemberOptions } from "@/lib/data/options";
import { getHousehold } from "@/lib/data/session";
import { currentMonth } from "@/lib/dates";

import { BillsView } from "./bills-view";

export const metadata: Metadata = { title: "Contas fixas" };

export default async function BillsPage() {
  const ctx = await getHousehold();
  const month = currentMonth();
  const [bills, accounts, categories, current] = await Promise.all([
    getRecurringBills(null),
    getAccounts(null),
    getCategories(),
    getBillOccurrences(month, null),
  ]);
  const statusById = Object.fromEntries(current.occurrences.map((o) => [o.bill.id, o.status]));

  return (
    <>
      <PageHeader
        title="Contas fixas"
        description="Contas que se repetem todo mês. Elas aparecem nas movimentações de cada mês até serem pagas."
      />
      <BillsView
        bills={bills}
        statusById={statusById}
        accounts={toAccountOptions(accounts)}
        categories={toCategoryOptions(categories)}
        members={toMemberOptions(ctx.members)}
        meId={ctx.userId}
      />
    </>
  );
}
