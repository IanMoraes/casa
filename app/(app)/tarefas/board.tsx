"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { MemberOption } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { ColorField, FormField, SubmitButton, TextInput } from "@/components/forms/fields";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { useActionForm } from "@/components/forms/use-action-form";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { TaskForm } from "@/components/tasks/task-form";
import { deleteLane, deleteTask, moveLane, moveTask, saveLane, setTaskDone } from "@/lib/actions/tasks";
import type { Tables } from "@/lib/database.types";
import { formatDay, today } from "@/lib/dates";
import { positionAtEnd, positionBetween } from "@/lib/tasks/position";
import { cn } from "@/lib/utils";

type Lane = Tables<"lanes">;
type Task = Tables<"tasks">;
type Columns = Record<string, Task[]>;

type DialogState =
  | { type: "new-task"; laneId: string }
  | { type: "edit-task"; task: Task }
  | { type: "delete-task"; task: Task }
  | { type: "new-lane" }
  | { type: "edit-lane"; lane: Lane }
  | { type: "delete-lane"; lane: Lane }
  | null;

function buildColumns(lanes: Lane[], tasks: Task[]): Columns {
  const columns: Columns = {};
  for (const lane of lanes) columns[lane.id] = [];
  for (const task of tasks) columns[task.lane_id]?.push(task);
  return columns;
}

function report(result: { ok: boolean; error?: string } | null) {
  if (result && !result.ok) toast.error(result.error);
}

