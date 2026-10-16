import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { toMemberOptions } from "@/lib/data/options";
import { getHousehold } from "@/lib/data/session";
import { getBoard } from "@/lib/data/tasks";

import { Board } from "./board";

export const metadata: Metadata = { title: "Tarefas" };

export default async function TasksPage() {
  const ctx = await getHousehold();
  const { lanes, tasks } = await getBoard();

  return (
    <>
      <PageHeader title="Tarefas" description="Arraste pelas alças para mudar a ordem ou a lista." />
      <Board lanes={lanes} tasks={tasks} members={toMemberOptions(ctx.members)} meId={ctx.userId} />
    </>
  );
}
