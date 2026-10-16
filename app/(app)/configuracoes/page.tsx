import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { toMemberOptions } from "@/lib/data/options";
import { getHousehold } from "@/lib/data/session";

import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const ctx = await getHousehold();
  return (
    <>
      <PageHeader title="Configurações" />
      <SettingsView
        householdName={ctx.household.name}
        inviteCode={ctx.household.invite_code}
        members={toMemberOptions(ctx.members)}
        meId={ctx.userId}
        ownerId={ctx.household.owner_id}
      />
    </>
  );
}
