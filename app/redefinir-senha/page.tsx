import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";
import { getUserProfile } from "@/lib/data/session";

import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nova senha" };

// Chega aqui pelo link do e-mail (o callback já abriu a sessão) ou logado.
export default async function NewPasswordPage() {
  const profile = await getUserProfile();

  return (
    <AuthShell title="Crie uma senha nova" subtitle={`Para a conta ${profile.email}.`}>
      <NewPasswordForm />
      <Link href="/" className="mt-5 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
        Voltar sem trocar
      </Link>
    </AuthShell>
  );
}
