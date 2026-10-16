"use client";

import { CheckIcon, CopyIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";

import type { MemberOption } from "@/components/finance/types";
import { ColorField, FormField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { renameHousehold, updateMember } from "@/lib/actions/household";

export function SettingsView({
  householdName,
  inviteCode,
  members,
  meId,
}: {
  householdName: string;
  inviteCode: string;
  members: MemberOption[];
  meId: string;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Section title="Tema" description="Vale só para este aparelho.">
        <ThemePicker />
      </Section>

      <Section title="Pessoas" description="O nome e a cor aparecem nos filtros, nas contas e nas tarefas.">
        <div className="flex flex-col gap-8">
          {members.map((m) => (
            <MemberForm key={m.user_id} member={m} isMe={m.user_id === meId} />
          ))}
        </div>
      </Section>

      <Section title="Casa">
        <HouseholdForm name={householdName} />
      </Section>

      {members.length < 2 ? (
        <Section
          title="Convidar"
          description="Quem for entrar cria a conta com e-mail e senha, escolhe Tenho um convite e digita este código."
        >
          <InviteCode code={inviteCode} />
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card-surface grid min-w-0 gap-4 p-4 md:p-5 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={theme ?? "system"}
      onValueChange={(v) => v && setTheme(v)}
      aria-label="Tema"
      className="w-full *:flex-1 sm:w-fit"
    >
      <ToggleGroupItem value="light">
        <SunIcon /> Claro
      </ToggleGroupItem>
      <ToggleGroupItem value="dark">
        <MoonIcon /> Escuro
      </ToggleGroupItem>
      <ToggleGroupItem value="system">
        <MonitorIcon /> <span className="sm:hidden">Auto</span>
        <span className="hidden sm:inline">Igual ao aparelho</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function MemberForm({ member, isMe }: { member: MemberOption; isMe: boolean }) {
  const form = useActionForm(updateMember);
  return (
    <form onSubmit={form.onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="user_id" value={member.user_id} />
      <div className="flex items-center gap-3">
        <PersonAvatar name={member.display_name} color={member.color} src={member.avatar_url} className="size-9" />
        <p className="font-medium">
          {member.display_name}
          {isMe ? <span className="ml-1 text-sm font-normal text-muted-foreground">(você)</span> : null}
        </p>
      </div>
      <FieldGroup>
        <FormField label="Nome" htmlFor={`name-${member.user_id}`} error={form.errorFor("display_name")}>
          <TextInput id={`name-${member.user_id}`} name="display_name" defaultValue={member.display_name} required />
        </FormField>
        <ColorField name="color" label="Cor" defaultValue={member.color} />
        <SubmitButton pending={form.pending} variant="outline" className="self-start">
          Salvar {member.display_name}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

function HouseholdForm({ name }: { name: string }) {
  const form = useActionForm(renameHousehold);
  return (
    <form onSubmit={form.onSubmit}>
      <FieldGroup>
        <FormField label="Nome da casa" htmlFor="house-name" error={form.errorFor("name")}>
          <TextInput id="house-name" name="name" defaultValue={name} required />
        </FormField>
        <SubmitButton pending={form.pending} variant="outline" className="self-start">
          Salvar nome
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-lg border bg-surface px-4 py-2 text-xl font-semibold tracking-[0.25em] tabular">{code}</span>
      <Button
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copiado" : "Copiar código"}
      </Button>
    </div>
  );
}
