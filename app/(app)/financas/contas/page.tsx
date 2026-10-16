import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { getAccounts } from "@/lib/data/finance";
import { toAccountOptions, toMemberOptions } from "@/lib/data/options";
import { getHousehold } from "@/lib/data/session";

import { AccountsView } from "./accounts-view";

export const metadata: Metadata = { title: "Contas e cofrinhos" };

export default async function AccountsPage() {
  const ctx = await getHousehold();
  const accounts = await getAccounts(null, true);

  return (
    <>
      <PageHeader title="Contas e cofrinhos" description="Saldo de cada banco, de cada um de vocês." />
      <AccountsView accounts={toAccountOptions(accounts)} members={toMemberOptions(ctx.members)} meId={ctx.userId} />
    </>
  );
}
