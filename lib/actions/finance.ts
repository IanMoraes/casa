"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CATEGORY_ICONS } from "@/lib/categories";
import { getTransactions } from "@/lib/data/finance";
import { getHousehold } from "@/lib/data/session";
import { addMonths, monthOf } from "@/lib/dates";
import { round2 } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

import {
  color,
  formToObject,
  isoDate,
  money,
  monthInput,
  optionalText,
  optionalUuid,
  positiveMoney,
} from "./form";
import { failure, fromDb, fromZod, success, type ActionResult } from "./result";

function refresh() {
  // Saldos aparecem em quase todas as telas.
  revalidatePath("/", "layout");
}

async function requireMember(userId: string) {
  const ctx = await getHousehold();
  return ctx.members.some((m) => m.user_id === userId);
}

// ---------------------------------------------------------------------------
// Contas e cofrinhos
// ---------------------------------------------------------------------------

const accountSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Dê um nome para a conta.").max(60),
  bank: optionalText(60),
  kind: z.enum(["corrente", "poupanca", "cofrinho", "carteira", "investimento"]),
  owner_id: z.uuid("Escolha de quem é a conta."),
  initial_balance: money("o saldo atual").optional().default(0),
  goal_amount: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v : undefined))
    .pipe(positiveMoney("a meta").optional()),
  color,
});

export async function saveAccount(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { id, initial_balance, goal_amount, ...rest } = parsed.data;
  if (!(await requireMember(rest.owner_id))) return failure("Escolha uma pessoa da casa.");

  const supabase = await createClient();
  const values = { ...rest, color: rest.color ?? null, goal_amount: goal_amount ?? null };
  const { error } = id
    ? await supabase.from("accounts").update(values).eq("id", id)
    : await supabase.from("accounts").insert({ ...values, initial_balance });
  if (error) return fromDb(error, "Não foi possível salvar a conta.");
  refresh();
  return success(id ? "Conta salva" : "Conta criada");
}

export async function archiveAccount(id: string, archived: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ archived }).eq("id", id);
  if (error) return fromDb(error, "Não foi possível arquivar a conta.");
  refresh();
  return success(archived ? "Conta arquivada" : "Conta reativada");
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return fromDb(error, "Não foi possível apagar a conta.");
  refresh();
  return success("Conta apagada");
}

// O saldo informado vira um lançamento de ajuste com a diferença, para o
// histórico continuar fechando.
const adjustSchema = z.object({
  account_id: z.uuid(),
  balance: money("o saldo que aparece no banco"),
  occurred_on: isoDate,
});

export async function adjustBalance(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = adjustSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("account_balances")
    .select("balance")
    .eq("account_id", parsed.data.account_id)
    .single();
  if (readError) return fromDb(readError, "Não foi possível ler o saldo atual.");

  const diff = round2(parsed.data.balance - Number(current.balance));
  if (diff === 0) return success("O saldo já estava certo");

  const { error } = await supabase.from("transactions").insert({
    account_id: parsed.data.account_id,
    kind: "ajuste",
    amount: diff,
    occurred_on: parsed.data.occurred_on,
    description: "Ajuste de saldo",
  });
  if (error) return fromDb(error, "Não foi possível ajustar o saldo.");
  refresh();
  return success("Saldo ajustado");
}

// ---------------------------------------------------------------------------
// Movimentações
// ---------------------------------------------------------------------------

const transactionSchema = z.object({
  id: z.uuid().optional(),
  kind: z.enum(["entrada", "saida"]),
  account_id: z.uuid("Escolha a conta."),
  amount: positiveMoney(),
  occurred_on: isoDate,
  description: z.string().trim().min(1, "Descreva a movimentação.").max(200),
  category_id: optionalUuid,
});

