"use client";

import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  FileUpIcon,
  ListPlusIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";

import { TransferForm } from "@/components/finance/account-forms";
import { TransactionForm } from "@/components/finance/transaction-form";
import type { AccountOption, CategoryOption, MemberOption } from "@/components/finance/types";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { TaskForm, type LaneOption } from "@/components/tasks/task-form";
import { cn } from "@/lib/utils";

export type QuickActionKind = "saida" | "entrada" | "transferencia" | "tarefa";

type Data = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
  lanes: LaneOption[];
  meId: string;
};

const QuickActionsContext = createContext<{ open: (kind: QuickActionKind) => void } | null>(null);

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions precisa do QuickActionsProvider");
  return ctx;
}

const TITLES: Record<QuickActionKind, string> = {
  saida: "Novo gasto",
  entrada: "Nova entrada",
  transferencia: "Transferir entre contas",
  tarefa: "Nova tarefa",
};

// Os formulários de "adicionar" ficam num lugar só, acessíveis de qualquer tela.
export function QuickActionsProvider({ data, children }: { data: Data; children: ReactNode }) {
  const [kind, setKind] = useState<QuickActionKind | null>(null);
  const close = () => setKind(null);
  const noAccounts = data.accounts.length === 0;

  return (
    <QuickActionsContext value={{ open: setKind }}>
      {children}
      <ResponsiveDialog
        open={kind !== null}
        onOpenChange={(o) => !o && close()}
        title={kind ? TITLES[kind] : ""}
        description={
          kind === "transferencia" ? "Não conta como gasto nem como entrada; só muda o dinheiro de lugar." : undefined
        }
      >
        {(kind === "saida" || kind === "entrada" || kind === "transferencia") && noAccounts ? (
          <div className="flex flex-col gap-3 pb-2 text-sm">
            <p>Para registrar dinheiro, cadastre primeiro uma conta (banco, cofrinho ou carteira).</p>
            <Link href="/financas/contas" onClick={close} className="font-medium text-primary underline-offset-4 hover:underline">
              Ir para Contas e cofrinhos
            </Link>
          </div>
        ) : kind === "saida" || kind === "entrada" ? (
          <TransactionForm
            key={kind}
            defaultKind={kind}
            accounts={data.accounts}
            categories={data.categories}
            members={data.members}
            onDone={close}
          />
        ) : kind === "transferencia" ? (
          <TransferForm accounts={data.accounts} members={data.members} onDone={close} />
        ) : kind === "tarefa" ? (
          <TaskForm lanes={data.lanes} members={data.members} defaultAssignee={data.meId} onDone={close} />
        ) : null}
      </ResponsiveDialog>
    </QuickActionsContext>
  );
}

type Shortcut = { label: string; icon: LucideIcon; color: string } & (
  | { action: QuickActionKind }
  | { href: string }
);

export const SHORTCUTS: Shortcut[] = [
  { label: "Gasto", icon: ArrowUpRightIcon, color: "#E03131", action: "saida" },
  { label: "Entrada", icon: ArrowDownLeftIcon, color: "#00A650", action: "entrada" },
  { label: "Transferir", icon: ArrowLeftRightIcon, color: "#0078C8", action: "transferencia" },
  { label: "Importar", icon: FileUpIcon, color: "#7950F2", href: "/financas/importar" },
  { label: "Tarefa", icon: ListPlusIcon, color: "#F76707", action: "tarefa" },
];

// Fileira de atalhos redondos (estilo app de banco).
export function ShortcutRow({ className }: { className?: string }) {
  const { open } = useQuickActions();
  return (
    <ul className={cn("grid grid-cols-5 gap-1", className)}>
      {SHORTCUTS.map((s) => {
        const inner = (
          <>
            <span
              className="grid size-12 place-items-center rounded-full transition-transform group-active:scale-95 sm:size-14"
              style={{ backgroundColor: `color-mix(in oklab, ${s.color} 14%, var(--surface))`, color: s.color }}
            >
              <s.icon className="size-[1.35rem] sm:size-6" strokeWidth={2.2} aria-hidden />
            </span>
            <span className="text-xs font-medium">{s.label}</span>
          </>
        );
        const cls =
          "group flex w-full min-w-0 flex-col items-center gap-1.5 rounded-xl py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
        return (
          <li key={s.label} className="min-w-0">
            {"href" in s ? (
              <Link href={s.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <button type="button" className={cls} onClick={() => open(s.action)}>
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
