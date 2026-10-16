"use client";

import { Loader2Icon } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/categories";
import { maskDay, maskInviteCode, maskMoney, moneyToMasked, toggleMoneySign } from "@/lib/masks";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  error,
  description,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {description && !error ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export function TextInput({ invalid, ...props }: ComponentProps<typeof Input> & { invalid?: boolean }) {
  return <Input aria-invalid={invalid || undefined} {...props} />;
}

// Valor em reais com máscara de app de banco: a pessoa digita só os números
// e os centavos se ajustam ("123456" vira "1.234,56"). O servidor lê esse
// texto. Com `allowNegative`, o botão ± (ou digitar "-") troca o sinal.
export function MoneyInput({
  defaultValue,
  invalid,
  allowNegative = false,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "defaultValue" | "type" | "value"> & {
  defaultValue?: number | null;
  invalid?: boolean;
  allowNegative?: boolean;
}) {
  const [value, setValue] = useState(() => moneyToMasked(defaultValue, allowNegative));

  return (
    <InputGroup className="h-10 md:h-9">
      <InputGroupAddon>
        <InputGroupText>R$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        className="tabular"
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(e) => {
          setValue(maskMoney(e.target.value, allowNegative));
          onChange?.(e);
        }}
        // O cursor fica sempre no fim, como nos apps de banco.
        onFocus={(e) => {
          const el = e.currentTarget;
          requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
        }}
        {...props}
      />
      {allowNegative ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            onClick={() => setValue((v) => toggleMoneySign(v || "0,00"))}
            aria-label={value.startsWith("-") ? "Tornar positivo" : "Tornar negativo"}
            className="font-semibold"
          >
            ±
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

// Campo de texto com máscara simples (o valor é reformatado a cada tecla).
function MaskedInput({
  mask,
  defaultValue,
  invalid,
  ...props
}: Omit<ComponentProps<typeof Input>, "defaultValue" | "value" | "onChange"> & {
  mask: (raw: string) => string;
  defaultValue?: string | number | null;
  invalid?: boolean;
}) {
  const [value, setValue] = useState(() => mask(defaultValue === null || defaultValue === undefined ? "" : String(defaultValue)));
  return (
    <Input aria-invalid={invalid || undefined} value={value} onChange={(e) => setValue(mask(e.target.value))} {...props} />
  );
}

// Dia do mês (1 a 31), com teclado numérico.
export function DayInput(props: Omit<ComponentProps<typeof MaskedInput>, "mask">) {
  return <MaskedInput mask={maskDay} inputMode="numeric" autoComplete="off" placeholder="10" {...props} />;
}

// Código de convite: 8 letras e números em maiúsculas.
export function InviteCodeInput(props: Omit<ComponentProps<typeof MaskedInput>, "mask">) {
  return (
    <MaskedInput
      mask={maskInviteCode}
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
      placeholder="AB12CD34"
      className="font-semibold tracking-[0.2em] uppercase"
      {...props}
    />
  );
}

export type Option = { value: string; label: ReactNode };

// Select do shadcn que também envia o valor no FormData (via `name`).
export function SelectField({
  id,
  name,
  options,
  defaultValue,
  placeholder,
  invalid,
  className,
  onValueChange,
}: {
  id: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={cn("w-full", className)} aria-invalid={invalid || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SubmitButton({
  pending,
  children,
  className,
  variant,
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending ? <Loader2Icon className="animate-spin" /> : null}
      {children}
    </Button>
  );
}


// Cores sugeridas para pessoas, contas, categorias e listas.
export function ColorField({ name, defaultValue, label }: { name: string; defaultValue?: string | null; label: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((c, i) => (
          <label key={c} className="relative">
            <input
              type="radio"
              name={name}
              value={c}
              defaultChecked={defaultValue ? defaultValue.toUpperCase() === c : i === 0}
              className="peer sr-only"
            />
            <span
              className="block size-9 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
              style={{ backgroundColor: c }}
            />
            <span className="sr-only">{c}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Escolha do ícone de uma categoria.
export function IconField({ name, defaultValue, label }: { name: string; defaultValue?: string; label: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
        {Object.entries(CATEGORY_ICONS).map(([key, Icon], i) => (
          <label key={key} className="relative">
            <input
              type="radio"
              name={name}
              value={key}
              defaultChecked={defaultValue ? defaultValue === key : i === 0}
              className="peer sr-only"
            />
            <span
              className="grid aspect-square place-items-center rounded-full bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
            >
              <Icon className="size-[1.1rem]" aria-hidden />
            </span>
            <span className="sr-only">{key}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
