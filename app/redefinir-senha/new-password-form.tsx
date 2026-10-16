"use client";

import { FormField, SubmitButton } from "@/components/forms/fields";
import { PasswordInput } from "@/components/forms/password-input";
import { useActionForm } from "@/components/forms/use-action-form";
import { FieldGroup } from "@/components/ui/field";
import { updatePassword } from "@/lib/actions/auth";

export function NewPasswordForm() {
  const form = useActionForm(updatePassword, { toastOnSuccess: false });
  return (
    <form onSubmit={form.onSubmit}>
      <FieldGroup>
        <FormField label="Senha nova" htmlFor="np-password" description="Pelo menos 8 caracteres." error={form.errorFor("password")}>
          <PasswordInput id="np-password" name="password" autoComplete="new-password" minLength={8} autoFocus required />
        </FormField>
        <FormField label="Repita a senha nova" htmlFor="np-confirm" error={form.errorFor("confirm")}>
          <PasswordInput id="np-confirm" name="confirm" autoComplete="new-password" required />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          Salvar senha nova
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
