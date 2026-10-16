"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useTransition } from "react";

import { PersonAvatar } from "@/components/shell/person-avatar";
import { addMonths, monthLabel, parseMonthParam, toMonthParam } from "@/lib/dates";
import { cn } from "@/lib/utils";

type MemberOption = { user_id: string; display_name: string; color: string; avatar_url?: string | null };
type Variant = "default" | "hero";

// Casa | pessoa, em pílulas roláveis. Fica na URL (?pessoa=) e recarrega os dados.
export function PersonFilter({
  members,
  variant = "default",
  className,
}: {
  members: MemberOption[];
  variant?: Variant;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [person, setPerson] = useQueryState("pessoa", parseAsString.withOptions({ shallow: false, startTransition }));
  const current = person ?? "casa";
  const options = [{ value: "casa", label: "Casa", member: null as MemberOption | null }].concat(
    members.map((m) => ({ value: m.user_id, label: m.display_name, member: m })),
  );

  return (
    <div
      role="radiogroup"
      aria-label="Ver dados de"
      className={cn("scroll-row flex min-w-0 gap-2 overflow-x-auto", pending && "opacity-70", className)}
    >
      {options.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPerson(o.value === "casa" ? null : o.value)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-3",
              variant === "hero"
                ? active
                  ? "bg-white text-hero focus-visible:ring-white/60"
                  : "bg-white/15 text-hero-foreground hover:bg-white/25 focus-visible:ring-white/60"
                : active
                  ? "bg-primary text-primary-foreground focus-visible:ring-ring/50"
                  : "bg-surface text-foreground shadow-[var(--shadow-card)] hover:bg-accent focus-visible:ring-ring/50",
            )}
          >
            {o.member ? (
              <PersonAvatar name={o.member.display_name} color={o.member.color} src={o.member.avatar_url} className="-ml-1.5 size-6" />
            ) : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Mês anterior / próximo. Fica na URL (?mes=2026-10).
export function MonthSwitcher({ variant = "default", className }: { variant?: Variant; className?: string }) {
  const [pending, startTransition] = useTransition();
  const [mes, setMes] = useQueryState("mes", parseAsString.withOptions({ shallow: false, startTransition }));
  const month = parseMonthParam(mes ?? undefined);
  const go = (delta: number) => setMes(toMonthParam(addMonths(month, delta)));
  const button = cn(
    "grid size-9 place-items-center rounded-full outline-none focus-visible:ring-3",
    variant === "hero" ? "hover:bg-white/15 focus-visible:ring-white/60" : "hover:bg-accent focus-visible:ring-ring/50",
  );

  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center rounded-full",
        variant === "hero" ? "bg-white/15 text-hero-foreground" : "bg-surface shadow-[var(--shadow-card)]",
        pending && "opacity-70",
        className,
      )}
    >
      <button type="button" className={button} onClick={() => go(-1)} aria-label="Mês anterior">
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="min-w-[8.5rem] text-center text-sm font-semibold" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button type="button" className={button} onClick={() => go(1)} aria-label="Próximo mês">
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
