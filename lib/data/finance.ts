import "server-only";

import { cache } from "react";

import { addMonths, endOfMonth, type IsoDate, type MonthKey } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Account = Tables<"accounts"> & { balance: number };
export type Category = Tables<"categories">;
export type Transaction = Tables<"transactions">;
export type RecurringBill = Tables<"recurring_bills">;

function fail(what: string, error: { message: string }): never {
  throw new Error(`Não foi possível carregar ${what}: ${error.message}`);
}

// Contas com saldo. `ownerId` filtra por pessoa.
export const getAccounts = cache(async (ownerId: string | null = null, includeArchived = false) => {
  const supabase = await createClient();
  let query = supabase.from("accounts").select("*").order("created_at");
  if (ownerId) query = query.eq("owner_id", ownerId);
  if (!includeArchived) query = query.eq("archived", false);

  const [{ data: accounts, error }, { data: balances, error: balanceError }] = await Promise.all([
    query,
    supabase.from("account_balances").select("account_id, balance"),
  ]);
  if (error) fail("as contas", error);
  if (balanceError) fail("os saldos", balanceError);

  const byId = new Map(balances.map((b) => [b.account_id, Number(b.balance)]));
  return accounts.map((a): Account => ({
    ...a,
    initial_balance: Number(a.initial_balance),
    goal_amount: a.goal_amount === null ? null : Number(a.goal_amount),
    balance: byId.get(a.id) ?? Number(a.initial_balance),
  }));
});

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("kind").order("name");
  if (error) fail("as categorias", error);
  return data;
});

export const getRecurringBills = cache(async (ownerId: string | null = null) => {
  const supabase = await createClient();
  let query = supabase.from("recurring_bills").select("*").order("due_day");
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data, error } = await query;
  if (error) fail("as contas fixas", error);
  return data.map((b) => ({ ...b, amount: Number(b.amount) }));
});

// Lançamentos entre duas datas (inclusive), opcionalmente só de algumas contas.
export async function getTransactions({
  from,
  to,
  accountIds,
}: {
  from?: IsoDate;
  to?: IsoDate;
  accountIds?: string[];
}) {
  if (accountIds && accountIds.length === 0) return [];
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (from) query = query.gte("occurred_on", from);
  if (to) query = query.lte("occurred_on", to);
  if (accountIds) query = query.in("account_id", accountIds);

  // O plano gratuito devolve no máximo 1000 linhas por vez: busca em páginas.
  const all: Transaction[] = [];
  const page = 1000;
  for (let start = 0; ; start += page) {
    const { data, error } = await query.range(start, start + page - 1);
    if (error) fail("as movimentações", error);
    all.push(...data.map((t) => ({ ...t, amount: Number(t.amount) })));
    if (data.length < page) break;
  }
  return all;
}

export function getMonthTransactions(month: MonthKey, accountIds?: string[]) {
  return getTransactions({ from: month, to: endOfMonth(month), accountIds });
}

// Pagamentos de contas fixas de um mês (pelo mês de referência, não pela data).
export async function getBillPayments(month: MonthKey, billIds: string[]) {
  if (billIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("reference_month", month)
    .in("recurring_bill_id", billIds);
  if (error) fail("os pagamentos", error);
  return data.map((t) => ({ ...t, amount: Number(t.amount) }));
}

export async function getImportBatches() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) fail("as importações", error);
  return data;
}

export function lastMonths(month: MonthKey, count: number) {
  return Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));
}
