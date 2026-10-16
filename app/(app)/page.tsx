import { CalendarIcon, ListChecksIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityItem } from "@/components/finance/activity-item";
import { BillWall } from "@/components/finance/bill-wall";
import { IconBubble } from "@/components/finance/category-badge";
import { Money } from "@/components/finance/money";
import { CategoryBreakdown, HomeCard, MoneyMovement } from "@/components/home/cards";
import { HomeHero } from "@/components/home/hero";
import { BalanceCard, OverviewCard } from "@/components/home/overview";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Progress } from "@/components/ui/progress";
import { NEUTRAL_COLOR, categoryIcon } from "@/lib/categories";
import { getBillOccurrences } from "@/lib/data/bills";
import { getAccounts, getCategories, getTransactions, lastMonths } from "@/lib/data/finance";
import { toAccountOptions, toCategoryOptions, toMemberOptions } from "@/lib/data/options";
import { getHousehold, resolvePerson } from "@/lib/data/session";
import { getUpcomingTasks } from "@/lib/data/tasks";
import { formatDay, monthLabel, monthOf, parseMonthParam, shortMonthLabel, today } from "@/lib/dates";
import { balanceHistory, expensesByCategory, isIncomeOrExpense, totals, totalsByMonth } from "@/lib/finance/summary";
import { round2, sum } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Início" };

