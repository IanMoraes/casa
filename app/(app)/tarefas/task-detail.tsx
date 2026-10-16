"use client";

import { CheckIcon, ListChecksIcon, Loader2Icon, PlusIcon, RotateCcwIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";

import type { MemberOption } from "@/components/finance/types";
import { FormField, SelectField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addTaskItem, deleteTaskItem, saveTask, setTaskDone, updateTaskItem } from "@/lib/actions/tasks";
import type { Tables } from "@/lib/database.types";
import { positionAtEnd } from "@/lib/tasks/position";
import { cn } from "@/lib/utils";

type Task = Tables<"tasks">;
type Item = Tables<"task_items">;
type Lane = { id: string; name: string };

export const LABEL_COLORS = ["#E03131", "#F76707", "#F59F00", "#37B24D", "#0078C8", "#7950F2", "#E64980"];

function report(result: { ok: boolean; error?: string } | null) {
  if (result && !result.ok) toast.error(result.error);
}

// Detalhe da tarefa (como o cartão aberto do Trello): dados, etiqueta e checklist.
export function TaskDetail({
  task,
  items,
  lanes,
  members,
  onClose,
  onDelete,
}: {
  task: Task;
  items: Item[];
  lanes: Lane[];
  members: MemberOption[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const form = useActionForm(saveTask, { onSuccess: onClose });
  const [label, setLabel] = useState(task.label_color ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6 pb-2">
      <form onSubmit={form.onSubmit}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="label_color" value={label} />
        <FieldGroup>
          <FormField label="Tarefa" htmlFor="td-title" error={form.errorFor("title")}>
            <TextInput id="td-title" name="title" defaultValue={task.title} className="text-base font-semibold" required />
          </FormField>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Etiqueta</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLabel("")}
                aria-pressed={label === ""}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-semibold",
                  label === "" ? "border-foreground" : "text-muted-foreground",
                )}
              >
                Nenhuma
              </button>
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setLabel(c)}
                  aria-pressed={label === c}
                  aria-label={`Etiqueta ${c}`}
                  className={cn(
                    "h-8 w-12 rounded-full ring-offset-2 ring-offset-background",
                    label === c && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Lista" htmlFor="td-lane">
              <SelectField
                id="td-lane"
                name="lane_id"
                defaultValue={task.lane_id}
                options={lanes.map((l) => ({ value: l.id, label: l.name }))}
              />
            </FormField>
            <FormField label="Quem faz" htmlFor="td-assignee">
              <SelectField
                id="td-assignee"
                name="assignee_id"
                defaultValue={task.assignee_id ?? "none"}
                options={[{ value: "none", label: "Ninguém" }, ...members.map((m) => ({ value: m.user_id, label: m.display_name }))]}
              />
            </FormField>
            <FormField label="Prazo" htmlFor="td-due" error={form.errorFor("due_on")}>
              <TextInput id="td-due" name="due_on" type="date" defaultValue={task.due_on ?? ""} />
            </FormField>
          </div>

          <FormField label="Descrição" htmlFor="td-notes">
            <Textarea
              id="td-notes"
              name="notes"
              defaultValue={task.notes ?? ""}
              rows={3}
              placeholder="Detalhes, links, onde comprar…"
            />
          </FormField>

          <SubmitButton pending={form.pending} className="w-full sm:w-auto sm:self-end">
            Salvar alterações
          </SubmitButton>
        </FieldGroup>
      </form>

      <Checklist taskId={task.id} items={items} />

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          variant={task.done ? "outline" : "secondary"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setTaskDone(task.id, !task.done);
              report(result);
              if (result?.ok) {
                toast.success(result.message);
                onClose();
              }
            })
          }
          className={cn(!task.done && "bg-income-soft text-income-foreground hover:bg-income-soft/80")}
        >
          {task.done ? <RotateCcwIcon /> : <CheckIcon />}
          {task.done ? "Reabrir tarefa" : "Concluir tarefa"}
        </Button>
        <Button variant="destructive" onClick={onDelete} className="ml-auto">
          <Trash2Icon /> Apagar
        </Button>
      </div>
    </div>
  );
}

function Checklist({ taskId, items: serverItems }: { taskId: string; items: Item[] }) {
  // Cópia local para a marcação aparecer na hora; o servidor confirma depois.
  const [items, setItems] = useState(serverItems);
  const [source, setSource] = useState(serverItems);
  if (source !== serverItems) {
    setSource(serverItems);
    setItems(serverItems);
  }
  const [draft, setDraft] = useState("");
  const [adding, startAdding] = useTransition();
  const [, startTransition] = useTransition();

  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  function add() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    startAdding(async () => report(await addTaskItem(taskId, title, positionAtEnd(items))));
  }

  function toggle(item: Item, value: boolean) {
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, done: value } : i)));
    startTransition(async () => report(await updateTaskItem(item.id, { done: value })));
  }

  function remove(item: Item) {
    setItems((list) => list.filter((i) => i.id !== item.id));
    startTransition(async () => report(await deleteTaskItem(item.id)));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <section aria-labelledby="checklist-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ListChecksIcon className="size-5 text-muted-foreground" aria-hidden />
        <h3 id="checklist-title" className="flex-1 font-bold">
          Checklist
        </h3>
        {items.length > 0 ? (
          <span className={cn("text-sm font-semibold tabular", pct === 100 ? "text-income-foreground" : "text-muted-foreground")}>
            {done}/{items.length}
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="w-9 text-xs text-muted-foreground tabular">{pct}%</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-[width]", pct === 100 ? "bg-income" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-muted">
            <Checkbox
              id={`item-${item.id}`}
              checked={item.done}
              onCheckedChange={(v) => toggle(item, Boolean(v))}
              className="size-5"
            />
            <label
              htmlFor={`item-${item.id}`}
              className={cn("min-w-0 flex-1 cursor-pointer text-sm break-words", item.done && "text-muted-foreground line-through")}
            >
              {item.title}
            </label>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(item)}
              className="text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              aria-label={`Apagar ${item.title}`}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Adicionar um item"
          aria-label="Nova subtarefa"
          maxLength={200}
        />
        <Button type="button" onClick={add} disabled={adding || !draft.trim()} variant="outline">
          {adding ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
          Adicionar
        </Button>
      </div>
    </section>
  );
}
