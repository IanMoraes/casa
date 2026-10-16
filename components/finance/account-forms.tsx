"use client";

import { useState } from "react";

import { ColorField, FormField, MoneyInput, SelectField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { FieldGroup } from "@/components/ui/field";
import { adjustBalance, createTransfer, saveAccount } from "@/lib/actions/finance";
import { today } from "@/lib/dates";

import { Money } from "./money";
import { ACCOUNT_KINDS, type AccountOption, type MemberOption } from "./types";

export function AccountForm({
  account,
  members,
  defaultOwnerId,
  onDone,
}: {
  account?: AccountOption;
  members: MemberOption[];
  defaultOwnerId: string;
  onDone: () => void;
}) {
  const form = useActionForm(saveAccount, { onSuccess: onDone });
  const [kind, setKind] = useState(account?.kind ?? "corrente");

  return (
    <form onSubmit={form.onSubmit}>
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <FieldGroup>
        <FormField label="Nome" htmlFor="acc-name" error={form.errorFor("name")}>
          <TextInput id="acc-name" name="name" defaultValue={account?.name} placeholder="Conta do dia a dia" required />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Banco" htmlFor="acc-bank" error={form.errorFor("bank")}>
            <TextInput id="acc-bank" name="bank" defaultValue={account?.bank ?? ""} placeholder="Mercado Pago" />
          </FormField>
          <FormField label="Tipo" htmlFor="acc-kind">
            <SelectField
              id="acc-kind"
              name="kind"
              defaultValue={kind}
              onValueChange={(v) => setKind(v as typeof kind)}
              options={ACCOUNT_KINDS}
            />
          </FormField>
        </div>
        <FormField label="De quem é" htmlFor="acc-owner" error={form.errorFor("owner_id")}>
          <SelectField
            id="acc-owner"
            name="owner_id"
            defaultValue={account?.owner_id ?? defaultOwnerId}
            options={members.map((m) => ({ value: m.user_id, label: m.display_name }))}
          />
        </FormField>
        {account ? null : (
          <FormField
            label="Saldo atual"
            htmlFor="acc-balance"
            description="O que aparece hoje no app do banco. Daqui em diante, o saldo muda com as movimentações."
            error={form.errorFor("initial_balance")}
          >
            <MoneyInput id="acc-balance" name="initial_balance" defaultValue={0} allowNegative />
          </FormField>
        )}
        {kind === "cofrinho" || kind === "investimento" ? (
          <FormField label="Meta (opcional)" htmlFor="acc-goal" error={form.errorFor("goal_amount")}>
            <MoneyInput id="acc-goal" name="goal_amount" defaultValue={account?.goal_amount ?? undefined} />
          </FormField>
        ) : null}
        <ColorField name="color" label="Cor" defaultValue={account?.color} />
        <SubmitButton pending={form.pending} className="w-full">
          {account ? "Salvar conta" : "Criar conta"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

export function AdjustBalanceForm({ account, onDone }: { account: AccountOption; onDone: () => void }) {
  const form = useActionForm(adjustBalance, { onSuccess: onDone });
  return (
    <form onSubmit={form.onSubmit}>
      <input type="hidden" name="account_id" value={account.id} />
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          Saldo no app: <Money value={account.balance} className="font-medium text-foreground" />. Informe o valor que aparece
          no banco; a diferença entra como um ajuste e não conta como gasto.
        </p>
        <FormField label="Saldo no banco" htmlFor="adj-balance" error={form.errorFor("balance")}>
          <MoneyInput id="adj-balance" name="balance" defaultValue={account.balance} allowNegative autoFocus required />
        </FormField>
        <FormField label="Data do ajuste" htmlFor="adj-date" error={form.errorFor("occurred_on")}>
          <TextInput id="adj-date" name="occurred_on" type="date" defaultValue={today()} required />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          Ajustar saldo
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

export function TransferForm({
  accounts,
  members,
  onDone,
}: {
  accounts: AccountOption[];
  members: MemberOption[];
  onDone: () => void;
}) {
  const form = useActionForm(createTransfer, { onSuccess: onDone });
  const ownerName = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? "";
  const options = accounts.map((a) => ({ value: a.id, label: `${a.name} · ${ownerName(a.owner_id)}` }));

  return (
    <form onSubmit={form.onSubmit}>
      <FieldGroup>
        <FormField label="De" htmlFor="tr-from" error={form.errorFor("from_account")}>
          <SelectField id="tr-from" name="from_account" placeholder="Conta de origem" options={options} />
        </FormField>
        <FormField label="Para" htmlFor="tr-to" error={form.errorFor("to_account")}>
          <SelectField id="tr-to" name="to_account" placeholder="Conta de destino" options={options} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valor" htmlFor="tr-amount" error={form.errorFor("amount")}>
            <MoneyInput id="tr-amount" name="amount" required />
          </FormField>
          <FormField label="Data" htmlFor="tr-date" error={form.errorFor("occurred_on")}>
            <TextInput id="tr-date" name="occurred_on" type="date" defaultValue={today()} required />
          </FormField>
        </div>
        <FormField label="Descrição (opcional)" htmlFor="tr-desc">
          <TextInput id="tr-desc" name="description" placeholder="Guardar para a viagem" />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          Transferir
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
