import { ArrowDownLeftIcon, ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { IconBubble } from "@/components/finance/category-badge";
import { Money } from "@/components/finance/money";
import { cn } from "@/lib/utils";

// Cartão branco com título e, opcionalmente, um link "Ver tudo".
export function HomeCard({
  title,
  href,
  hrefLabel = "Ver tudo",
  aside,
  className,
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("card-surface min-w-0 p-4 md:p-5", className)}>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h2>
        {aside}
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {hrefLabel}
            <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// Entrou × saiu no mês (blocos coloridos) e quanto da entrada já foi gasto.
export function MoneyMovement({ income, expense }: { income: number; expense: number }) {
  const net = income - expense;
  const ratio = income > 0 ? expense / income : expense > 0 ? 1.5 : 0;
  const pct = Math.round(ratio * 100);
  const ringColor = ratio < 0.7 ? "var(--income)" : ratio < 1 ? "var(--warning)" : "var(--destructive)";
  const message =
    income === 0 && expense === 0
      ? "Nada registrado neste mês ainda."
      : income === 0
        ? "Saiu dinheiro, mas nenhuma entrada foi registrada."
        : ratio < 1
          ? `Vocês gastaram ${pct}% do que entrou.`
          : `Os gastos passaram ${pct - 100}% do que entrou.`;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-income-soft p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-income-foreground">
            <ArrowDownLeftIcon className="size-4" aria-hidden /> Entrou
          </div>
          <Money value={income} className="mt-1 block text-lg font-bold" />
        </div>
        <div className="rounded-2xl bg-expense-soft p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
            <ArrowUpRightIcon className="size-4" aria-hidden /> Saiu
          </div>
          <Money value={expense} className="mt-1 block text-lg font-bold" />
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border p-3">
        <Ring value={Math.min(ratio, 1)} color={ringColor} label={`${pct}%`} />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Resultado do mês</p>
          <Money value={net} sign="always" tone="flow" className="text-lg font-bold" />
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

function Ring({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="size-16 shrink-0 -rotate-90" role="img" aria-label={`${label} da entrada já gasto`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
      />
      <text
        x="28"
        y="28"
        transform="rotate(90 28 28)"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-[0.7rem] font-bold"
      >
        {label}
      </text>
    </svg>
  );
}

// Gastos por categoria, cada uma com sua cor e ícone (cor = identidade, com rótulo).
export function CategoryBreakdown({
  items,
}: {
  items: { key: string; label: string; value: number; color: string; icon: ReactNode }[];
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhum gasto registrado neste mês.</p>;
  const total = items.reduce((a, i) => a + i.value, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra empilhada com o peso de cada categoria. */}
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {items.map((i) => (
          <span key={i.key} style={{ width: `${(i.value / total) * 100}%`, backgroundColor: i.color }} />
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3">
            {i.icon}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.label}</span>
                <Money value={i.value} className="text-sm font-semibold" />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${(i.value / total) * 100}%`, backgroundColor: i.color }} />
                </div>
                <span className="w-9 text-right text-xs text-muted-foreground tabular">
                  {Math.round((i.value / total) * 100)}%
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { IconBubble };
