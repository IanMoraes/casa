import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Money } from "@/components/finance/money";
import { PrivacyToggle } from "@/components/finance/privacy";
import { MonthSwitcher, PersonFilter } from "@/components/shell/filters";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { ShortcutRow } from "@/components/shell/quick-actions";

type Member = { user_id: string; display_name: string; color: string; avatar_url: string | null };

// Topo do Início: faixa azul com saudação, filtros e o saldo em destaque.
// No celular ocupa a largura toda; no PC vira um cartão.
export function HomeHero({
  me,
  members,
  balance,
  balanceLabel,
  accountsCount,
}: {
  me: Member;
  members: Member[];
  balance: number;
  balanceLabel: string;
  accountsCount: number;
}) {
  return (
    <section aria-label="Saldo" className="relative">
      <div className="-mx-4 rounded-b-[2rem] bg-gradient-to-b from-hero to-hero-strong px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 text-hero-foreground md:mx-0 md:rounded-3xl md:px-6 md:pt-6 md:pb-20">
        <div className="flex items-center gap-3">
          <PersonAvatar
            name={me.display_name}
            color={me.color}
            src={me.avatar_url}
            className="size-10 ring-2 ring-white/40"
          />
          <p className="min-w-0 flex-1 truncate text-lg font-semibold">Olá, {me.display_name}</p>
          <PrivacyToggle />
        </div>

        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <PersonFilter members={members} variant="hero" className="-mx-4 px-4 sm:mx-0 sm:px-0" />
          <MonthSwitcher variant="hero" className="self-start sm:ml-auto" />
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-hero-foreground/90">{balanceLabel}</p>
          <Money value={balance} className="mt-1 block text-[2.5rem] leading-none font-bold tracking-tight" currencyClassName="text-2xl" />
          <Link
            href="/financas/contas"
            className="mt-3 inline-flex items-center gap-0.5 rounded-full text-sm font-semibold text-hero-foreground underline-offset-4 hover:underline"
          >
            {accountsCount === 0 ? "Cadastrar contas" : `Ver ${accountsCount} ${accountsCount === 1 ? "conta" : "contas"}`}
            <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Atalhos sobrepostos à faixa azul. */}
      <div className="card-surface relative -mt-10 px-2 py-3 md:mx-6">
        <ShortcutRow />
      </div>
    </section>
  );
}