export function Board({
  lanes,
  tasks,
  members,
  meId,
}: {
  lanes: Lane[];
  tasks: Task[];
  members: MemberOption[];
  meId: string;
}) {
  const [columns, setColumns] = useState<Columns>(() => buildColumns(lanes, tasks));
  const [source, setSource] = useState({ lanes, tasks });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [, startTransition] = useTransition();
  const close = () => setDialog(null);

  // Quando o servidor manda dados novos (depois de salvar), o quadro recomeça deles.
  if (source.lanes !== lanes || source.tasks !== tasks) {
    setSource({ lanes, tasks });
    setColumns(buildColumns(lanes, tasks));
  }

  // Cópias para os callbacks do arrastar, que rodam fora do ciclo de render.
  const latest = useRef(columns);
  const lanePositions = useRef(new Map<string, number>());
  useEffect(() => {
    latest.current = columns;
  }, [columns]);
  useEffect(() => {
    lanePositions.current = new Map(lanes.map((l) => [l.id, l.position]));
  }, [lanes]);

  const laneById = useMemo(() => new Map(lanes.map((l) => [l.id, l])), [lanes]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);
  const laneOrder = Object.keys(columns);

  function apply(next: Columns) {
    latest.current = next;
    setColumns(next);
  }

  // Grava só o item arrastado, na média entre os novos vizinhos.
  function persist(id: string) {
    const cols = latest.current;

    if (id in cols) {
      const order = Object.keys(cols);
      const index = order.indexOf(id);
      const prev = lanePositions.current.get(order[index - 1]);
      const next = lanePositions.current.get(order[index + 1]);
      const current = lanePositions.current.get(id)!;
      if ((prev === undefined || prev < current) && (next === undefined || current < next)) return;
      const position = positionBetween(prev, next);
      lanePositions.current.set(id, position);
      startTransition(async () => report(await moveLane(id, position)));
      return;
    }

    for (const [laneId, items] of Object.entries(cols)) {
      const index = items.findIndex((t) => t.id === id);
      if (index === -1) continue;
      const task = items[index];
      const prev = items[index - 1]?.position;
      const next = items[index + 1]?.position;
      const inOrder = (prev === undefined || prev < task.position) && (next === undefined || task.position < next);
      if (task.lane_id === laneId && inOrder) return;

      const position = positionBetween(prev, next);
      apply({ ...cols, [laneId]: items.map((t) => (t.id === id ? { ...t, lane_id: laneId, position } : t)) });
      startTransition(async () => report(await moveTask(id, laneId, position)));
      return;
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    // O Kanban aplica a ordem final logo depois deste callback.
    setTimeout(() => persist(id), 0);
  }

  // "Mover para…" (sem arrastar), pensado para o celular.
  function moveTaskTo(task: Task, laneId: string) {
    const cols = latest.current;
    const target = cols[laneId] ?? [];
    const position = positionAtEnd(target);
    const moved = { ...task, lane_id: laneId, position };
    apply({
      ...cols,
      [task.lane_id]: (cols[task.lane_id] ?? []).filter((t) => t.id !== task.id),
      [laneId]: [...target, moved],
    });
    startTransition(async () => {
      const result = await moveTask(task.id, laneId, position);
      if (result?.ok) toast.success(`Movida para ${laneById.get(laneId)?.name ?? "a lista"}`);
      else report(result);
    });
  }

  function moveLaneBy(laneId: string, delta: -1 | 1) {
    const order = Object.keys(latest.current);
    const index = order.indexOf(laneId);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const reordered = [...order];
    reordered.splice(index, 1);
    reordered.splice(target, 0, laneId);
    const next: Columns = {};
    for (const key of reordered) next[key] = latest.current[key];
    apply(next);
    persist(laneId);
  }

  function toggleDone(task: Task, done: boolean) {
    const cols = latest.current;
    apply({ ...cols, [task.lane_id]: cols[task.lane_id].map((t) => (t.id === task.id ? { ...t, done } : t)) });
    startTransition(async () => report(await setTaskDone(task.id, done)));
  }

  return (
    <>
      <Kanban value={columns} onValueChange={apply} getItemValue={(t) => t.id} onDragEnd={onDragEnd}>
        <KanbanBoard className="-mx-4 snap-x snap-mandatory scroll-px-4 items-start overflow-x-auto px-4 pb-4 md:mx-0 md:scroll-px-0 md:px-0">
          {laneOrder.map((laneId, laneIndex) => {
            const lane = laneById.get(laneId);
            if (!lane) return null;
            const items = columns[laneId];
            const open = items.filter((t) => !t.done).length;
            return (
              <KanbanColumn
                key={laneId}
                value={laneId}
                className="flex w-[85vw] max-w-80 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-black/[0.04] p-2 sm:w-72 dark:bg-white/[0.04]"
              >
                <div
                  className="-mx-2 -mt-2 mb-2 flex items-center gap-1 border-t-[6px] px-2 pt-2"
                  style={{ borderTopColor: lane.color ?? "#0078C8" }}
                >
                  <KanbanColumnHandle asChild>
                    <Button variant="ghost" size="icon" className="touch-none text-muted-foreground" aria-label={`Arrastar a lista ${lane.name}`}>
                      <GripVerticalIcon />
                    </Button>
                  </KanbanColumnHandle>
                  <h2 className="min-w-0 flex-1 truncate font-semibold">{lane.name}</h2>
                  <span className="tabular text-sm text-muted-foreground" aria-label={`${open} abertas`}>
                    {open}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Ações da lista ${lane.name}`}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setDialog({ type: "new-task", laneId })}>Adicionar tarefa</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDialog({ type: "edit-lane", lane })}>Editar lista</DropdownMenuItem>
                      <DropdownMenuItem disabled={laneIndex === 0} onSelect={() => moveLaneBy(laneId, -1)}>
                        <ArrowLeftIcon /> Mover para a esquerda
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={laneIndex === laneOrder.length - 1} onSelect={() => moveLaneBy(laneId, 1)}>
                        <ArrowRightIcon /> Mover para a direita
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ type: "delete-lane", lane })}>
                        Apagar lista
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex min-h-12 flex-col gap-2">
                  {items.map((task) => (
                    <KanbanItem key={task.id} value={task.id} className="rounded-lg">
                      <TaskCard
                        task={task}
                        assignee={task.assignee_id ? memberById.get(task.assignee_id) : undefined}
                        lanes={laneOrder.filter((id) => id !== laneId).map((id) => laneById.get(id)!)}
                        onToggle={(done) => toggleDone(task, done)}
                        onEdit={() => setDialog({ type: "edit-task", task })}
                        onDelete={() => setDialog({ type: "delete-task", task })}
                        onMove={(target) => moveTaskTo(task, target)}
                      />
                    </KanbanItem>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  className="mt-2 justify-start text-muted-foreground"
                  onClick={() => setDialog({ type: "new-task", laneId })}
                >
                  <PlusIcon /> Adicionar tarefa
                </Button>
              </KanbanColumn>
            );
          })}

          <Button
            variant="outline"
            className="w-[85vw] max-w-80 shrink-0 snap-start justify-start rounded-2xl border-dashed sm:w-72"
            onClick={() => setDialog({ type: "new-lane" })}
          >
            <PlusIcon /> Nova lista
          </Button>
        </KanbanBoard>

        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const lane = laneById.get(String(value));
              return (
                <div className="w-72 rounded-2xl bg-surface p-3 font-semibold shadow-lg">{lane?.name}</div>
              );
            }
            const task = Object.values(columns).flat().find((t) => t.id === value);
            return task ? (
              <div className="rounded-lg border bg-card p-3 text-sm font-medium shadow-lg">{task.title}</div>
            ) : null;
          }}
        </KanbanOverlay>
      </Kanban>

      <ResponsiveDialog
        open={dialog?.type === "new-task" || dialog?.type === "edit-task"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "edit-task" ? "Editar tarefa" : "Nova tarefa"}
      >
        {dialog?.type === "new-task" || dialog?.type === "edit-task" ? (
          <TaskForm
            task={dialog.type === "edit-task" ? dialog.task : undefined}
            laneId={dialog.type === "edit-task" ? dialog.task.lane_id : dialog.laneId}
            lanes={laneOrder.map((id) => laneById.get(id)!).filter(Boolean)}
            members={members}
            defaultAssignee={meId}
            endPosition={dialog.type === "new-task" ? positionAtEnd(columns[dialog.laneId] ?? []) : undefined}
            onDone={close}
          />
        ) : null}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={dialog?.type === "new-lane" || dialog?.type === "edit-lane"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "edit-lane" ? "Editar lista" : "Nova lista"}
      >
        {dialog?.type === "new-lane" || dialog?.type === "edit-lane" ? (
          <LaneForm
            lane={dialog.type === "edit-lane" ? dialog.lane : undefined}
            endPosition={positionBetween(Math.max(0, ...lanes.map((l) => l.position)), undefined)}
            onDone={close}
          />
        ) : null}
      </ResponsiveDialog>

      <ConfirmDialog
        open={dialog?.type === "delete-task"}
        onOpenChange={(o) => !o && close()}
        title="Apagar tarefa?"
        description={dialog?.type === "delete-task" ? `"${dialog.task.title}" será apagada.` : ""}
        confirmLabel="Apagar tarefa"
        action={() => (dialog?.type === "delete-task" ? deleteTask(dialog.task.id) : Promise.resolve(null))}
      />

      <ConfirmDialog
        open={dialog?.type === "delete-lane"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "delete-lane" ? `Apagar a lista ${dialog.lane.name}?` : ""}
        description={
          dialog?.type === "delete-lane"
            ? `As ${columns[dialog.lane.id]?.length ?? 0} tarefas dela também serão apagadas.`
            : ""
        }
        confirmLabel="Apagar lista"
        action={() => (dialog?.type === "delete-lane" ? deleteLane(dialog.lane.id) : Promise.resolve(null))}
      />
    </>
  );
}

function TaskCard({
  task,
  assignee,
  lanes,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}: {
  task: Task;
  assignee?: MemberOption;
  lanes: Lane[];
  onToggle: (done: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (laneId: string) => void;
}) {
  const late = !task.done && task.due_on !== null && task.due_on < today();

  return (
    <div className={cn("flex items-start gap-2 card-surface rounded-xl p-2", task.done && "opacity-60")}>
      <KanbanItemHandle asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="mt-0.5 touch-none text-muted-foreground"
          aria-label={`Arrastar ${task.title}`}
        >
          <GripVerticalIcon />
        </Button>
      </KanbanItemHandle>
      <Checkbox
        checked={task.done}
        onCheckedChange={(v) => onToggle(Boolean(v))}
        className="mt-2"
        aria-label={task.done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
      />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 py-1 text-left">
        <span className={cn("block text-sm font-medium break-words", task.done && "line-through")}>{task.title}</span>
        {task.due_on || assignee ? (
          <span className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            {task.due_on ? (
              <span className={cn("flex items-center gap-1 tabular", late && "font-medium text-destructive")}>
                <CalendarIcon className="size-3.5" aria-hidden />
                {formatDay(task.due_on)}
                {late ? " · atrasada" : null}
              </span>
            ) : null}
            {assignee ? (
              <span className="ml-auto flex items-center gap-1">
                <PersonAvatar name={assignee.display_name} color={assignee.color} src={assignee.avatar_url} className="size-5" />
                <span className="sr-only">{assignee.display_name}</span>
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${task.title}`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
          {lanes.length > 0 ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Mover para</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {lanes.map((lane) => (
                  <DropdownMenuItem key={lane.id} onSelect={() => onMove(lane.id)}>
                    {lane.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Apagar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function LaneForm({ lane, endPosition, onDone }: { lane?: Lane; endPosition: number; onDone: () => void }) {
  const form = useActionForm(saveLane, { onSuccess: onDone });
  return (
    <form onSubmit={form.onSubmit}>
      {lane ? <input type="hidden" name="id" value={lane.id} /> : <input type="hidden" name="position" value={endPosition} />}
      <FieldGroup>
        <FormField label="Nome" htmlFor="lane-name" error={form.errorFor("name")}>
          <TextInput id="lane-name" name="name" defaultValue={lane?.name} placeholder="Recados" autoFocus required />
        </FormField>
        <ColorField name="color" label="Cor da faixa" defaultValue={lane?.color} />
        <SubmitButton pending={form.pending} className="w-full">
          {lane ? "Salvar lista" : "Criar lista"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
