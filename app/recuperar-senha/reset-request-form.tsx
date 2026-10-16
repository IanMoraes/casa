"use client";

import { MailCheckIcon } from "lucide-react";

import { FormField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import { requestPasswordReset } from "@/lib/actions/auth";

export function ResetRequestForm() {
  const form = useActionForm(requestPasswordReset, { toastOnSuccess: false });

  if (form.state?.ok) {
    return (
      <Alert>
        <MailCheckIcon />
        <AlertTitle>Confira seu e-mail</AlertTitle>
        <AlertDescription>{form.state.message} Abra o link neste aparelho.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={form.onSubmit}>
      <FieldGroup>
        <FormField label="E-mail" htmlFor="reset-email" error={form.errorFor("email")}>
          <TextInput id="reset-email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          Enviar link
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
