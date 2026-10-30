"use client";

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
import { useCreateProject, useUpdateProject } from "@/features/projects/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { projectSchema, type ProjectValues } from "@/lib/validations/schemas";
import type { Project } from "@/types/api";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this project; otherwise it creates one. */
  project?: Project;
  onCreated?: (project: Project) => void;
}

export function ProjectFormDialog({ open, onOpenChange, project, onCreated }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ProjectForm project={project} onDone={() => onOpenChange(false)} onCreated={onCreated} />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ project, onDone, onCreated }: { project?: Project; onDone: () => void; onCreated?: (p: Project) => void }) {
  const editing = Boolean(project);
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? "");
  const pending = create.isPending || update.isPending;
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      status: project?.status ?? "active",
    },
  });

  const status = useWatch({ control, name: "status" });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    if (project) {
      const diff: Partial<ProjectValues> = {};
      if (values.name !== project.name) diff.name = values.name;
      if (values.description !== project.description) diff.description = values.description;
      if (values.status !== project.status) diff.status = values.status;
      if (Object.keys(diff).length === 0) {
        toast.info("No changes to save");
        onDone();
        return;
      }
      update.mutate(diff, {
        onSuccess: () => {
          toast.success("Project updated");
          onDone();
        },
        onError: (e) => setServerError(getErrorMessage(e)),
      });
    } else {
      create.mutate(
        { name: values.name, description: values.description },
        {
          onSuccess: (created) => {
            toast.success(`“${created.name}” created`);
            onDone();
            onCreated?.(created);
          },
          onError: (e) => setServerError(getErrorMessage(e)),
        },
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
        <DialogDescription>
          {editing ? "Update the project details." : "Projects group related tasks and the people working on them."}
        </DialogDescription>
      </DialogHeader>
      <FormError message={serverError} />
      <Field id="project-name" label="Name" required error={errors.name?.message}>
        <Input
          id="project-name"
          autoFocus
          placeholder="Website redesign"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("project-name", errors.name?.message)}
          {...register("name")}
        />
      </Field>
      <Field id="project-description" label="Description" required error={errors.description?.message}>
        <Textarea
          id="project-description"
          rows={4}
          placeholder="What is this project about and what does success look like?"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy("project-description", errors.description?.message)}
          {...register("description")}
        />
      </Field>
      {editing && (
        <Field id="project-status" label="Status">
          <SimpleSelect
            id="project-status"
            value={status}
            onValueChange={(v) => setValue("status", v, { shouldDirty: true })}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </Field>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {editing ? "Save changes" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
