"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, describedBy } from "@/components/shared/field";
import { FormError } from "@/components/shared/form-error";
import { SimpleSelect } from "@/components/shared/simple-select";
import { useCurrentUser } from "@/features/auth/hooks";
import { usePeople } from "@/features/members/hooks";
import { useCreateTask, useUpdateTask } from "@/features/tasks/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { dueInputToIso, dueIsoToInput } from "@/lib/utils/dates";
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER } from "@/lib/utils/labels";
import { taskSchema, type TaskValues } from "@/lib/validations/schemas";
import type { Task, TaskCreateInput, TaskUpdateInput } from "@/types/api";
import { buildAssigneeOptions, UNASSIGNED } from "./assignee-options";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  ownerId?: string;
  /** Provide to edit; omit to create. */
  task?: Task;
  onSaved?: (task: Task) => void;
}

export function TaskFormDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <TaskForm {...rest} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({ projectId, ownerId, task, onSaved, onDone }: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const editing = Boolean(task);
  const { data: me } = useCurrentUser();
  const { people } = usePeople(projectId);
  const create = useCreateTask(projectId);
  const update = useUpdateTask(projectId, task?.id ?? "");
  const pending = create.isPending || update.isPending;
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "TODO",
      priority: task?.priority ?? "MEDIUM",
      assignedTo: task?.assignedTo ?? "",
      dueDate: dueIsoToInput(task?.dueDate),
    },
  });

  const [statusValue, priorityValue, assignedValue] = useWatch({ control, name: ["status", "priority", "assignedTo"] });
  const assignee = assignedValue || UNASSIGNED;
  const assigneeOptions = buildAssigneeOptions(people, { meId: me?.id, ownerId, currentAssignee: task?.assignedTo });

  const onSubmit = handleSubmit((v) => {
    setServerError(null);
    if (task) {
      const diff: TaskUpdateInput = {};
      if (v.title !== task.title) diff.title = v.title;
      if (v.description !== task.description) diff.description = v.description;
      if (v.status !== task.status) diff.status = v.status;
      if (v.priority !== task.priority) diff.priority = v.priority;
      if (v.assignedTo !== (task.assignedTo ?? "")) diff.assignedTo = v.assignedTo || null;
      if (v.dueDate !== dueIsoToInput(task.dueDate)) diff.dueDate = dueInputToIso(v.dueDate) ?? null;
      if (Object.keys(diff).length === 0) {
        toast.info("No changes to save");
        onDone();
        return;
      }
      update.mutate(diff, {
        onSuccess: (saved) => {
          toast.success("Task updated");
          onSaved?.(saved);
          onDone();
        },
        onError: (e) => setServerError(getErrorMessage(e)),
      });
      return;
    }
    const input: TaskCreateInput = {
      title: v.title,
      description: v.description,
      status: v.status,
      priority: v.priority,
      ...(v.assignedTo ? { assignedTo: v.assignedTo } : {}),
      ...(v.dueDate ? { dueDate: dueInputToIso(v.dueDate) } : {}),
    };
    create.mutate(input, {
      onSuccess: (saved) => {
        toast.success("Task created");
        onSaved?.(saved);
        onDone();
      },
      onError: (e) => setServerError(getErrorMessage(e)),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
        <DialogDescription>{editing ? "Update the task details." : "Describe the work and who should do it."}</DialogDescription>
      </DialogHeader>
      <FormError message={serverError} />

      <Field id="task-title" label="Title" required error={errors.title?.message}>
        <Input
          id="task-title"
          autoFocus
          placeholder="Draft the onboarding checklist"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("task-title", errors.title?.message)}
          {...register("title")}
        />
      </Field>
      <Field id="task-description" label="Description" required error={errors.description?.message}>
        <Textarea
          id="task-description"
          rows={4}
          placeholder="Add context, acceptance criteria, or links."
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy("task-description", errors.description?.message)}
          {...register("description")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="task-status" label="Status">
          <SimpleSelect
            id="task-status"
            value={statusValue}
            onValueChange={(v) => setValue("status", v, { shouldDirty: true })}
            options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
        </Field>
        <Field id="task-priority" label="Priority">
          <SimpleSelect
            id="task-priority"
            value={priorityValue}
            onValueChange={(v) => setValue("priority", v, { shouldDirty: true })}
            options={[...PRIORITY_ORDER].reverse().map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          />
        </Field>
        <Field id="task-assignee" label="Assignee" hint="Only the project owner and members can be assigned.">
          <SimpleSelect
            id="task-assignee"
            value={assignee}
            onValueChange={(v) => setValue("assignedTo", v === UNASSIGNED ? "" : v, { shouldDirty: true })}
            options={assigneeOptions}
          />
        </Field>
        <Field id="task-due" label="Due date" error={errors.dueDate?.message}>
          <Input id="task-due" type="date" aria-invalid={Boolean(errors.dueDate)} {...register("dueDate")} />
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {editing ? "Save changes" : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}
