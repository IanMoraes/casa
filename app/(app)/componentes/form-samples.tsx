"use client";

import { ColorField, FormField, MoneyInput, SelectField, TextInput } from "@/components/forms/fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function FormSamples() {
  return (
    <form className="max-w-md" onSubmit={(e) => e.preventDefault()}>
      <FieldGroup>
        <ToggleGroup type="single" variant="outline" defaultValue="saida" className="w-full *:flex-1">
          <ToggleGroupItem value="saida">Saída</ToggleGroupItem>
          <ToggleGroupItem value="entrada">Entrada</ToggleGroupItem>
        </ToggleGroup>
        <FormField label="Descrição" htmlFor="s-desc">
          <TextInput id="s-desc" placeholder="Mercado da semana" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valor" htmlFor="s-amount">
            <MoneyInput id="s-amount" defaultValue={87.9} />
          </FormField>
          <FormField label="Valor com erro" htmlFor="s-err" error="Informe o valor em reais, como 1.234,56.">
            <MoneyInput id="s-err" invalid />
          </FormField>
        </div>
        <FormField label="Conta" htmlFor="s-acc">
          <SelectField
            id="s-acc"
            name="sample"
            placeholder="Escolha a conta"
            options={[
              { value: "1", label: "Mercado Pago · Ana" },
              { value: "2", label: "Nubank · Léo" },
            ]}
          />
        </FormField>
        <ColorField name="sample-color" label="Cor" />
        <Field orientation="horizontal">
          <Checkbox id="s-check" defaultChecked />
          <FieldLabel htmlFor="s-check">Ajustar o saldo da conta</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Switch id="s-switch" defaultChecked />
          <FieldLabel htmlFor="s-switch">Ativa</FieldLabel>
        </Field>
      </FieldGroup>
    </form>
  );
}
