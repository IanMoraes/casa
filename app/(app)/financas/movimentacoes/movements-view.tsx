"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVerticalIcon, PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ActivityItem } from "@/components/finance/activity-item";
import { PayBillForm } from "@/components/finance/bill-forms";
import type { BillOccurrenceView } from "@/components/finance/bill-wall";
import { IconBubble } from "@/components/finance/category-badge";
import { Money } from "@/components/finance/money";
import { ResetStatementDialog } from "@/components/finance/reset-statement";
import { TransactionForm } from "@/components/finance/transaction-form";
import type { AccountOption, CategoryOption, MemberOption, TransactionRow } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { useQuickActions } from "@/components/shell/quick-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { deleteTransaction } from "@/lib/actions/finance";
import { SPECIAL_ICONS, categoryIcon } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Entry =
  | { type: "tx"; date: string; tx: TransactionRow }
  | { type: "bill"; date: string; occurrence: BillOccurrenceView };

type Filter = "tudo" | "entradas" | "saidas" | "fixas";

type DialogState =
  | { type: "edit"; tx: TransactionRow }
  | { type: "delete"; tx: TransactionRow }
  | { type: "pay"; occurrence: BillOccurrenceView }
  | null;

const KIND_LABEL = { transferencia: "Transferência", ajuste: "Ajuste de saldo" } as const;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "tudo", label: "Tudo" },
  { value: "entradas", label: "Entradas" },
  { value: "saidas", label: "Saídas" },
  { value: "fixas", label: "A pagar" },
];

