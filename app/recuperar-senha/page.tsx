import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";

import { ResetRequestForm } from "./reset-request-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe o e-mail da conta. Mandamos um link para você criar uma senha nova."
    >
      <ResetRequestForm />
      <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
        Voltar para entrar
      </Link>
    </AuthShell>
  );
}
