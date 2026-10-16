"use client";

import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { Button } from "@/components/ui/button";
import { unpayBill } from "@/lib/actions/finance";
import { NEUTRAL_COLOR, SPECIAL_ICONS, categoryIcon } from "@/lib/categories";
import { formatDate, formatDay } from "@/lib/dates";
import type { BillStatus } from "@/lib/finance/recurring";
import { cn } from "@/lib/utils";

import { PayBillForm } from "./bill-forms";
import { IconBubble } from "./category-badge";
import { Money } from "./money";
import type { AccountOption, BillRow, CategoryOption } from "./types";

export type BillOccurrenceView = {
  bill: BillRow;
  month: string;
  dueDate: string;
  status: BillStatus;
  payment: { id: string; amount: number; occurred_on: string } | null;
};

const STATUS: Record<BillStatus, { label: string; className: string; icon: typeof ClockIcon | null }> = {
  paga: { label: "Paga", className: "bg-income-soft text-income-foreground", icon: CheckCircle2Icon },
  atrasada: { label: "Atrasada", className: "bg-destructive-soft text-destructive", icon: AlertTriangleIcon },
  "vence-logo": { label: "Vence logo", className: "bg-warning-soft text-warning-foreground", icon: ClockIcon },
  prevista: { label: "A pagar", className: "bg-accent text-accent-foreground", icon: null },
};

// Contas fixas do mês: carrossel no celular, grade no PC.
export function BillWall({
  occurrences,
  accounts,
  categories,
  month,
}: {
  occurrences: BillOccurrenceView[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  month: string;
}) {
  const [selected, setSelected] = useState<BillOccurrenceView | null>(null);
  const [justPaid, setJustPaid] = useState<string | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));

  if (occurrences.length === 0) {
    return (
      <div className="card-surface flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
        <IconBubble icon={SPECIAL_ICONS.fixa} color="#0078C8" />
        <p className="flex-1 text-sm text-muted-foreground">
          Cadastre o aluguel, a luz e a internet para elas aparecerem aqui todo mês, com o botão de pagar.
        </p>
        <Button asChild size="sm">
          <Link href="/financas/contas-fixas">
            <PlusIcon /> Conta fixa
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul
        className="scroll-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] md:overflow-visible md:px-0"
        aria-label="Contas fixas do mês"
      >
        {occurrences.map((o) => (
          <li key={o.bill.id} className="w-[11.5rem] shrink-0 snap-start md:w-auto">
            <BillTile
              occurrence={o}
              category={o.bill.category_id ? byId.get(o.bill.category_id) : undefined}
              justPaid={justPaid === o.bill.id}
              onSelect={() => setSelected(o)}
            />
          </li>
        ))}
      </ul>

      <ResponsiveDialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.bill.description ?? ""}
        description={
          selected
            ? `${selected.bill.kind === "saida" ? "Vence" : "Previsto para"} ${formatDate(selected.dueDate)} · ${STATUS[selected.status].label}`
            : undefined
        }
      >
        {selected ? (
          selected.payment ? (
            <PaidDetails occurrence={selected} onDone={() => setSelected(null)} />
          ) : (
            <PayBillForm
              bill={selected.bill}
              month={month}
              accounts={accounts}
              onDone={() => {
                setJustPaid(selected.bill.id);
                setSelected(null);
              }}
            />
          )
        ) : null}
      </ResponsiveDialog>
    </>
  );
}

export function BillTile({
  occurrence,
  category,
  justPaid,
  onSelect,
}: {
  occurrence: BillOccurrenceView;
  category?: CategoryOption;
  justPaid?: boolean;
  onSelect?: () => void;
}) {
  const { bill, status, dueDate, payment } = occurrence;
  const paid = status === "paga";
  const s = STATUS[status];
  const Icon = category ? categoryIcon(category.icon) : SPECIAL_ICONS.fixa;
  const color = category?.color ?? (category ? NEUTRAL_COLOR : "#0078C8");
  const when = paid
    ? `${bill.kind === "saida" ? "Paga" : "Recebida"} em ${formatDay(payment!.occurred_on)}`
    : status === "atrasada"
      ? `Venceu em ${formatDay(dueDate)}`
      : `Vence em ${formatDay(dueDate)}`;

  return (
    <div
      data-bill-status={status}
      data-just-paid={justPaid ? "true" : undefined}
      className={cn(
        "card-surface flex h-full flex-col gap-3 p-3.5",
        status === "atrasada" && "ring-1 ring-destructive/40",
        status === "vence-logo" && "ring-1 ring-warning/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <IconBubble icon={Icon} color={color} />
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.className)}>
          {s.icon ? <s.icon className="size-3.5" aria-hidden /> : null}
          {s.label}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{bill.description}</p>
        <p className="text-xs text-muted-foreground">{when}</p>
      </div>
      <Money
        value={payment ? Math.abs(payment.amount) : bill.amount}
        sign="none"
        className="text-lg font-bold"
      />
      {onSelect ? (
        <Button
          size="sm"
          variant={paid ? "outline" : "default"}
          onClick={onSelect}
          className="mt-auto w-full"
          aria-label={paid ? `Ver pagamento de ${bill.description}` : `Pagar ${bill.description}`}
        >
          {paid ? "Ver pagamento" : bill.kind === "saida" ? "Pagar" : "Recebi"}
        </Button>
      ) : null}
    </div>
  );
}

function PaidDetails({ occurrence, onDone }: { occurrence: BillOccurrenceView; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const payment = occurrence.payment!;

  return (
    <div className="flex flex-col gap-4 pb-2">
      <p className="text-sm">
        {occurrence.bill.kind === "saida" ? "Pago" : "Recebido"} em {formatDate(payment.occurred_on)}:{" "}
        <Money value={Math.abs(payment.amount)} className="font-medium" />
      </p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await unpayBill(payment.id);
            if (result?.ok) toast.success(result.message);
            else if (result) toast.error(result.error);
            onDone();
          })
        }
      >
        Desfazer pagamento
      </Button>
    </div>
  );
}
