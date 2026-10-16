"use client";

import type { MemberOption } from "@/components/finance/types";
import { FormField, SelectField, SubmitButton, TextInput } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { saveTask } from "@/lib/actions/tasks";
import type { Tables } from "@/lib/database.types";

type Task = Tables<"tasks">;
export type LaneOption = { id: string; name: string };

export function TaskForm({
  task,
  laneId,
  lanes,
  members,
  defaultAssignee,
  endPosition,
  onDone,
}: {
  task?: Task;
  laneId?: string;
  lanes: LaneOption[];
  members: MemberOption[];
  defaultAssignee: string;
  endPosition?: number;
  onDone: () => void;
}) {
  const form = useActionForm(saveTask, { onSuccess: onDone });
  return (
    <form onSubmit={form.onSubmit}>
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      {endPosition !== undefined ? <input type="hidden" name="position" value={endPosition} /> : null}
      <FieldGroup>
        <FormField label="Tarefa" htmlFor="task-title" error={form.errorFor("title")}>
          <TextInput
            id="task-title"
            name="title"
            defaultValue={task?.title}
            placeholder="Trocar a lâmpada da cozinha"
            autoFocus
            required
          />
        </FormField>
        <FormField label="Detalhes (opcional)" htmlFor="task-notes">
          <Textarea id="task-notes" name="notes" defaultValue={task?.notes ?? ""} rows={3} />
        </FormField>
        <FormField label="Lista" htmlFor="task-lane" error={form.errorFor("lane_id")}>
          <SelectField
            id="task-lane"
            name="lane_id"
            defaultValue={laneId ?? lanes[0]?.id}
            options={lanes.map((l) => ({ value: l.id, label: l.name }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quem faz" htmlFor="task-assignee">
            <SelectField
              id="task-assignee"
              name="assignee_id"
              defaultValue={task ? (task.assignee_id ?? "none") : defaultAssignee}
              options={[
                { value: "none", label: "Ninguém" },
                ...members.map((m) => ({ value: m.user_id, label: m.display_name })),
              ]}
            />
          </FormField>
          <FormField label="Prazo" htmlFor="task-due" error={form.errorFor("due_on")}>
            <TextInput id="task-due" name="due_on" type="date" defaultValue={task?.due_on ?? ""} />
          </FormField>
        </div>
        <SubmitButton pending={form.pending} className="w-full">
          {task ? "Salvar tarefa" : "Adicionar tarefa"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
