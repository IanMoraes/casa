"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import { formToObject } from "./form";
import { failure, fromZod, success, type ActionResult } from "./result";

const MIN_PASSWORD = 8;

const email = z.email({ error: "Informe um e-mail válido." }).transform((v) => v.trim().toLowerCase());
const password = z
  .string({ error: "Informe a senha." })
  .min(MIN_PASSWORD, `Use pelo menos ${MIN_PASSWORD} caracteres.`)
  .max(72, "Use até 72 caracteres.");

// Endereço público do app, para os links que vão por e-mail.
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function fromAuth(error: AuthError) {
  switch (error.code) {
    case "invalid_credentials":
      return failure("E-mail ou senha incorretos.");
    case "email_not_confirmed":
      return failure("Confirme o e-mail antes de entrar: o link está na sua caixa de entrada (veja também o spam).");
    case "user_already_exists":
      return failure("Já existe uma conta com esse e-mail. Entre ou use Esqueci minha senha.", {
        email: "Já existe uma conta com esse e-mail.",
      });
    case "weak_password":
      return failure("Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.", {
        password: "Senha fraca. Misture letras e números.",
      });
    case "same_password":
      return failure("A nova senha precisa ser diferente da atual.", { password: "Use uma senha diferente da atual." });
    case "email_address_invalid":
      return failure("Esse e-mail não foi aceito. Confira se está certo.", { email: "Confira o e-mail." });
    case "over_email_send_rate_limit":
      return failure("Muitos e-mails enviados agora há pouco. Espere alguns minutos e tente de novo.");
    case "over_request_rate_limit":
      return failure("Muitas tentativas seguidas. Espere um minuto e tente de novo.");
    case "signup_disabled":
      return failure("Cadastros estão desligados no Supabase (Authentication → Sign In / Providers → Email).");
    default:
      return failure(`Não foi possível concluir: ${error.message}`);
  }
}

const signInSchema = z.object({ email, password: z.string().min(1, "Informe a senha.") });

export async function signIn(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fromAuth(error);
  redirect("/");
}

const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Diga como você quer ser chamado.").max(40, "Use até 40 letras."),
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não são iguais.", path: ["confirm"] });

export async function signUp(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  });
  if (error) return fromAuth(error);

  // Com confirmação de e-mail ligada, um e-mail já cadastrado volta sem erro
  // e sem identidades (o Supabase não revela que a conta existe).
  if (data.user && data.user.identities?.length === 0) {
    return failure("Já existe uma conta com esse e-mail. Entre ou use Esqueci minha senha.", {
      email: "Já existe uma conta com esse e-mail.",
    });
  }

  // Confirmação desligada: a sessão já vem pronta.
  if (data.session) redirect("/bem-vindo");

  return success(`Enviamos um link de confirmação para ${parsed.data.email}. Abra o link neste aparelho para entrar.`);
}

const resetSchema = z.object({ email });

export async function requestPasswordReset(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/redefinir-senha`,
  });
  if (error && error.code !== "user_not_found") return fromAuth(error);

  // A mesma resposta exista ou não a conta, para não revelar quem tem cadastro.
  return success(`Se houver uma conta com ${parsed.data.email}, o link para criar uma nova senha chega em instantes.`);
}

const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "As senhas não são iguais.", path: ["confirm"] });

export async function updatePassword(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fromAuth(error);
  redirect("/");
}
