"use client";

import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

import { usePrivacy } from "./privacy";

// Valor em reais com o "R$" mais leve que o número e algarismos tabulares.
// `sign`: "auto" mostra "−" só no negativo; "always" mostra "+" também.
// `tone`: "flow" pinta entradas de verde (como no app do banco).
// Com "esconder valores" ligado, mostra "R$ ••••".
export function Money({
  value,
  sign = "auto",
  tone = "none",
  className,
  currencyClassName,
}: {
  value: number;
  sign?: "auto" | "always" | "none";
  tone?: "none" | "flow";
  className?: string;
  currencyClassName?: string;
}) {
  const { hidden } = usePrivacy();
  const prefix = sign === "none" ? "" : value < 0 ? "−" : sign === "always" && value > 0 ? "+" : "";
  return (
    <span
      className={cn("tabular whitespace-nowrap", tone === "flow" && value > 0 && "text-income-foreground", className)}
    >
      {hidden ? null : prefix}
      <span className={cn("mr-0.5 font-normal opacity-70", currencyClassName)}>R$</span>
      {hidden ? <span aria-label="valor escondido">••••</span> : formatAmount(value)}
    </span>
  );
}