export function MovementsView({
  month,
  transactions,
  bills,
  accounts,
  categories,
  members,
}: {
  month: string;
  transactions: TransactionRow[];
  bills: BillOccurrenceView[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
}) {
  const quick = useQuickActions();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("tudo");
  const [resetOpen, setResetOpen] = useState(false);
  const close = () => setDialog(null);

  const accountName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries: Entry[] = [
      ...(filter === "fixas"
        ? []
        : transactions
            .filter((tx) => filter === "tudo" || (filter === "entradas" ? tx.amount > 0 : tx.amount < 0))
            .map((tx) => ({ type: "tx" as const, date: tx.occurred_on, tx }))),
      ...(filter === "tudo" || filter === "fixas"
        ? bills.map((occurrence) => ({ type: "bill" as const, date: occurrence.dueDate, occurrence }))
        : []),
    ].filter((e) => {
      if (!q) return true;
      const text = e.type === "tx" ? e.tx.description : e.occurrence.bill.description;
      return text.toLowerCase().includes(q);
    });
    entries.sort((a, b) => b.date.localeCompare(a.date));
    const byDate = new Map<string, Entry[]>();
    for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    return [...byDate.entries()];
  }, [transactions, bills, query, filter]);

  function subtitle(tx: TransactionRow) {
    const what =
      tx.kind === "transferencia" || tx.kind === "ajuste"
        ? KIND_LABEL[tx.kind]
        : tx.category_id
          ? (categoryById.get(tx.category_id)?.name ?? "Sem categoria")
          : "Sem categoria";
    return [what, accountName.get(tx.account_id)].filter(Boolean).join(" · ");
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <InputGroup className="h-11 flex-1 rounded-full bg-surface shadow-[var(--shadow-card)] md:h-10">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar no extrato"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar no extrato"
            />
          </InputGroup>
          <Button onClick={() => quick.open("saida")} className="hidden h-10 rounded-full md:inline-flex">
            <PlusIcon /> Adicionar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-11 shrink-0 rounded-full bg-surface md:size-10" aria-label="Mais opções do extrato">
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setResetOpen(true)}>
                <RotateCcwIcon /> Resetar extrato…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div role="radiogroup" aria-label="Mostrar" className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                filter === f.value ? "bg-primary text-primary-foreground" : "bg-surface shadow-[var(--shadow-card)] hover:bg-accent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyCard
          title="Cadastre uma conta primeiro"
          text="As movimentações saem e entram de uma conta. Vá em Contas e cofrinhos e cadastre a primeira."
        />
      ) : groups.length === 0 ? (
        <EmptyCard
          title={query ? "Nada encontrado" : "Nada por aqui neste mês"}
          text={
            query
              ? "Tente outra palavra ou limpe a busca."
              : "Toque no + para registrar um gasto ou uma entrada, ou importe o extrato do Mercado Pago."
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([date, entries]) => (
            <section key={date} aria-label={format(parseISO(date), "d 'de' MMMM", { locale: ptBR })}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground first-letter:uppercase">
                {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <ul className="card-surface divide-y overflow-hidden">
                {entries.map((e) =>
                  e.type === "tx" ? (
                    <li key={e.tx.id} className="py-3 pr-1 pl-3">
                      <ActivityItem
                        tx={e.tx}
                        categories={categoryById}
                        subtitle={subtitle(e.tx)}
                        trailing={
                          <RowMenu
                            label={e.tx.description}
                            editable={e.tx.kind === "entrada" || e.tx.kind === "saida"}
                            onEdit={() => setDialog({ type: "edit", tx: e.tx })}
                            onDelete={() => setDialog({ type: "delete", tx: e.tx })}
                          />
                        }
                      />
                    </li>
                  ) : (
                    <BillItem
                      key={e.occurrence.bill.id}
                      occurrence={e.occurrence}
                      category={e.occurrence.bill.category_id ? categoryById.get(e.occurrence.bill.category_id) : undefined}
                      onPay={() => setDialog({ type: "pay", occurrence: e.occurrence })}
                    />
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ResetStatementDialog open={resetOpen} onOpenChange={setResetOpen} accounts={accounts} month={month} />

      <ResponsiveDialog open={dialog?.type === "edit"} onOpenChange={(o) => !o && close()} title="Editar movimentação">
        {dialog?.type === "edit" ? (
          <TransactionForm transaction={dialog.tx} accounts={accounts} categories={categories} members={members} onDone={close} />
        ) : null}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={dialog?.type === "pay"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "pay" ? dialog.occurrence.bill.description : ""}
      >
        {dialog?.type === "pay" ? (
          <PayBillForm bill={dialog.occurrence.bill} month={month} accounts={accounts} onDone={close} />
        ) : null}
      </ResponsiveDialog>

      <ConfirmDialog
        open={dialog?.type === "delete"}
        onOpenChange={(o) => !o && close()}
        title="Apagar movimentação?"
        description={
          dialog?.type === "delete" && dialog.tx.transfer_group
            ? "Os dois lados da transferência serão apagados e os saldos voltam ao que eram."
            : "O saldo da conta volta ao que era antes dela."
        }
        confirmLabel="Apagar"
        action={() => (dialog?.type === "delete" ? deleteTransaction(dialog.tx.id) : Promise.resolve(null))}
      />
    </>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="card-surface px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function RowMenu({
  label,
  editable,
  onEdit,
  onDelete,
}: {
  label: string;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" aria-label={`Ações de ${label}`}>
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {editable ? <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem> : null}
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Apagar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BillItem({
  occurrence,
  category,
  onPay,
}: {
  occurrence: BillOccurrenceView;
  category?: CategoryOption;
  onPay: () => void;
}) {
  const { bill, status } = occurrence;
  const late = status === "atrasada";
  const soon = status === "vence-logo";
  return (
    <li className="flex items-center gap-3 bg-accent/40 px-3 py-3">
      <IconBubble
        icon={category ? categoryIcon(category.icon) : SPECIAL_ICONS.fixa}
        color={category?.color ?? "#0078C8"}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{bill.description}</p>
        <p className="flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              late ? "bg-destructive-soft text-destructive" : soon ? "bg-warning-soft text-warning-foreground" : "bg-accent text-accent-foreground",
            )}
          >
            {late ? "Atrasada" : soon ? "Vence logo" : "A pagar"}
          </span>
          <Money value={bill.kind === "saida" ? -bill.amount : bill.amount} sign="always" className="text-muted-foreground" />
        </p>
      </div>
      <Button size="sm" onClick={onPay} className="shrink-0 rounded-full">
        {bill.kind === "saida" ? "Pagar" : "Recebi"}
      </Button>
    </li>
  );
}
