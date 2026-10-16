"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import { color, formToObject, optionalText, optionalUuid } from "./form";
import { fromDb, fromZod, success, type ActionResult } from "./result";

function refresh() {
  revalidatePath("/tarefas");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Listas (lanes)
// ---------------------------------------------------------------------------

const laneSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Dê um nome para a lista.").max(40, "Use até 40 letras."),
  color,
  position: z.coerce.number().optional(),
});

export async function saveLane(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = laneSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { id, name, color, position } = parsed.data;

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("lanes").update({ name, color: color ?? null }).eq("id", id)
    : await supabase.from("lanes").insert({ name, color: color ?? null, position: position ?? Date.now() });
  if (error) return fromDb(error, "Não foi possível salvar a lista.");
  refresh();
  return success(id ? "Lista salva" : "Lista criada");
}

export async function moveLane(id: string, position: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("lanes").update({ position }).eq("id", id);
  if (error) return fromDb(error, "Não foi possível mover a lista.");
  refresh();
  return success("Lista movida");
}

export async function deleteLane(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("lanes").delete().eq("id", id);
  if (error) return fromDb(error, "Não foi possível apagar a lista.");
  refresh();
  return success("Lista apagada");
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------

const taskSchema = z.object({
  id: z.uuid().optional(),
  lane_id: z.uuid("Escolha a lista."),
  title: z.string().trim().min(1, "Escreva a tarefa.").max(200),
  notes: optionalText(2000),
  assignee_id: optionalUuid,
  due_on: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable()),
  position: z.coerce.number().optional(),
  label_color: z
    .string()
    .optional()
    .transform((v) => (v && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : null)),
});

export async function saveTask(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { id, position, ...values } = parsed.data;

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("tasks").update(values).eq("id", id)
    : await supabase.from("tasks").insert({ ...values, position: position ?? Date.now() });
  if (error) return fromDb(error, "Não foi possível salvar a tarefa.");
  refresh();
  return success(id ? "Tarefa salva" : "Tarefa criada");
}

export async function moveTask(id: string, laneId: string, position: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ lane_id: laneId, position }).eq("id", id);
  if (error) return fromDb(error, "Não foi possível mover a tarefa.");
  refresh();
  return success("Tarefa movida");
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  if (error) return fromDb(error, "Não foi possível atualizar a tarefa.");
  refresh();
  return success(done ? "Concluída" : "Reaberta");
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return fromDb(error, "Não foi possível apagar a tarefa.");
  refresh();
  return success("Tarefa apagada");
}

// Adicionar direto na lista, só com o título (como no Trello).
export async function quickAddTask(laneId: string, title: string, position: number): Promise<ActionResult> {
  const parsed = z
    .object({ laneId: z.uuid(), title: z.string().trim().min(1, "Escreva a tarefa.").max(200), position: z.number() })
    .safeParse({ laneId, title, position });
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .insert({ lane_id: parsed.data.laneId, title: parsed.data.title, position: parsed.data.position });
  if (error) return fromDb(error, "Não foi possível criar a tarefa.");
  refresh();
  return success("Tarefa criada");
}

// ---------------------------------------------------------------------------
// Subtarefas (checklist)
// ---------------------------------------------------------------------------

const itemTitle = z.string().trim().min(1, "Escreva a subtarefa.").max(200, "Use até 200 letras.");

export async function addTaskItem(taskId: string, title: string, position: number): Promise<ActionResult> {
  const parsed = z.object({ taskId: z.uuid(), title: itemTitle, position: z.number() }).safeParse({ taskId, title, position });
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_items")
    .insert({ task_id: parsed.data.taskId, title: parsed.data.title, position: parsed.data.position });
  if (error) return fromDb(error, "Não foi possível adicionar a subtarefa.");
  refresh();
  return success("Subtarefa adicionada");
}

export async function updateTaskItem(id: string, changes: { title?: string; done?: boolean }): Promise<ActionResult> {
  const parsed = z
    .object({ id: z.uuid(), title: itemTitle.optional(), done: z.boolean().optional() })
    .safeParse({ id, ...changes });
  if (!parsed.success) return fromZod(parsed.error);
  const { id: itemId, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("task_items").update(values).eq("id", itemId);
  if (error) return fromDb(error, "Não foi possível salvar a subtarefa.");
  refresh();
  return success("Subtarefa salva");
}

export async function deleteTaskItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("task_items").delete().eq("id", id);
  if (error) return fromDb(error, "Não foi possível apagar a subtarefa.");
  refresh();
  return success("Subtarefa apagada");
}
