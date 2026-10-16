import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { toMemberOptions } from "@/lib/data/options";
import { getHousehold } from "@/lib/data/session";
import { getBoard } from "@/lib/data/tasks";

import { Board } from "./board";

export const metadata: Metadata = { title: "Tarefas" };

export default async function TasksPage() {
  const ctx = await getHousehold();
  const { lanes, tasks, items } = await getBoard();

  return (
    <>
      <PageHeader title="Tarefas" description="Toque num cartão para ver os detalhes e o checklist. Para mover, arraste (no celular, segure o cartão)." />
      <Board lanes={lanes} tasks={tasks} items={items} members={toMemberOptions(ctx.members)} meId={ctx.userId} />
    </>
  );
}
