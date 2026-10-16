import type { AccountKind, CategoryKind, TransactionKind } from "@/lib/database.types";

// Formas enxutas que as telas passam para os componentes do cliente.

export type MemberOption = { user_id: string; display_name: string; color: string; avatar_url: string | null };

export type AccountOption = {
  id: string;
  name: string;
  bank: string | null;
  kind: AccountKind;
  owner_id: string;
  balance: number;
  initial_balance: number;
  goal_amount: number | null;
  color: string | null;
  archived: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
  kind: CategoryKind;
  keywords: string[];
  icon: string;
  color: string | null;
};

export type TransactionRow = {
  id: string;
  account_id: string;
  kind: TransactionKind;
  amount: number;
  occurred_on: string;
  description: string;
  category_id: string | null;
  recurring_bill_id: string | null;
  transfer_group: string | null;
  import_batch_id: string | null;
};

export type BillRow = {
  id: string;
  description: string;
  kind: CategoryKind;
  amount: number;
  due_day: number;
  owner_id: string;
  account_id: string | null;
  category_id: string | null;
  start_month: string;
  end_month: string | null;
  active: boolean;
};

export const ACCOUNT_KINDS: { value: AccountKind; label: string }[] = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "cofrinho", label: "Cofrinho" },
  { value: "investimento", label: "Investimento" },
  { value: "carteira", label: "Dinheiro vivo" },
];

export function accountKindLabel(kind: AccountKind) {
  return ACCOUNT_KINDS.find((k) => k.value === kind)?.label ?? kind;
}
