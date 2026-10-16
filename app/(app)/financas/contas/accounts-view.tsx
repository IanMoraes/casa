"use client";

import {
  ArrowLeftRightIcon,
  LandmarkIcon,
  MoreVerticalIcon,
  PiggyBankIcon,
  PlusIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccountForm, AdjustBalanceForm, TransferForm } from "@/components/finance/account-forms";
import { IconBubble } from "@/components/finance/category-badge";
import { Money } from "@/components/finance/money";
import { PrivacyToggle } from "@/components/finance/privacy";
import { ResetStatementDialog } from "@/components/finance/reset-statement";
import { accountKindLabel, type AccountOption, type MemberOption } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { archiveAccount, deleteAccount } from "@/lib/actions/finance";
import { currentMonth } from "@/lib/dates";
import { sum } from "@/lib/money";

type DialogState =
  | { type: "new" }
  | { type: "edit"; account: AccountOption }
  | { type: "adjust"; account: AccountOption }
  | { type: "transfer" }
  | { type: "delete"; account: AccountOption }
  | { type: "reset"; account: AccountOption }
  | null;

export function AccountsView({
  accounts,
  members,
  meId,
}: {
  accounts: AccountOption[];
  members: MemberOption[];
  meId: string;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  return (
    <>
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-hero to-hero-strong p-5 text-hero-foreground">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Total da casa</p>
          <PrivacyToggle className="-mr-2" />
        </div>
        <Money value={sum(active.map((a) => a.balance))} className="mt-1 block text-[2.25rem] leading-none font-bold" currencyClassName="text-xl" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => setDialog({ type: "new" })}
            className="h-11 rounded-full bg-white font-semibold text-hero hover:bg-white/90"
          >
            <PlusIcon /> Nova conta
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDialog({ type: "transfer" })}
            disabled={active.length < 2}
            className="h-11 rounded-full bg-white/15 font-semibold text-hero-foreground hover:bg-white/25"
          >
            <ArrowLeftRightIcon /> Transferir
          </Button>
        </div>
      </div>

      {active.length === 0 ? (
        <Empty className="card-surface">
          <EmptyHeader>
            <EmptyTitle>Nenhuma conta ainda</EmptyTitle>
            <EmptyDescription>
              Cadastre cada conta de banco, cofrinho ou carteira com o saldo de hoje. O total da casa aparece aqui.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialog({ type: "new" })}>
              <PlusIcon /> Nova conta
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {members.map((member) => {
            const own = active.filter((a) => a.owner_id === member.user_id);
            return (
              <section key={member.user_id} aria-labelledby={`acc-${member.user_id}`}>
                <div className="mb-3 flex items-center gap-3 px-1">
                  <PersonAvatar name={member.display_name} color={member.color} src={member.avatar_url} />
                  <h2 id={`acc-${member.user_id}`} className="min-w-0 flex-1 truncate font-bold">
                    {member.display_name}
                  </h2>
                  <Money value={sum(own.map((a) => a.balance))} className="font-bold" />
                </div>
                {own.length === 0 ? (
                  <p className="card-surface p-4 text-sm text-muted-foreground">
                    Nenhuma conta de {member.display_name} ainda.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {own.map((account) => (
                      <AccountCard key={account.id} account={account} onAction={setDialog} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {archived.length > 0 ? (
        <details className="mt-8">
          <summary className="cursor-pointer px-1 text-sm font-medium text-muted-foreground">
            Arquivadas ({archived.length})
          </summary>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((account) => (
              <AccountCard key={account.id} account={account} onAction={setDialog} />
            ))}
          </ul>
        </details>
      ) : null}

      <ResponsiveDialog open={dialog?.type === "new" || dialog?.type === "edit"} onOpenChange={(o) => !o && close()} title={dialog?.type === "edit" ? "Editar conta" : "Nova conta"}>
        {dialog?.type === "new" || dialog?.type === "edit" ? (
          <AccountForm
            account={dialog.type === "edit" ? dialog.account : undefined}
            members={members}
            defaultOwnerId={meId}
            onDone={close}
          />
        ) : null}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={dialog?.type === "adjust"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "adjust" ? `Ajustar saldo · ${dialog.account.name}` : "Ajustar saldo"}
      >
        {dialog?.type === "adjust" ? <AdjustBalanceForm account={dialog.account} onDone={close} /> : null}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={dialog?.type === "transfer"}
        onOpenChange={(o) => !o && close()}
        title="Transferir entre contas"
        description="Não conta como gasto nem como entrada; só muda o dinheiro de lugar."
      >
        {dialog?.type === "transfer" ? <TransferForm accounts={active} members={members} onDone={close} /> : null}
      </ResponsiveDialog>

      <ResetStatementDialog
        open={dialog?.type === "reset"}
        onOpenChange={(o) => !o && close()}
        accounts={accounts}
        month={currentMonth()}
        presetAccountId={dialog?.type === "reset" ? dialog.account.id : undefined}
        presetAllMonths
      />

      <ConfirmDialog
        open={dialog?.type === "delete"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "delete" ? `Apagar ${dialog.account.name}?` : ""}
        description="Todas as movimentações dessa conta também serão apagadas. Para só esconder a conta, use Arquivar."
        confirmLabel="Apagar conta"
        action={() => (dialog?.type === "delete" ? deleteAccount(dialog.account.id) : Promise.resolve(null))}
      />
    </>
  );
}

const KIND_ICON = { corrente: LandmarkIcon, poupanca: PiggyBankIcon, cofrinho: PiggyBankIcon, investimento: TrendingUpIcon, carteira: WalletIcon };

function AccountCard({ account, onAction }: { account: AccountOption; onAction: (d: DialogState) => void }) {
  const goal = account.goal_amount;
  const progress = goal ? Math.min(100, Math.max(0, (account.balance / goal) * 100)) : null;
  const color = account.color ?? "#0078C8";

  async function toggleArchive() {
    const result = await archiveAccount(account.id, !account.archived);
    if (result?.ok) toast.success(result.message);
    else if (result) toast.error(result.error);
  }

  return (
    <li className={cn("card-surface relative flex flex-col gap-3 overflow-hidden p-4", account.archived && "opacity-60")}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} aria-hidden />
      <div className="flex items-start gap-3">
        <IconBubble icon={KIND_ICON[account.kind]} color={color} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{account.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[account.bank, accountKindLabel(account.kind)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mt-1 -mr-2 text-muted-foreground" aria-label={`Ações de ${account.name}`}>
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onAction({ type: "adjust", account })}>Ajustar saldo</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction({ type: "edit", account })}>Editar</DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleArchive}>{account.archived ? "Reativar" : "Arquivar"}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction({ type: "reset", account })}>Resetar extrato…</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onAction({ type: "delete", account })}>
              Apagar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Money value={account.balance} className="text-2xl font-bold" />
      {progress !== null && goal ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Meta: <Money value={goal} /></span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: color }} />
          </div>
        </div>
      ) : null}
      <Button variant="outline" size="sm" className="rounded-full" onClick={() => onAction({ type: "adjust", account })}>
        Ajustar saldo
      </Button>
    </li>
  );
}
