"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  AlignLeftIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ListChecksIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";

import type { MemberOption } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { ColorField, FormField, SubmitButton, TextInput } from "@/components/forms/fields";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { useActionForm } from "@/components/forms/use-action-form";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import { Kanban, KanbanBoard, KanbanColumn, KanbanColumnHandle, KanbanItem, KanbanOverlay } from "@/components/ui/kanban";
import { Textarea } from "@/components/ui/textarea";
import { deleteLane, deleteTask, moveLane, moveTask, quickAddTask, saveLane, setTaskDone } from "@/lib/actions/tasks";
import type { Tables } from "@/lib/database.types";
import { diffInDays, formatDay, today } from "@/lib/dates";
import { positionAtEnd, positionBetween } from "@/lib/tasks/position";
import { cn } from "@/lib/utils";

import { TaskDetail } from "./task-detail";

type Lane = Tables<"lanes">;
type Task = Tables<"tasks">;
type Item = Tables<"task_items">;
type Columns = Record<string, Task[]>;

type DialogState =
  | { type: "task"; id: string }
  | { type: "delete-task"; task: Task }
  | { type: "new-lane" }
  | { type: "edit-lane"; lane: Lane }
  | { type: "delete-lane"; lane: Lane }
  | null;

const LANE_WIDTH = "w-[85vw] max-w-[20rem] sm:w-[18.5rem]";

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
  items,
  members,
}: {
  lanes: Lane[];
  tasks: Task[];
  items: Item[];
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
  const itemsByTask = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) map.set(item.task_id, [...(map.get(item.task_id) ?? []), item]);
    return map;
  }, [items]);
  const laneOrder = Object.keys(columns);
  const openTask = dialog?.type === "task" ? tasks.find((t) => t.id === dialog.id) : undefined;

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

    for (const [laneId, list] of Object.entries(cols)) {
      const index = list.findIndex((t) => t.id === id);
      if (index === -1) continue;
      const task = list[index];
      const prev = list[index - 1]?.position;
      const next = list[index + 1]?.position;
      const inOrder = (prev === undefined || prev < task.position) && (next === undefined || task.position < next);
      if (task.lane_id === laneId && inOrder) return;

      const position = positionBetween(prev, next);
      apply({ ...cols, [laneId]: list.map((t) => (t.id === id ? { ...t, lane_id: laneId, position } : t)) });
      startTransition(async () => report(await moveTask(id, laneId, position)));
      return;
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    // O Kanban aplica a ordem final logo depois deste callback.
    setTimeout(() => persist(id), 0);
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

  function toggleDone(task: Task) {
    const cols = latest.current;
    const done = !task.done;
    apply({ ...cols, [task.lane_id]: cols[task.lane_id].map((t) => (t.id === task.id ? { ...t, done } : t)) });
    startTransition(async () => report(await setTaskDone(task.id, done)));
  }

  return (
    <>
      <Kanban value={columns} onValueChange={apply} getItemValue={(t) => t.id} onDragEnd={onDragEnd}>
        <KanbanBoard className="-mx-4 snap-x snap-mandatory scroll-px-4 items-start gap-4 overflow-x-auto px-4 pb-6 [scrollbar-width:thin] md:mx-0 md:-mb-8 md:h-[calc(100dvh-8.5rem)] md:snap-none md:scroll-px-0 md:px-0 md:pb-3">
          {laneOrder.map((laneId, laneIndex) => {
            const lane = laneById.get(laneId);
            if (!lane) return null;
            const list = columns[laneId];
            const open = list.filter((t) => !t.done).length;
            const color = lane.color ?? "#0078C8";
            return (
              <KanbanColumn
                key={laneId}
                value={laneId}
                className={cn(
                  LANE_WIDTH,
                  "flex h-auto shrink-0 snap-start flex-col gap-0 rounded-2xl md:max-h-full border-0 bg-black/[0.045] p-3 dark:bg-white/[0.045]",
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <KanbanColumnHandle asChild>
                    <div className="flex min-w-0 flex-1 cursor-grab items-center gap-2 py-1 active:cursor-grabbing">
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                      <h2 className="min-w-0 truncate text-[0.95rem] font-bold">{lane.name}</h2>
                      <span
                        className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular"
                        aria-label={`${open} abertas`}
                      >
                        {open}
                      </span>
                    </div>
                  </KanbanColumnHandle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Ações da lista ${lane.name}`}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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

                <div className="-mx-1 flex min-h-4 flex-col gap-2.5 px-1 pb-0.5 md:min-h-0 md:overflow-y-auto md:[scrollbar-width:thin]">
                  {list.map((task) => (
                    <KanbanItem
                      key={task.id}
                      value={task.id}
                      asHandle
                      className="touch-manipulation rounded-xl select-none"
                    >
                      <TaskCard
                        task={task}
                        items={itemsByTask.get(task.id) ?? []}
                        assignee={task.assignee_id ? memberById.get(task.assignee_id) : undefined}
                        onOpen={() => setDialog({ type: "task", id: task.id })}
                        onToggle={() => toggleDone(task)}
                      />
                    </KanbanItem>
                  ))}
                </div>

                <CardComposer laneId={laneId} endPosition={positionAtEnd(list)} />
              </KanbanColumn>
            );
          })}

          <Button
            variant="ghost"
            className={cn(LANE_WIDTH, "h-12 shrink-0 snap-start justify-start rounded-2xl bg-black/[0.03] font-semibold dark:bg-white/[0.04]")}
            onClick={() => setDialog({ type: "new-lane" })}
          >
            <PlusIcon /> Nova lista
          </Button>
        </KanbanBoard>

        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const lane = laneById.get(String(value));
              return <div className="w-72 rounded-2xl bg-surface p-4 font-bold shadow-xl">{lane?.name}</div>;
            }
            const task = Object.values(columns).flat().find((t) => t.id === value);
            return task ? (
              <div className="w-[18rem] rotate-2 rounded-xl bg-surface p-3 text-[0.95rem] font-medium shadow-xl">
                {task.title}
              </div>
            ) : null;
          }}
        </KanbanOverlay>
      </Kanban>

      <ResponsiveDialog
        open={dialog?.type === "task" && openTask !== undefined}
        onOpenChange={(o) => !o && close()}
        title={openTask ? `Em ${laneById.get(openTask.lane_id)?.name ?? "lista"}` : ""}
        wide
      >
        {openTask ? (
          <TaskDetail
            key={openTask.id}
            task={openTask}
            items={itemsByTask.get(openTask.id) ?? []}
            lanes={laneOrder.map((id) => laneById.get(id)!).filter(Boolean)}
            members={members}
            onClose={close}
            onDelete={() => setDialog({ type: "delete-task", task: openTask })}
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
        description={dialog?.type === "delete-task" ? `"${dialog.task.title}" e o checklist dela serão apagados.` : ""}
        confirmLabel="Apagar tarefa"
        action={() => (dialog?.type === "delete-task" ? deleteTask(dialog.task.id) : Promise.resolve(null))}
      />

      <ConfirmDialog
        open={dialog?.type === "delete-lane"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "delete-lane" ? `Apagar a lista ${dialog.lane.name}?` : ""}
        description={
          dialog?.type === "delete-lane" ? `As ${columns[dialog.lane.id]?.length ?? 0} tarefas dela também serão apagadas.` : ""
        }
        confirmLabel="Apagar lista"
        action={() => (dialog?.type === "delete-lane" ? deleteLane(dialog.lane.id) : Promise.resolve(null))}
      />
    </>
  );
}

// Cartão no estilo Trello: etiqueta, título e selos (prazo, checklist, descrição, pessoa).
function TaskCard({
  task,
  items,
  assignee,
  onOpen,
  onToggle,
}: {
  task: Task;
  items: Item[];
  assignee?: MemberOption;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const doneItems = items.filter((i) => i.done).length;
  const allItemsDone = items.length > 0 && doneItems === items.length;
  const daysLeft = task.due_on ? diffInDays(today(), task.due_on) : null;
  const dueTone = task.done
    ? "bg-income-soft text-income-foreground"
    : daysLeft !== null && daysLeft < 0
      ? "bg-destructive text-white"
      : daysLeft !== null && daysLeft <= 2
        ? "bg-warning-soft text-warning-foreground"
        : "bg-muted text-muted-foreground";
  const hasBadges = task.due_on || items.length > 0 || task.notes || assignee;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "card-surface group/card cursor-pointer overflow-hidden rounded-xl text-left outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        task.done && "opacity-70",
      )}
      aria-label={`Abrir ${task.title}`}
    >
      {task.label_color ? <div className="h-2" style={{ backgroundColor: task.label_color }} aria-hidden /> : null}
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={task.done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
              task.done
                ? "border-income bg-income text-white"
                : "border-muted-foreground/40 hover:border-income hover:bg-income-soft",
            )}
          >
            {task.done ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
          </button>
          <p className={cn("min-w-0 flex-1 text-[0.95rem] leading-snug font-medium break-words", task.done && "line-through")}>
            {task.title}
          </p>
        </div>

        {hasBadges ? (
          <div className="flex flex-wrap items-center gap-1.5 pl-7">
            {task.due_on ? (
              <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular", dueTone)}>
                <CalendarIcon className="size-3.5" aria-hidden />
                {formatDay(task.due_on)}
                {!task.done && daysLeft !== null && daysLeft < 0 ? <span className="sr-only"> (atrasada)</span> : null}
              </span>
            ) : null}
            {items.length > 0 ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular",
                  allItemsDone ? "bg-income-soft text-income-foreground" : "text-muted-foreground",
                )}
                aria-label={`Checklist: ${doneItems} de ${items.length}`}
              >
                <ListChecksIcon className="size-3.5" aria-hidden />
                {doneItems}/{items.length}
              </span>
            ) : null}
            {task.notes ? (
              <AlignLeftIcon className="size-3.5 text-muted-foreground" aria-label="Tem descrição" />
            ) : null}
            {assignee ? (
              <span className="ml-auto">
                <PersonAvatar name={assignee.display_name} color={assignee.color} src={assignee.avatar_url} className="size-6" />
                <span className="sr-only">{assignee.display_name}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// "Adicionar tarefa" no fim da lista: escreve e aperta Enter, sem abrir janela.
function CardComposer({ laneId, endPosition }: { laneId: string; endPosition: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [lastPosition, setLastPosition] = useState(endPosition);
  if (endPosition > lastPosition) setLastPosition(endPosition);

  function add() {
    const value = title.trim();
    if (!value) return;
    const position = Math.max(endPosition, lastPosition) + 1024;
    setLastPosition(position);
    setTitle("");
    startTransition(async () => report(await quickAddTask(laneId, value, position)));
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      add();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        className="mt-2.5 h-10 justify-start rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
        onClick={() => setOpen(true)}
      >
        <PlusIcon /> Adicionar tarefa
      </Button>
    );
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2">
      <Textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="O que precisa ser feito?"
        aria-label="Título da nova tarefa"
        rows={2}
        maxLength={200}
        className="card-surface resize-none border-0 text-[0.95rem]"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={add} disabled={pending || !title.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Adicionar
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar">
          <XIcon />
        </Button>
      </div>
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
        <ColorField name="color" label="Cor" defaultValue={lane?.color} />
        <SubmitButton pending={form.pending} className="w-full">
          {lane ? "Salvar lista" : "Criar lista"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
