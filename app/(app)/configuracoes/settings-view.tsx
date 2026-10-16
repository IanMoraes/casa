"use client";

import {
  CheckIcon,
  CopyIcon,
  CrownIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UserMinusIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";

import type { MemberOption } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { ColorField, FormField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { leaveHousehold, removeMember, renameHousehold, updateMember } from "@/lib/actions/household";

export function SettingsView({
  householdName,
  inviteCode,
  members,
  meId,
  ownerId,
}: {
  householdName: string;
  inviteCode: string;
  members: MemberOption[];
  meId: string;
  ownerId: string | null;
}) {
  const [removing, setRemoving] = useState<MemberOption | null>(null);
  const [leaving, setLeaving] = useState(false);
  const others = members.filter((m) => m.user_id !== meId);
  const alone = others.length === 0;
  const isOwner = ownerId === meId;

  const leaveText = alone
    ? "Você é a única pessoa da casa: sair apaga a casa e todos os dados dela (contas, extrato, contas fixas e tarefas). Não dá para desfazer."
    : [
        "Você perde o acesso à casa.",
        "Suas contas, cofrinhos e contas fixas são apagados junto, com o histórico deles.",
        `O resto continua com ${others.map((o) => o.display_name).join(" e ")}.`,
        isOwner ? `Quem passa a administrar a casa é ${others[0].display_name}.` : "",
        "Para voltar, você precisa de um novo convite.",
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Section title="Tema" description="Vale só para este aparelho.">
        <ThemePicker />
      </Section>

      <Section title="Pessoas" description="O nome e a cor aparecem nos filtros, nas contas e nas tarefas.">
        <div className="flex flex-col gap-8">
          {members.map((m) => (
            <MemberForm
              key={m.user_id}
              member={m}
              isMe={m.user_id === meId}
              isOwner={m.user_id === ownerId}
              canRemove={isOwner && m.user_id !== meId}
              onRemove={() => setRemoving(m)}
            />
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

      <Section title="Sair da casa" description={leaveText}>
        <Button variant="destructive" onClick={() => setLeaving(true)}>
          <LogOutIcon /> Sair da casa
        </Button>
      </Section>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing ? `Remover ${removing.display_name} da casa?` : ""}
        description={
          removing
            ? `${removing.display_name} perde o acesso à casa. As contas, cofrinhos e contas fixas dessa pessoa são apagados junto, com o histórico deles, e as tarefas dela ficam sem responsável. Para voltar, a pessoa precisa de um novo convite.`
            : ""
        }
        confirmLabel="Remover da casa"
        action={() => (removing ? removeMember(removing.user_id) : Promise.resolve(null))}
      />

      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title={alone ? "Sair e apagar a casa?" : "Sair da casa?"}
        description={leaveText}
        confirmLabel={alone ? "Sair e apagar tudo" : "Sair da casa"}
        action={leaveHousehold}
      />
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

// Três opções do mesmo tamanho, com rótulos curtos que cabem em qualquer tela.
function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={theme ?? "system"}
      onValueChange={(v) => v && setTheme(v)}
      aria-label="Tema"
      className="grid w-full max-w-md grid-cols-3"
    >
      <ToggleGroupItem value="light" className="min-w-0 px-2 max-sm:[&_svg]:hidden">
        <SunIcon /> Claro
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" className="min-w-0 px-2 max-sm:[&_svg]:hidden">
        <MoonIcon /> Escuro
      </ToggleGroupItem>
      <ToggleGroupItem value="system" className="min-w-0 px-2 max-sm:[&_svg]:hidden" title="Igual ao tema do aparelho">
        <MonitorIcon /> <span className="sm:hidden">Sistema</span>
        <span className="hidden truncate sm:inline">Automático</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function MemberForm({
  member,
  isMe,
  isOwner,
  canRemove,
  onRemove,
}: {
  member: MemberOption;
  isMe: boolean;
  isOwner: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const form = useActionForm(updateMember);
  return (
    <form onSubmit={form.onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="user_id" value={member.user_id} />
      <div className="flex flex-wrap items-center gap-3">
        <PersonAvatar name={member.display_name} color={member.color} src={member.avatar_url} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {member.display_name}
            {isMe ? <span className="ml-1 text-sm font-normal text-muted-foreground">(você)</span> : null}
          </p>
          {isOwner ? (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              <CrownIcon className="size-3" aria-hidden /> Criou a casa
            </span>
          ) : null}
        </div>
        {canRemove ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            <UserMinusIcon /> Remover da casa
          </Button>
        ) : null}
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
