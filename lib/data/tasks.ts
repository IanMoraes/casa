import "server-only";

import { cache } from "react";

import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Lane = Tables<"lanes">;
export type Task = Tables<"tasks">;
export type TaskItem = Tables<"task_items">;

export async function getBoard() {
  const supabase = await createClient();
  const [lanes, tasks, items] = await Promise.all([
    supabase.from("lanes").select("*").order("position"),
    supabase.from("tasks").select("*").order("position"),
    supabase.from("task_items").select("*").order("position"),
  ]);
  if (lanes.error) throw new Error(`Não foi possível carregar as listas: ${lanes.error.message}`);
  if (tasks.error) throw new Error(`Não foi possível carregar as tarefas: ${tasks.error.message}`);
  if (items.error) throw new Error(`Não foi possível carregar as subtarefas: ${items.error.message}`);
  return { lanes: lanes.data, tasks: tasks.data, items: items.data };
}

export const getLanes = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lanes").select("id, name, color").order("position");
  if (error) throw new Error(`Não foi possível carregar as listas: ${error.message}`);
  return data;
});

// Próximas tarefas abertas: primeiro as com prazo, do mais próximo.
export async function getUpcomingTasks(assigneeId: string | null, limit = 5) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("done", false)
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (assigneeId) query = query.eq("assignee_id", assigneeId);
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as tarefas: ${error.message}`);
  return data;
}
