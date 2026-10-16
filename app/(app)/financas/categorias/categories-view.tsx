"use client";

import { MoreVerticalIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import type { CategoryOption } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { ColorField, FormField, IconField, SubmitButton, TextInput } from "@/components/forms/fields";
import { IconBubble } from "@/components/finance/category-badge";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import { deleteCategory, saveCategory } from "@/lib/actions/finance";
import { NEUTRAL_COLOR, categoryIcon } from "@/lib/categories";
import type { CategoryKind } from "@/lib/database.types";

type DialogState =
  | { type: "new"; kind: CategoryKind }
  | { type: "edit"; category: CategoryOption }
  | { type: "delete"; category: CategoryOption }
  | null;

export function CategoriesView({ categories }: { categories: CategoryOption[] }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {(["saida", "entrada"] as const).map((kind) => (
          <section key={kind} aria-labelledby={`cat-${kind}`} className="min-w-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 id={`cat-${kind}`} className="font-bold">
                {kind === "saida" ? "Saídas" : "Entradas"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setDialog({ type: "new", kind })}>
                <PlusIcon /> Nova
              </Button>
            </div>
            <ul className="card-surface divide-y overflow-hidden">
              {categories
                .filter((c) => c.kind === kind)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5 pr-1 pl-3">
                    <IconBubble icon={categoryIcon(c.icon)} color={c.color ?? NEUTRAL_COLOR} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      {c.keywords.length > 0 ? (
                        <p className="truncate text-sm text-muted-foreground">{c.keywords.join(", ")}</p>
                      ) : null}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Ações de ${c.name}`}>
                          <MoreVerticalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setDialog({ type: "edit", category: c })}>Editar</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ type: "delete", category: c })}>
                          Apagar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      <ResponsiveDialog
        open={dialog?.type === "new" || dialog?.type === "edit"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "edit" ? "Editar categoria" : "Nova categoria"}
      >
        {dialog?.type === "new" || dialog?.type === "edit" ? (
          <CategoryForm
            category={dialog.type === "edit" ? dialog.category : undefined}
            kind={dialog.type === "edit" ? dialog.category.kind : dialog.kind}
            onDone={close}
          />
        ) : null}
      </ResponsiveDialog>

      <ConfirmDialog
        open={dialog?.type === "delete"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "delete" ? `Apagar ${dialog.category.name}?` : ""}
        description="As movimentações dessa categoria ficam sem categoria; nada é apagado delas."
        confirmLabel="Apagar categoria"
        action={() => (dialog?.type === "delete" ? deleteCategory(dialog.category.id) : Promise.resolve(null))}
      />
    </>
  );
}

function CategoryForm({ category, kind, onDone }: { category?: CategoryOption; kind: CategoryKind; onDone: () => void }) {
  const form = useActionForm(saveCategory, { onSuccess: onDone });
  return (
    <form onSubmit={form.onSubmit}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      <FieldGroup>
        <FormField label="Nome" htmlFor="cat-name" error={form.errorFor("name")}>
          <TextInput id="cat-name" name="name" defaultValue={category?.name} required />
        </FormField>
        <IconField name="icon" label="Ícone" defaultValue={category?.icon} />
        <ColorField name="color" label="Cor" defaultValue={category?.color} />
        <FormField
          label="Palavras-chave"
          htmlFor="cat-keywords"
          description="Separadas por vírgula. Ex.: ifood, restaurante, padaria"
        >
          <TextInput id="cat-keywords" name="keywords" defaultValue={category?.keywords.join(", ")} />
        </FormField>
        <SubmitButton pending={form.pending} className="w-full">
          {category ? "Salvar categoria" : "Criar categoria"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