export async function saveTransaction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { id, amount, ...rest } = parsed.data;
  const signed = rest.kind === "saida" ? -amount : amount;

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("transactions").update({ ...rest, amount: signed }).eq("id", id)
    : await supabase.from("transactions").insert({ ...rest, amount: signed });
  if (error) return fromDb(error, "Não foi possível salvar a movimentação.");
  refresh();
  return success(id ? "Movimentação salva" : "Movimentação adicionada");
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: tx } = await supabase.from("transactions").select("transfer_group").eq("id", id).maybeSingle();
  // Transferência apaga os dois lados juntos.
  const { error } = tx?.transfer_group
    ? await supabase.from("transactions").delete().eq("transfer_group", tx.transfer_group)
    : await supabase.from("transactions").delete().eq("id", id);
  if (error) return fromDb(error, "Não foi possível apagar a movimentação.");
  refresh();
  return success("Movimentação apagada");
}

const transferSchema = z
  .object({
    from_account: z.uuid("Escolha a conta de origem."),
    to_account: z.uuid("Escolha a conta de destino."),
    amount: positiveMoney(),
    occurred_on: isoDate,
    description: optionalText(200),
  })
  .refine((v) => v.from_account !== v.to_account, {
    message: "Escolha contas diferentes.",
    path: ["to_account"],
  });

export async function createTransfer(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = transferSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_transfer", {
    p_from_account: parsed.data.from_account,
    p_to_account: parsed.data.to_account,
    p_amount: parsed.data.amount,
    p_occurred_on: parsed.data.occurred_on,
    p_description: parsed.data.description ?? "Transferência entre contas",
  });
  if (error) return fromDb(error, "Não foi possível transferir.");
  refresh();
  return success("Transferência feita");
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Dê um nome para a categoria.").max(40),
  kind: z.enum(["entrada", "saida"]),
  icon: z
    .string()
    .optional()
    .transform((v) => (v && v in CATEGORY_ICONS ? v : "circle")),
  color,
  keywords: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export async function saveCategory(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { id, color: chosen, ...rest } = parsed.data;
  const values = { ...rest, color: chosen ?? null };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(values).eq("id", id)
    : await supabase.from("categories").insert(values);
  if (error) {
    if (error.code === "23505") return failure("Já existe uma categoria com esse nome.", { name: "Já existe uma categoria com esse nome." });
    return fromDb(error, "Não foi possível salvar a categoria.");
  }
  refresh();
  return success(id ? "Categoria salva" : "Categoria criada");
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fromDb(error, "Não foi possível apagar a categoria.");
  refresh();
  return success("Categoria apagada");
}

// ---------------------------------------------------------------------------
// Contas fixas
// ---------------------------------------------------------------------------

const billSchema = z
  .object({
    id: z.uuid().optional(),
    description: z.string().trim().min(1, "Descreva a conta fixa.").max(80),
    kind: z.enum(["entrada", "saida"]).default("saida"),
    amount: positiveMoney(),
    due_day: z.coerce.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
    owner_id: z.uuid("Escolha de quem é a conta."),
    account_id: optionalUuid,
    category_id: optionalUuid,
    start_month: monthInput,
    end_month: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(monthInput.optional()),
    active: z
      .string()
      .optional()
      .transform((v) => v !== "off"),
  })
  .refine((v) => !v.end_month || v.end_month >= v.start_month, {
    message: "O último mês precisa ser depois do primeiro.",
    path: ["end_month"],
  });

export async function saveBill(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = billSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { id, end_month, ...rest } = parsed.data;
  if (!(await requireMember(rest.owner_id))) return failure("Escolha uma pessoa da casa.");

  const supabase = await createClient();
  const values = { ...rest, end_month: end_month ?? null };
  const { error } = id
    ? await supabase.from("recurring_bills").update(values).eq("id", id)
    : await supabase.from("recurring_bills").insert(values);
  if (error) return fromDb(error, "Não foi possível salvar a conta fixa.");
  refresh();
  return success(id ? "Conta fixa salva" : "Conta fixa criada");
}

export async function deleteBill(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_bills").delete().eq("id", id);
  if (error) return fromDb(error, "Não foi possível apagar a conta fixa.");
  refresh();
  return success("Conta fixa apagada");
}

const paySchema = z.object({
  bill_id: z.uuid(),
  reference_month: z.string().regex(/^\d{4}-\d{2}-01$/),
  account_id: z.uuid("Escolha de qual conta saiu o dinheiro."),
  amount: positiveMoney(),
  occurred_on: isoDate,
});

