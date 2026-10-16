"use client";

import { useState } from "react";

import { FormField, MoneyInput, SelectField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { saveTransaction } from "@/lib/actions/finance";
import { today } from "@/lib/dates";

import type { AccountOption, CategoryOption, MemberOption, TransactionRow } from "./types";

export function TransactionForm({
  transaction,
  accounts,
  categories,
  members,
  defaultKind = "saida",
  onDone,
}: {
  transaction?: TransactionRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
  defaultKind?: "entrada" | "saida";
  onDone: () => void;
}) {
  const form = useActionForm(saveTransaction, { onSuccess: onDone });
  const [kind, setKind] = useState<"entrada" | "saida">(
    transaction ? (transaction.kind === "entrada" ? "entrada" : "saida") : defaultKind,
  );
  const ownerName = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? "";

  return (
    <form onSubmit={form.onSubmit}>
      {transaction ? <input type="hidden" name="id" value={transaction.id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      <FieldGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={(v) => v && setKind(v as typeof kind)}
          className="w-full *:flex-1"
          aria-label="Tipo"
        >
          <ToggleGroupItem value="saida">Saída</ToggleGroupItem>
          <ToggleGroupItem value="entrada">Entrada</ToggleGroupItem>
        </ToggleGroup>

        <FormField label="Descrição" htmlFor="tx-desc" error={form.errorFor("description")}>
          <TextInput
            id="tx-desc"
            name="description"
            defaultValue={transaction?.description}
            placeholder={kind === "saida" ? "Mercado da semana" : "Salário"}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valor" htmlFor="tx-amount" error={form.errorFor("amount")}>
            <MoneyInput
              id="tx-amount"
              name="amount"
              defaultValue={transaction ? Math.abs(transaction.amount) : undefined}
              invalid={Boolean(form.errorFor("amount"))}
              required
            />
          </FormField>
          <FormField label="Data" htmlFor="tx-date" error={form.errorFor("occurred_on")}>
            <TextInput id="tx-date" name="occurred_on" type="date" defaultValue={transaction?.occurred_on ?? today()} required />
          </FormField>
        </div>

        <FormField label="Conta" htmlFor="tx-account" error={form.errorFor("account_id")}>
          <SelectField
            id="tx-account"
            name="account_id"
            defaultValue={transaction?.account_id ?? (accounts.length === 1 ? accounts[0].id : undefined)}
            placeholder="Escolha a conta"
            options={accounts.map((a) => ({ value: a.id, label: `${a.name} · ${ownerName(a.owner_id)}` }))}
            invalid={Boolean(form.errorFor("account_id"))}
          />
        </FormField>

        <FormField label="Categoria" htmlFor="tx-category" error={form.errorFor("category_id")}>
          <SelectField
            key={kind}
            id="tx-category"
            name="category_id"
            defaultValue={transaction?.kind === kind ? (transaction.category_id ?? "none") : "none"}
            options={[
              { value: "none", label: "Sem categoria" },
              ...categories.filter((c) => c.kind === kind).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </FormField>

        <SubmitButton pending={form.pending} className="w-full">
          {transaction ? "Salvar movimentação" : "Adicionar movimentação"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
