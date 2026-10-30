"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/shared/field";
import { FormError } from "@/components/shared/form-error";
import { SimpleSelect } from "@/components/shared/simple-select";
import { useAddMember, usePeople } from "@/features/members/hooks";
import { useProject } from "@/features/projects/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { ROLE_LABEL } from "@/lib/utils/labels";
import { addMemberSchema, type AddMemberValues } from "@/lib/validations/schemas";
import type { UserSummary } from "@/types/api";
import { MemberPicker } from "./member-picker";

export function AddMemberDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AddMemberForm projectId={projectId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddMemberForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const add = useAddMember(projectId);
  const project = useProject(projectId);
  const { people } = usePeople(projectId);
  const [mode, setMode] = useState<"search" | "id">("search");
  const [picked, setPicked] = useState<UserSummary | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AddMemberValues>({ resolver: zodResolver(addMemberSchema), defaultValues: { userId: "", role: "MEMBER" } });
  const role = useWatch({ control, name: "role" });

  // People who already have access can't be added again.
  const unavailable = new Map<string, string>();
  people.forEach((_p, id) => unavailable.set(id, "Already a member"));
  if (project.data) unavailable.set(project.data.ownerId, "Project owner");

  const pick = (user: UserSummary | null) => {
    setPicked(user);
    setValue("userId", user?.id ?? "", { shouldValidate: Boolean(user) });
  };

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    add.mutate(values, {
      onSuccess: () => {
        toast.success(picked ? `${picked.name} added` : "Member added");
        onDone();
      },
      onError: (e) => setServerError(getErrorMessage(e)),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add a member</DialogTitle>
        <DialogDescription>
          {mode === "search" ? "Find a teammate by name or email." : "Paste the user ID your teammate copied from Settings."}
        </DialogDescription>
      </DialogHeader>
      <FormError message={serverError} />

      {mode === "search" ? (
        <div className="space-y-1.5">
          <label htmlFor="member-search" className="text-sm font-medium">
            Person <span aria-hidden className="text-destructive">*</span>
          </label>
          <MemberPicker selected={picked} onSelect={pick} unavailable={unavailable} onUseId={() => setMode("id")} />
          {errors.userId && !picked && (
            <p role="alert" className="text-xs font-medium text-destructive">
              Select a person from the results
            </p>
          )}
        </div>
      ) : (
        <Field id="member-user-id" label="User ID" required error={errors.userId?.message}>
          <Input
            id="member-user-id"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="64b0f1a2c3d4e5f6a7b8c9d0"
            className="font-mono text-[13px]"
            aria-invalid={Boolean(errors.userId)}
            aria-describedby={describedBy("member-user-id", errors.userId?.message)}
            {...register("userId")}
          />
        </Field>
      )}

      <Field id="member-role" label="Role">
        <SimpleSelect
          id="member-role"
          value={role}
          onValueChange={(v) => setValue("role", v)}
          options={[
            { value: "MEMBER", label: ROLE_LABEL.MEMBER },
            { value: "PROJECT_MANAGER", label: ROLE_LABEL.PROJECT_MANAGER },
          ]}
        />
      </Field>

      <button
        type="button"
        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={() => {
          pick(null);
          setValue("userId", "");
          setMode(mode === "search" ? "id" : "search");
        }}
      >
        {mode === "search" ? "Can't find them? Add by user ID" : "Search by name instead"}
      </button>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={add.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={add.isPending}>
          {add.isPending && <Loader2 aria-hidden className="animate-spin" />}
          Add member
        </Button>
      </DialogFooter>
    </form>
  );
}
