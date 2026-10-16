"use client";

import { FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField, InviteCodeInput, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { createHousehold, joinHousehold } from "@/lib/actions/household";

export function Onboarding({ defaultName }: { defaultName: string }) {
  const create = useActionForm(createHousehold, { toastOnSuccess: false });
  const join = useActionForm(joinHousehold, { toastOnSuccess: false });

  return (
    <Tabs defaultValue="criar">
      <TabsList className="w-full">
        <TabsTrigger value="criar">Criar a casa</TabsTrigger>
        <TabsTrigger value="entrar">Tenho um convite</TabsTrigger>
      </TabsList>

      <TabsContent value="criar" className="mt-6">
        <form onSubmit={create.onSubmit}>
          <FieldGroup>
            <FormField label="Como você quer ser chamado" htmlFor="c-name" error={create.errorFor("display_name")}>
              <TextInput id="c-name" name="display_name" defaultValue={defaultName} autoComplete="given-name" required />
            </FormField>
            <FormField
              label="Nome da casa"
              htmlFor="c-house"
              description="Aparece no topo do menu. Dá para mudar depois."
              error={create.errorFor("household_name")}
            >
              <TextInput id="c-house" name="household_name" placeholder="Nossa casa" />
            </FormField>
            <SubmitButton pending={create.pending} className="w-full">
              Criar a casa
            </SubmitButton>
          </FieldGroup>
        </form>
      </TabsContent>

      <TabsContent value="entrar" className="mt-6">
        <form onSubmit={join.onSubmit}>
          <FieldGroup>
            <FormField label="Como você quer ser chamado" htmlFor="j-name" error={join.errorFor("display_name")}>
              <TextInput id="j-name" name="display_name" defaultValue={defaultName} autoComplete="given-name" required />
            </FormField>
            <FormField
              label="Código de convite"
              htmlFor="j-code"
              description="Está em Configurações, no app de quem criou a casa."
              error={join.errorFor("invite_code")}
            >
              <InviteCodeInput id="j-code" name="invite_code" invalid={Boolean(join.errorFor("invite_code"))} required />
            </FormField>
            <SubmitButton pending={join.pending} className="w-full">
              Entrar na casa
            </SubmitButton>
          </FieldGroup>
        </form>
      </TabsContent>
    </Tabs>
  );
}
