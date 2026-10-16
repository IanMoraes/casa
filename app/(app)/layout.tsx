import { cookies } from "next/headers";

import { PrivacyProvider } from "@/components/finance/privacy";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { QuickActionsProvider } from "@/components/shell/quick-actions";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAccounts, getCategories } from "@/lib/data/finance";
import { toAccountOptions, toCategoryOptions, toMemberOptions } from "@/lib/data/options";
import { getHousehold, getUserProfile } from "@/lib/data/session";
import { getLanes } from "@/lib/data/tasks";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [ctx, profile, cookieStore, accounts, categories, lanes] = await Promise.all([
    getHousehold(),
    getUserProfile(),
    cookies(),
    getAccounts(null),
    getCategories(),
    getLanes(),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const me = { ...ctx.me, avatar_url: ctx.me.avatar_url ?? profile.avatarUrl };

  return (
    <PrivacyProvider>
      <QuickActionsProvider
        data={{
          accounts: toAccountOptions(accounts),
          categories: toCategoryOptions(categories),
          members: toMemberOptions(ctx.members),
          lanes,
          meId: ctx.userId,
        }}
      >
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar householdName={ctx.household.name} me={me} email={profile.email} />
          <SidebarInset className="min-w-0">
            {/* Espaço embaixo para a barra inferior do celular. */}
            <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pb-28 md:px-8 md:pt-6 md:pb-12">{children}</div>
          </SidebarInset>
        </SidebarProvider>
        <BottomNav me={me} email={profile.email} householdName={ctx.household.name} />
      </QuickActionsProvider>
    </PrivacyProvider>
  );
}
