import type { ReactNode } from "react";

import { NEUTRAL_COLOR, SPECIAL_ICONS, categoryIcon } from "@/lib/categories";
import { cn } from "@/lib/utils";

import { IconBubble } from "./category-badge";
import { Money } from "./money";
import type { CategoryOption, TransactionRow } from "./types";

// Ícone e cor de um lançamento: pela categoria, ou pelo tipo quando não tem.
export function transactionVisual(tx: Pick<TransactionRow, "kind" | "category_id" | "recurring_bill_id">, categories: Map<string, CategoryOption>) {
  if (tx.kind === "transferencia") return { icon: SPECIAL_ICONS.transferencia, color: "#0078C8" };
  if (tx.kind === "ajuste") return { icon: SPECIAL_ICONS.ajuste, color: NEUTRAL_COLOR };
  const category = tx.category_id ? categories.get(tx.category_id) : undefined;
  if (category) return { icon: categoryIcon(category.icon), color: category.color ?? NEUTRAL_COLOR };
  if (tx.recurring_bill_id) return { icon: SPECIAL_ICONS.fixa, color: "#0078C8" };
  return { icon: categoryIcon("circle"), color: NEUTRAL_COLOR };
}

// Linha de lançamento no estilo de extrato de banco.
export function ActivityItem({
  tx,
  title,
  subtitle,
  categories,
  trailing,
  className,
}: {
  tx: TransactionRow;
  title?: string;
  subtitle: ReactNode;
  categories: Map<string, CategoryOption>;
  trailing?: ReactNode;
  className?: string;
}) {
  const { icon, color } = transactionVisual(tx, categories);
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <IconBubble icon={icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title ?? tx.description}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Money value={tx.amount} sign="always" tone="flow" className="shrink-0 font-semibold" />
      {trailing}
    </div>
  );
}
