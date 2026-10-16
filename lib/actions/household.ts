"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getHousehold, getUserId } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";

import { color, formToObject } from "./form";
import { failure, fromDb, fromZod, success, type ActionResult } from "./result";

const displayName = z.string().trim().min(1, "Diga como você quer ser chamado.").max(40, "Use até 40 letras.");

const createSchema = z.object({
  household_name: z.string().trim().max(80).optional(),
  display_name: displayName,
});

export async function createHousehold(_: ActionResult, formData: FormData): Promise<ActionResult> {
  await getUserId();
  const parsed = createSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: parsed.data.household_name ?? "",
    p_display_name: parsed.data.display_name,
  });
  if (error) return fromDb(error, "Não foi possível criar a casa.");
  redirect("/");
}

const joinSchema = z.object({
  invite_code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{8}$/, "O código tem 8 letras e números."),
  display_name: displayName,
});

export async function joinHousehold(_: ActionResult, formData: FormData): Promise<ActionResult> {
  await getUserId();
  const parsed = joinSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", {
    p_invite_code: parsed.data.invite_code,
    p_display_name: parsed.data.display_name,
  });
  if (error) return fromDb(error, "Não foi possível entrar na casa.");
  redirect("/");
}

const memberSchema = z.object({
  user_id: z.uuid(),
  display_name: displayName,
  color,
});

export async function updateMember(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await getHousehold();
  const parsed = memberSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("household_members")
    .update({ display_name: parsed.data.display_name, ...(parsed.data.color ? { color: parsed.data.color } : {}) })
    .eq("household_id", ctx.household.id)
    .eq("user_id", parsed.data.user_id);
  if (error) return fromDb(error, "Não foi possível salvar.");
  revalidatePath("/", "layout");
  return success("Salvo");
}

const householdSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a casa.").max(80),
});

export async function renameHousehold(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await getHousehold();
  const parsed = householdSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("households").update({ name: parsed.data.name }).eq("id", ctx.household.id);
  if (error) return fromDb(error, "Não foi possível salvar.");
  revalidatePath("/", "layout");
  return success("Salvo");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Sair da casa. Se for a última pessoa, a casa é apagada.
export async function leaveHousehold(): Promise<ActionResult> {
  await getHousehold();
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_household");
  if (error) return fromDb(error, "Não foi possível sair da casa.");
  revalidatePath("/", "layout");
  redirect("/bem-vindo");
}

// Remover outra pessoa. Só quem criou a casa (o banco confere).
export async function removeMember(userId: string): Promise<ActionResult> {
  const ctx = await getHousehold();
  if (!z.uuid().safeParse(userId).success) return failure("Pessoa inválida. Recarregue a página.");
  if (ctx.household.owner_id !== ctx.userId) return failure("Só quem criou a casa pode remover pessoas.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_household_member", { p_user_id: userId });
  if (error) return fromDb(error, "Não foi possível remover a pessoa.");
  revalidatePath("/", "layout");
  return success("Pessoa removida da casa");
}
