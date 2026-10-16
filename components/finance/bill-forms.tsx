"use client";

import { useState } from "react";

import { DayInput, FormField, MoneyInput, SelectField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { payBill, saveBill } from "@/lib/actions/finance";
import { currentMonth, monthLabel, toMonthParam, today } from "@/lib/dates";

import type { AccountOption, BillRow, CategoryOption, MemberOption } from "./types";

export function BillForm({
  bill,
  accounts,
  categories,
  members,
  defaultOwnerId,
  onDone,
}: {
  bill?: BillRow;
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
  defaultOwnerId: string;
  onDone: () => void;
}) {
  const form = useActionForm(saveBill, { onSuccess: onDone });
  const [kind, setKind] = useState<"entrada" | "saida">(bill?.kind ?? "saida");
  const [active, setActive] = useState(bill?.active ?? true);

  return (
    <form onSubmit={form.onSubmit}>
      {bill ? <input type="hidden" name="id" value={bill.id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="active" value={active ? "on" : "off"} />
      <FieldGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={(v) => v && setKind(v as typeof kind)}
          className="w-full *:flex-1"
          aria-label="Tipo"
        >
          <ToggleGroupItem value="saida">Conta a pagar</ToggleGroupItem>
          <ToggleGroupItem value="entrada">Valor a receber</ToggleGroupItem>
        </ToggleGroup>

        <FormField label="Descrição" htmlFor="bill-desc" error={form.errorFor("description")}>
          <TextInput
            id="bill-desc"
            name="description"
            defaultValue={bill?.description}
            placeholder={kind === "saida" ? "Aluguel" : "Salário"}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valor previsto" htmlFor="bill-amount" error={form.errorFor("amount")}>
            <MoneyInput id="bill-amount" name="amount" defaultValue={bill?.amount} required />
          </FormField>
          <FormField label="Dia do vencimento" htmlFor="bill-day" error={form.errorFor("due_day")}>
            <DayInput id="bill-day" name="due_day" defaultValue={bill?.due_day ?? 10} invalid={Boolean(form.errorFor("due_day"))} required />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="De quem é" htmlFor="bill-owner" error={form.errorFor("owner_id")}>
            <SelectField
              id="bill-owner"
              name="owner_id"
              defaultValue={bill?.owner_id ?? defaultOwnerId}
              options={members.map((m) => ({ value: m.user_id, label: m.display_name }))}
            />
          </FormField>
          <FormField label="Conta usada" htmlFor="bill-account">
            <SelectField
              id="bill-account"
              name="account_id"
              defaultValue={bill?.account_id ?? "none"}
              options={[{ value: "none", label: "Escolher na hora" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
            />
          </FormField>
        </div>

        <FormField label="Categoria" htmlFor="bill-category">
          <SelectField
            key={kind}
            id="bill-category"
            name="category_id"
            defaultValue={bill?.kind === kind ? (bill.category_id ?? "none") : "none"}
            options={[
              { value: "none", label: "Sem categoria" },
              ...categories.filter((c) => c.kind === kind).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Primeiro mês" htmlFor="bill-start" error={form.errorFor("start_month")}>
            <TextInput
              id="bill-start"
              name="start_month"
              type="month"
              defaultValue={toMonthParam(bill?.start_month ?? currentMonth())}
              required
            />
          </FormField>
          <FormField
            label="Último mês"
            htmlFor="bill-end"
            description="Vazio = sem fim"
            error={form.errorFor("end_month")}
          >
            <TextInput
              id="bill-end"
              name="end_month"
              type="month"
              defaultValue={bill?.end_month ? toMonthParam(bill.end_month) : ""}
            />
          </FormField>
        </div>

        {bill ? (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="bill-active">Ativa</FieldLabel>
              <FieldDescription>Desative para parar de mostrar nos próximos meses sem apagar o histórico.</FieldDescription>
            </FieldContent>
            <Switch id="bill-active" checked={active} onCheckedChange={setActive} />
          </Field>
        ) : null}

        <SubmitButton pending={form.pending} className="w-full">
          {bill ? "Salvar conta fixa" : "Criar conta fixa"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

export function PayBillForm({
  bill,
  month,
  accounts,
  onDone,
}: {
  bill: BillRow;
  month: string;
  accounts: AccountOption[];
  onDone: () => void;
}) {
  const form = useActionForm(payBill, { onSuccess: onDone });
  const preferred = bill.account_id ?? accounts.find((a) => a.owner_id === bill.owner_id)?.id;

  return (
    <form onSubmit={form.onSubmit}>
      <input type="hidden" name="bill_id" value={bill.id} />
      <input type="hidden" name="reference_month" value={month} />
      <FieldGroup>
        <p className="text-sm text-muted-foreground">Referente a {monthLabel(month).toLowerCase()}.</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={bill.kind === "saida" ? "Valor pago" : "Valor recebido"} htmlFor="pay-amount" error={form.errorFor("amount")}>
            <MoneyInput id="pay-amount" name="amount" defaultValue={bill.amount} required />
          </FormField>
          <FormField label="Data" htmlFor="pay-date" error={form.errorFor("occurred_on")}>
            <TextInput id="pay-date" name="occurred_on" type="date" defaultValue={today()} required />
          </FormField>
        </div>
        <FormField
          label={bill.kind === "saida" ? "Saiu de qual conta" : "Entrou em qual conta"}
          htmlFor="pay-account"
          error={form.errorFor("account_id")}
        >
          <SelectField
            id="pay-account"
            name="account_id"
            defaultValue={preferred}
            placeholder="Escolha a conta"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            invalid={Boolean(form.errorFor("account_id"))}
          />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          {bill.kind === "saida" ? "Marcar como pago" : "Marcar como recebido"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