export async function payBill(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = paySchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data: bill, error: billError } = await supabase
    .from("recurring_bills")
    .select("*")
    .eq("id", parsed.data.bill_id)
    .single();
  if (billError) return fromDb(billError, "Não encontrei essa conta fixa.");

  const amount = bill.kind === "saida" ? -parsed.data.amount : parsed.data.amount;
  const { error } = await supabase.from("transactions").insert({
    account_id: parsed.data.account_id,
    kind: bill.kind,
    amount,
    occurred_on: parsed.data.occurred_on,
    description: bill.description,
    category_id: bill.category_id,
    recurring_bill_id: bill.id,
    reference_month: parsed.data.reference_month,
  });
  if (error) {
    if (error.code === "23505") return failure("Essa conta já foi marcada como paga neste mês.");
    return fromDb(error, "Não foi possível marcar como pago.");
  }
  refresh();
  return success(bill.kind === "saida" ? "Pago" : "Recebido");
}

export async function unpayBill(transactionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .not("recurring_bill_id", "is", null);
  if (error) return fromDb(error, "Não foi possível desfazer o pagamento.");
  refresh();
  return success("Pagamento desfeito");
}

// ---------------------------------------------------------------------------
// Importação de extrato
// ---------------------------------------------------------------------------

const importSchema = z.object({
  account_id: z.uuid(),
  source: z.string().min(1).max(40),
  file_name: z.string().min(1).max(200),
  rows: z
    .array(
      z.object({
        occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().min(1).max(200),
        amount: z.number().refine((n) => n !== 0),
        externalId: z.string().min(1).max(300),
        categoryId: z.uuid().nullable(),
      }),
    )
    .min(1, "Escolha pelo menos uma linha para importar.")
    .max(5000, "Importe no máximo 5.000 linhas por vez."),
  final_balance: z.number().nullable(),
});

export type ImportPayload = z.input<typeof importSchema>;

// IDs de extrato que já existem na conta, para marcar na tela de revisão.
export async function findImported(accountId: string, externalIds: string[]): Promise<string[]> {
  if (!z.uuid().safeParse(accountId).success || externalIds.length === 0) return [];
  const supabase = await createClient();
  const found: string[] = [];
  for (let i = 0; i < externalIds.length; i += 200) {
    const { data } = await supabase
      .from("transactions")
      .select("external_id")
      .eq("account_id", accountId)
      .in("external_id", externalIds.slice(i, i + 200));
    for (const r of data ?? []) if (r.external_id) found.push(r.external_id);
  }
  return found;
}

export async function importStatement(payload: ImportPayload): Promise<ActionResult> {
  const parsed = importSchema.safeParse(payload);
  if (!parsed.success) return fromZod(parsed.error);
  const { account_id, source, file_name, rows, final_balance } = parsed.data;

  const supabase = await createClient();

  // Linhas já importadas antes (mesmo ID na mesma conta) ficam de fora.
  const existing = new Set<string>();
  const ids = rows.map((r) => r.externalId);
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("transactions")
      .select("external_id")
      .eq("account_id", account_id)
      .in("external_id", ids.slice(i, i + 200));
    if (error) return fromDb(error, "Não foi possível conferir o que já foi importado.");
    for (const r of data) if (r.external_id) existing.add(r.external_id);
  }
  const fresh = rows.filter((r) => !existing.has(r.externalId));
  if (fresh.length === 0) return success("Nada novo: todas as linhas já tinham sido importadas");

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({ account_id, source, file_name, row_count: fresh.length })
    .select("id")
    .single();
  if (batchError) return fromDb(batchError, "Não foi possível registrar a importação.");

  const { error } = await supabase.from("transactions").insert(
    fresh.map((r) => ({
      account_id,
      kind: r.amount > 0 ? ("entrada" as const) : ("saida" as const),
      amount: r.amount,
      occurred_on: r.occurredOn,
      description: r.description,
      category_id: r.categoryId,
      external_id: r.externalId,
      import_batch_id: batch.id,
    })),
  );
  if (error) {
    await supabase.from("import_batches").delete().eq("id", batch.id);
    return fromDb(error, "Não foi possível importar as linhas.");
  }

  // Se o extrato informa o saldo final, a conta passa a bater com ele.
  if (final_balance !== null) {
    const { data: current } = await supabase
      .from("account_balances")
      .select("balance")
      .eq("account_id", account_id)
      .single();
    const diff = current ? round2(final_balance - Number(current.balance)) : 0;
    if (diff !== 0) {
      const lastDate = fresh.map((r) => r.occurredOn).sort().at(-1)!;
      await supabase.from("transactions").insert({
        account_id,
        kind: "ajuste",
        amount: diff,
        occurred_on: lastDate,
        description: "Ajuste de saldo (extrato importado)",
        import_batch_id: batch.id,
      });
    }
  }

  refresh();
  const skipped = rows.length - fresh.length;
  return success(
    skipped > 0 ? `${fresh.length} importadas, ${skipped} já existiam` : `${fresh.length} movimentações importadas`,
  );
}

