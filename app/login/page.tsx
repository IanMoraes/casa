import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/shell/auth-shell";
import { createClient } from "@/lib/supabase/server";

import { AuthForms } from "./auth-forms";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  link: "Esse link não abriu uma sessão. Se você acabou de confirmar o e-mail, a conta já está ativa: entre com e-mail e senha.",
  expirado: "O link expirou ou já foi usado. Peça um novo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/");

  const { erro, modo } = await searchParams;
  const error = typeof erro === "string" ? (ERRORS[erro] ?? ERRORS.link) : null;

  return (
    <AuthShell title="Casa" subtitle="As contas, os gastos e as tarefas de vocês dois, no mesmo lugar.">
      {error ? (
        <p role="alert" className="mb-4 rounded-xl bg-destructive-soft p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <AuthForms defaultTab={modo === "cadastro" ? "criar" : "entrar"} />
    </AuthShell>
  );
}
