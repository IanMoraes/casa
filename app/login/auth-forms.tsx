"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";

import { FormField, SubmitButton, TextInput } from "@/components/forms/fields";
import { PasswordInput } from "@/components/forms/password-input";
import { useActionForm } from "@/components/forms/use-action-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp } from "@/lib/actions/auth";

export function AuthForms({ defaultTab }: { defaultTab: "entrar" | "criar" }) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="w-full">
        <TabsTrigger value="entrar">Entrar</TabsTrigger>
        <TabsTrigger value="criar">Criar conta</TabsTrigger>
      </TabsList>
      <TabsContent value="entrar" className="mt-6">
        <SignInForm />
      </TabsContent>
      <TabsContent value="criar" className="mt-6">
        <SignUpForm />
      </TabsContent>
    </Tabs>
  );
}

function SignInForm() {
  const form = useActionForm(signIn, { toastOnSuccess: false });
  return (
    <form onSubmit={form.onSubmit}>
      <FieldGroup>
        <FormField label="E-mail" htmlFor="in-email" error={form.errorFor("email")}>
          <TextInput id="in-email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </FormField>
        <FormField label="Senha" htmlFor="in-password" error={form.errorFor("password")}>
          <PasswordInput id="in-password" name="password" autoComplete="current-password" required />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          Entrar
        </SubmitButton>
        <Link
          href="/recuperar-senha"
          className="self-center text-sm text-primary underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </FieldGroup>
    </form>
  );
}

function SignUpForm() {
  const form = useActionForm(signUp, { toastOnSuccess: false });

  if (form.state?.ok) {
    return (
      <Alert>
        <MailCheckIcon />
        <AlertTitle>Confira seu e-mail</AlertTitle>
        <AlertDescription>{form.state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={form.onSubmit}>
      <FieldGroup>
        <FormField label="Como você quer ser chamado" htmlFor="up-name" error={form.errorFor("name")}>
          <TextInput id="up-name" name="name" autoComplete="given-name" required />
        </FormField>
        <FormField label="E-mail" htmlFor="up-email" error={form.errorFor("email")}>
          <TextInput id="up-email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </FormField>
        <FormField
          label="Senha"
          htmlFor="up-password"
          description="Pelo menos 8 caracteres."
          error={form.errorFor("password")}
        >
          <PasswordInput id="up-password" name="password" autoComplete="new-password" minLength={8} required />
        </FormField>
        <FormField label="Repita a senha" htmlFor="up-confirm" error={form.errorFor("confirm")}>
          <PasswordInput id="up-confirm" name="confirm" autoComplete="new-password" required />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          Criar conta
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
