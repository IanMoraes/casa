import type { Metadata } from "next";

import { Money } from "@/components/finance/money";
import { MonthSwitcher, PersonFilter } from "@/components/shell/filters";
import { PageHeader } from "@/components/shell/page-header";
import { getBillOccurrences } from "@/lib/data/bills";
import { getAccounts, getCategories, getMonthTransactions } from "@/lib/data/finance";
import { toAccountOptions, toCategoryOptions, toMemberOptions } from "@/lib/data/options";
import { getHousehold, resolvePerson } from "@/lib/data/session";
import { parseMonthParam } from "@/lib/dates";
import { totals } from "@/lib/finance/summary";
import { cn } from "@/lib/utils";

import { MovementsView } from "./movements-view";

export const metadata: Metadata = { title: "Extrato" };

export default async function MovementsPage({ searchParams }: PageProps<"/financas/movimentacoes">) {
  const params = await searchParams;
  const ctx = await getHousehold();
  const person = resolvePerson(ctx, params.pessoa);
  const month = parseMonthParam(params.mes);

  const [allAccounts, categories, bills] = await Promise.all([
    getAccounts(null),
    getCategories(),
    getBillOccurrences(month, person?.user_id ?? null),
  ]);
  const accounts = person ? allAccounts.filter((a) => a.owner_id === person.user_id) : allAccounts;
  const transactions = await getMonthTransactions(
    month,
    accounts.map((a) => a.id),
  );
  const t = totals(transactions);

  return (
    <>
      <PageHeader
        title="Extrato"
        filters={
          <>
            <MonthSwitcher />
            <PersonFilter members={toMemberOptions(ctx.members)} className="-mx-4 px-4 sm:mx-0 sm:px-0" />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entrou" value={t.income} className="bg-income-soft" />
        <Stat label="Saiu" value={t.expense} className="bg-expense-soft" />
        <Stat label="Resultado" value={t.net} sign="always" className="bg-surface shadow-[var(--shadow-card)]" />
        <Stat
          label={`A pagar (${bills.summary.pending} de ${bills.summary.total})`}
          value={bills.summary.pendingAmount}
          className="bg-warning-soft"
        />
      </div>

      <MovementsView
        month={month}
        transactions={transactions}
        bills={bills.occurrences.filter((o) => !o.payment)}
        accounts={toAccountOptions(allAccounts)}
        categories={toCategoryOptions(categories)}
        members={toMemberOptions(ctx.members)}
      />
    </>
  );
}

function Stat({ label, value, sign, className }: { label: string; value: number; sign?: "always"; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-2xl p-3", className)}>
      <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
      <Money value={value} sign={sign} tone={sign ? "flow" : "none"} className="mt-0.5 block text-lg font-bold" />
    </div>
  );
}