export async function undoImport(batchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Os lançamentos do lote somem junto (on delete cascade).
  const { error } = await supabase.from("import_batches").delete().eq("id", batchId);
  if (error) return fromDb(error, "Não foi possível desfazer a importação.");
  refresh();
  return success("Importação desfeita");
}

// ---------------------------------------------------------------------------
// Contexto da importação: o que já existe na conta e as contas fixas atuais
// ---------------------------------------------------------------------------

export type ImportContext = {
  importedIds: string[];
  // Lançamentos da conta de 12 meses antes do arquivo até um dia depois dele.
  existing: {
    occurredOn: string;
    amount: number;
    description: string;
    externalId: string | null;
    categoryId: string | null;
  }[];
  billDescriptions: string[];
};

export async function loadImportContext(
  accountId: string,
  externalIds: string[],
  from: string,
  to: string,
): Promise<ImportContext> {
  const parsed = z
    .object({
      accountId: z.uuid(),
      externalIds: z.array(z.string().max(300)).max(6000),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse({ accountId, externalIds, from, to });
  if (!parsed.success) return { importedIds: [], existing: [], billDescriptions: [] };

  const supabase = await createClient();
  const [importedIds, history, bills] = await Promise.all([
    findImported(parsed.data.accountId, parsed.data.externalIds),
    getTransactions({
      from: addMonths(monthOf(parsed.data.from), -12),
      to: addDaysIso(parsed.data.to, 1),
      accountIds: [parsed.data.accountId],
    }),
    supabase.from("recurring_bills").select("description"),
  ]);

  return {
    importedIds,
    existing: history
      .filter((t) => t.kind === "entrada" || t.kind === "saida")
      .map((t) => ({
        occurredOn: t.occurred_on,
        amount: t.amount,
        description: t.description,
        externalId: t.external_id,
        categoryId: t.category_id,
      })),
    billDescriptions: (bills.data ?? []).map((b) => b.description),
  };
}

function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Resetar extrato (por mês, por conta, ou tudo)
// ---------------------------------------------------------------------------

const resetSchema = z.object({
  accountId: z.uuid().nullable(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/)
    .nullable(),
});

export type ResetScope = z.input<typeof resetSchema>;

// Quantos lançamentos seriam apagados (não apaga nada).
export async function previewResetStatement(scope: ResetScope): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const parsed = resetSchema.safeParse(scope);
  if (!parsed.success) return { ok: false, error: "Escolha o mês e a conta de novo." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_statement", {
    p_account_id: parsed.data.accountId,
    p_month: parsed.data.month,
    p_dry_run: true,
  });
  if (error) return { ok: false, error: `Não foi possível contar os lançamentos (${error.message}).` };
  return { ok: true, count: data };
}

export async function resetStatement(scope: ResetScope): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(scope);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_statement", {
    p_account_id: parsed.data.accountId,
    p_month: parsed.data.month,
  });
  if (error) return fromDb(error, "Não foi possível resetar o extrato.");
  refresh();
  return success(data === 0 ? "Não havia nada para apagar" : `${data} ${data === 1 ? "lançamento apagado" : "lançamentos apagados"}`);
}
