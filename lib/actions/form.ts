import { z } from "zod";

import { parseAmount } from "@/lib/money";

// Campos de formulário chegam como texto; estes esquemas convertem e validam.

export const money = (label = "o valor") =>
  z
    .string({ error: `Informe ${label}.` })
    .transform((v, ctx) => {
      const n = parseAmount(v);
      if (n === null) {
        ctx.addIssue({ code: "custom", message: `Informe ${label} em reais, como 1.234,56.` });
        return z.NEVER;
      }
      return n;
    });

export const positiveMoney = (label = "o valor") =>
  money(label).refine((n) => n > 0, { message: `${capitalize(label)} precisa ser maior que zero.` });

export const isoDate = z
  .string({ error: "Informe a data." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data.");

export const monthInput = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe o mês.")
  .transform((v) => `${v}-01`);

export const uuid = (message: string) => z.uuid({ error: message });

export const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v && v !== "none" ? v : null))
  .pipe(z.uuid().nullable());

export const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null))
    .pipe(z.string().max(max).nullable());

export const color = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Escolha uma cor.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export function formToObject(formData: FormData) {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
