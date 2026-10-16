"use client";

import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { BillForm } from "@/components/finance/bill-forms";
import { IconBubble } from "@/components/finance/category-badge";
import { Money } from "@/components/finance/money";
import type { AccountOption, BillRow, CategoryOption, MemberOption } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { deleteBill } from "@/lib/actions/finance";
import { SPECIAL_ICONS, categoryIcon } from "@/lib/categories";
import { monthLabel } from "@/lib/dates";
import type { BillStatus } from "@/lib/finance/recurring";
import { sum } from "@/lib/money";
import { cn } from "@/lib/utils";

type DialogState = { type: "new" } | { type: "edit"; bill: BillRow } | { type: "delete"; bill: BillRow } | null;

const STATUS: Record<BillStatus, string> = {
  paga: "Paga este mês",
  atrasada: "Atrasada",
  "vence-logo": "Vence logo",
  prevista: "A pagar",
};

export function BillsView({
  bills,
  statusById,
  accounts,
  categories,
  members,
  meId,
}: {
  bills: BillRow[];
  statusById: Record<string, BillStatus>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
  meId: string;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const active = bills.filter((b) => b.active);
  const inactive = bills.filter((b) => !b.active);
  const monthlyOut = sum(active.filter((b) => b.kind === "saida").map((b) => b.amount));
  const monthlyIn = sum(active.filter((b) => b.kind === "entrada").map((b) => b.amount));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <dl className="flex gap-8">
          <div>
            <dt className="text-sm text-muted-foreground">A pagar por mês</dt>
            <dd className="text-lg font-semibold">
              <Money value={monthlyOut} />
            </dd>
          </div>
          {monthlyIn > 0 ? (
            <div>
              <dt className="text-sm text-muted-foreground">A receber por mês</dt>
              <dd className="text-lg font-semibold">
                <Money value={monthlyIn} />
              </dd>
            </div>
          ) : null}
        </dl>
        <Button onClick={() => setDialog({ type: "new" })}>
          <PlusIcon /> Nova conta fixa
        </Button>
      </div>

      {bills.length === 0 ? (
        <Empty className="card-surface">
          <EmptyHeader>
            <EmptyTitle>Nenhuma conta fixa ainda</EmptyTitle>
            <EmptyDescription>
              Adicione o aluguel, a luz ou a internet para vê-las todo mês, com o botão de marcar como pago.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialog({ type: "new" })}>
              <PlusIcon /> Nova conta fixa
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="card-surface divide-y overflow-hidden">
          {[...active, ...inactive].map((bill) => {
            const owner = members.find((m) => m.user_id === bill.owner_id);
            const status = statusById[bill.id];
            const account = accounts.find((a) => a.id === bill.account_id);
            return (
              <li key={bill.id} className={cn("flex items-center gap-3 px-3 py-3", !bill.active && "opacity-60")}>
                <IconBubble
                  icon={bill.category_id && categoryById.get(bill.category_id) ? categoryIcon(categoryById.get(bill.category_id)!.icon) : SPECIAL_ICONS.fixa}
                  color={(bill.category_id && categoryById.get(bill.category_id)?.color) || "#0078C8"}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium">
                    {bill.description}
                    {!bill.active ? <Badge variant="secondary">Inativa</Badge> : null}
                    {bill.active && status ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "hidden sm:inline-flex",
                          status === "atrasada" && "border-destructive text-destructive",
                          status === "vence-logo" && "border-warning text-warning-foreground",
                        )}
                      >
                        {STATUS[status]}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[
                      `Todo dia ${bill.due_day}`,
                      account?.name,
                      bill.end_month ? `até ${monthLabel(bill.end_month).toLowerCase()}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {owner ? <PersonAvatar name={owner.display_name} color={owner.color} src={owner.avatar_url} className="hidden sm:flex" /> : null}
                <Money value={bill.kind === "saida" ? -bill.amount : bill.amount} sign="always" className="font-medium" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Ações de ${bill.description}`}>
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog({ type: "edit", bill })}>Editar</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ type: "delete", bill })}>
                      Apagar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <ResponsiveDialog
        open={dialog?.type === "new" || dialog?.type === "edit"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "edit" ? "Editar conta fixa" : "Nova conta fixa"}
      >
        {dialog?.type === "new" || dialog?.type === "edit" ? (
          <BillForm
            bill={dialog.type === "edit" ? dialog.bill : undefined}
            accounts={accounts}
            categories={categories}
            members={members}
            defaultOwnerId={meId}
            onDone={close}
          />
        ) : null}
      </ResponsiveDialog>

      <ConfirmDialog
        open={dialog?.type === "delete"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "delete" ? `Apagar ${dialog.bill.description}?` : ""}
        description="Ela some dos próximos meses. Os pagamentos já feitos continuam nas movimentações. Para só pausar, edite e desative."
        confirmLabel="Apagar conta fixa"
        action={() => (dialog?.type === "delete" ? deleteBill(dialog.bill.id) : Promise.resolve(null))}
      />
    </>
  );
}