const TOP_CATEGORIES = 6;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ctx = await getHousehold();
  const person = resolvePerson(ctx, params.pessoa);
  const month = parseMonthParam(params.mes);
  const months = lastMonths(month, 12);

  const [allAccounts, categories, bills, tasks] = await Promise.all([
    getAccounts(null),
    getCategories(),
    getBillOccurrences(month, person?.user_id ?? null),
    getUpcomingTasks(person?.user_id ?? null, 4),
  ]);
  const accounts = person ? allAccounts.filter((a) => a.owner_id === person.user_id) : allAccounts;
  const transactions = await getTransactions({ from: months[0], accountIds: accounts.map((a) => a.id) });

  const categoryOptions = toCategoryOptions(categories);
  const categoryById = new Map(categoryOptions.map((c) => [c.id, c]));
  const accountName = new Map(allAccounts.map((a) => [a.id, a.name]));

  const monthTx = transactions.filter((t) => monthOf(t.occurred_on) === month);
  const monthTotals = totals(monthTx);
  const currentTotal = sum(accounts.map((a) => a.balance));
  const windowStart = round2(currentTotal - sum(transactions.map((t) => t.amount)));
  const history = balanceHistory(windowStart, transactions, months);

  // Gastos por categoria: as maiores e o resto em "Outras".
  const expenses = expensesByCategory(monthTx);
  const top = expenses.slice(0, TOP_CATEGORIES);
  const rest = sum(expenses.slice(TOP_CATEGORIES).map((e) => e.amount));
  const breakdown = [
    ...top.map((e) => {
      const c = e.categoryId ? categoryById.get(e.categoryId) : undefined;
      const color = c?.color ?? NEUTRAL_COLOR;
      return {
        key: e.categoryId ?? "none",
        label: c?.name ?? "Sem categoria",
        value: e.amount,
        color,
        icon: <IconBubble icon={categoryIcon(c?.icon)} color={color} size="sm" />,
      };
    }),
    ...(rest > 0
      ? [{ key: "outras", label: "Outras", value: rest, color: NEUTRAL_COLOR, icon: <IconBubble icon={categoryIcon("circle")} color={NEUTRAL_COLOR} size="sm" /> }]
      : []),
  ];

  const ownerOf = new Map(allAccounts.map((a) => [a.id, a.owner_id]));
  const byPerson = ctx.members.map((m) => ({
    member: m,
    balance: sum(allAccounts.filter((a) => a.owner_id === m.user_id).map((a) => a.balance)),
    spent: sum(
      monthTx
        .filter((t) => isIncomeOrExpense(t) && t.amount < 0 && ownerOf.get(t.account_id) === m.user_id)
        .map((t) => -t.amount),
    ),
  }));

  const recent = monthTx.slice(0, 6);
  const { summary } = bills;
  const monthName = monthLabel(month, false).toLowerCase();

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <HomeHero
        me={ctx.me}
        members={toMemberOptions(ctx.members)}
        balance={currentTotal}
        balanceLabel={person ? `Saldo de ${person.display_name}` : "Saldo da casa"}
        accountsCount={accounts.length}
      />

      <section aria-labelledby="bills-title" className="min-w-0">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="bills-title" className="text-lg font-bold">
              Contas de {monthName}
            </h2>
            {summary.total > 0 ? (
              <p className="text-sm text-muted-foreground">
                {summary.pending === 0 ? (
                  `Todas as ${summary.total} pagas.`
                ) : (
                  <>
                    {summary.paid} de {summary.total} pagas · faltam <Money value={summary.pendingAmount} className="font-semibold text-foreground" />
                  </>
                )}
              </p>
            ) : null}
          </div>
          <Link href="/financas/contas-fixas" className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Gerenciar
          </Link>
        </div>
        {summary.total > 0 ? (
          <Progress
            value={(summary.paid / summary.total) * 100}
            className="mb-3 h-2 [&>[data-slot=progress-indicator]]:bg-income"
            aria-label={`${summary.paid} de ${summary.total} contas pagas`}
          />
        ) : null}
        <BillWall
          occurrences={bills.occurrences}
          accounts={toAccountOptions(allAccounts)}
          categories={categoryOptions}
          month={month}
        />
      </section>

      <div className="grid min-w-0 gap-5 md:gap-6 lg:grid-cols-3">
        <HomeCard title={`Movimento de ${monthName}`} className="lg:col-span-1">
          <MoneyMovement income={monthTotals.income} expense={monthTotals.expense} />
        </HomeCard>

        <div className="min-w-0 lg:col-span-2">
          <OverviewCard
            flow={totalsByMonth(transactions, months).map((m) => ({
              label: shortMonthLabel(m.month),
              income: m.income,
              expense: m.expense,
            }))}
          />
        </div>

        <HomeCard title="Para onde foi o dinheiro" href="/financas/movimentacoes" hrefLabel="Extrato">
          <CategoryBreakdown items={breakdown} />
        </HomeCard>

        <HomeCard title="Atividade recente" href="/financas/movimentacoes" className="lg:col-span-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação em {monthName}.</p>
          ) : (
            <ul className="-my-2 divide-y">
              {recent.map((tx) => (
                <li key={tx.id} className="py-2.5">
                  <ActivityItem
                    tx={tx}
                    categories={categoryById}
                    subtitle={`${formatDay(tx.occurred_on)} · ${accountName.get(tx.account_id) ?? ""}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </HomeCard>

        <div className="min-w-0 lg:col-span-2">
          <BalanceCard history={history.map((h) => ({ label: shortMonthLabel(h.month), balance: h.balance }))} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
          {!person && ctx.members.length > 1 ? (
            <HomeCard title="Cada um">
              <ul className="flex flex-col gap-3">
                {byPerson.map(({ member, balance, spent }) => (
                  <li key={member.user_id} className="flex items-center gap-3">
                    <PersonAvatar name={member.display_name} color={member.color} src={member.avatar_url} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{member.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Gastou <Money value={spent} /> em {monthName}
                      </p>
                    </div>
                    <Money value={balance} className="font-semibold" />
                  </li>
                ))}
              </ul>
            </HomeCard>
          ) : null}

          <HomeCard title="Próximas tarefas" href="/tarefas" hrefLabel="Quadro">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa aberta.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {tasks.map((t) => {
                  const late = t.due_on !== null && t.due_on < today();
                  return (
                    <li key={t.id} className="flex items-center gap-3">
                      <IconBubble icon={ListChecksIcon} color="#F76707" size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                      {t.due_on ? (
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular",
                            late ? "bg-destructive-soft text-destructive" : "bg-muted text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="size-3.5" aria-hidden />
                          {formatDay(t.due_on)}
                          {late ? <span className="sr-only"> (atrasada)</span> : null}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </HomeCard>
        </div>
      </div>
    </div>
  );
}
