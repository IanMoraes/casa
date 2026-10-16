import "server-only";

import type { AccountOption, CategoryOption, MemberOption } from "@/components/finance/types";

import type { Account, Category } from "./finance";
import type { Member } from "./session";

// Formas enxutas para mandar ao cliente (sem campos internos).

export function toMemberOptions(members: Member[]): MemberOption[] {
  return members.map((m) => ({
    user_id: m.user_id,
    display_name: m.display_name,
    color: m.color,
    avatar_url: m.avatar_url,
  }));
}

export function toAccountOptions(accounts: Account[]): AccountOption[] {
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    bank: a.bank,
    kind: a.kind,
    owner_id: a.owner_id,
    balance: a.balance,
    initial_balance: a.initial_balance,
    goal_amount: a.goal_amount,
    color: a.color,
    archived: a.archived,
  }));
}

export function toCategoryOptions(categories: Category[]): CategoryOption[] {
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    keywords: c.keywords,
    icon: c.icon,
    color: c.color,
  }));
}
