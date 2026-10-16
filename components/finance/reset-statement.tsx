"use client";

import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField, SelectField, TextInput } from "@/components/forms/fields";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { Button } from "@/components/ui/button";
import { previewResetStatement, resetStatement } from "@/lib/actions/finance";
import { monthLabel, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { AccountOption } from "./types";

const CONFIRM_WORD = "APAGAR";

// "Resetar extrato": apaga lançamentos de um mês, de uma conta ou de tudo.
// Mostra quantos lançamentos serão apagados antes de confirmar.
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  month: MonthKey;
  presetAccountId?: string;
  presetAllMonths?: boolean;
};

export function ResetStatementDialog(props: Props) {
  return (
    <ResponsiveDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Resetar extrato"
      description="Apaga lançamentos para começar de novo. Depois disso, o saldo de cada conta volta ao saldo inicial dela."
    >
      {/* O corpo só existe com o diálogo aberto: cada abertura recomeça do zero. */}
      {props.open ? <ResetBody {...props} /> : null}
    </ResponsiveDialog>
  );
}

type Preview = { key: string; count: number | null; error: string | null };

function ResetBody({ onOpenChange, accounts, month, presetAccountId, presetAllMonths = false }: Props) {
  const [allMonths, setAllMonths] = useState(presetAllMonths);
  const [accountId, setAccountId] = useState(presetAccountId ?? "all");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const scope = { accountId: accountId === "all" ? null : accountId, month: allMonths ? null : month };
  const account = accounts.find((a) => a.id === accountId);
  const scopeKey = `${scope.accountId}|${scope.month}`;

  // Quantos lançamentos entram no reset com a escolha atual. A contagem fica
  // guardada com a escolha a que pertence; enquanto não bate, mostra "contando".
  useEffect(() => {
    let cancelled = false;
    previewResetStatement(scope).then((r) => {
      if (!cancelled) setPreview({ key: scopeKey, count: r.ok ? r.count : null, error: r.ok ? null : r.error });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const current = preview?.key === scopeKey ? preview : null;
  const count = current?.count ?? null;
  const previewError = current?.error ?? null;

  const sweeping = allMonths; // vários meses: pede para digitar APAGAR
  const needsTyping = sweeping && (count ?? 0) > 0;
  const canConfirm = count !== null && count > 0 && (!needsTyping || typed.trim().toUpperCase() === CONFIRM_WORD);

  const what = `${allMonths ? "de todos os meses" : `de ${monthLabel(month).toLowerCase()}`}, ${
    account ? `da conta ${account.name}` : "de todas as contas"
  }`;

  function confirm() {
    startTransition(async () => {
      const result = await resetStatement(scope);
      if (result?.ok) {
        toast.success(result.message);
        onOpenChange(false);
      } else if (result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-5 pb-2">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">O que apagar</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {[
              { value: false, label: monthLabel(month, false), hint: "Só este mês" },
              { value: true, label: "Todos os meses", hint: "Tudo da conta" },
            ].map((o) => (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={allMonths === o.value}
                onClick={() => setAllMonths(o.value)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  allMonths === o.value ? "border-primary bg-accent" : "hover:bg-muted",
                )}
              >
                <span className="block font-semibold">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <FormField label="De qual conta" htmlFor="reset-account">
          <SelectField
            id="reset-account"
            name="account"
            defaultValue={accountId}
            onValueChange={setAccountId}
            options={[{ value: "all", label: "Todas as contas" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </FormField>

        <div
          className={cn(
            "flex gap-3 rounded-xl p-3 text-sm",
            count === 0 ? "bg-muted text-muted-foreground" : "bg-destructive-soft text-destructive",
          )}
          role="status"
        >
          {count === null && !previewError ? (
            <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <p>
            {previewError ??
              (count === null
                ? "Contando lançamentos…"
                : count === 0
                  ? `Não há lançamentos ${what}.`
                  : `${count} ${count === 1 ? "lançamento será apagado" : "lançamentos serão apagados"} ${what}, com as importações e os pagamentos de contas fixas. Transferências levam o outro lado junto. As contas, os saldos iniciais, as categorias e as contas fixas ficam. Não dá para desfazer.`)}
          </p>
        </div>

        {needsTyping ? (
          <FormField label={`Para confirmar, digite ${CONFIRM_WORD}`} htmlFor="reset-confirm">
            <TextInput
              id="reset-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={CONFIRM_WORD}
            />
          </FormField>
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" className="flex-1" onClick={confirm} disabled={!canConfirm || pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Resetar extrato
          </Button>
        </div>
      </div>
    </>
  );
}
