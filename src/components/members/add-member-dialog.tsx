"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/shared/field";
import { FormError } from "@/components/shared/form-error";
import { SimpleSelect } from "@/components/shared/simple-select";
import { useAddMember } from "@/features/members/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { ROLE_LABEL } from "@/lib/utils/labels";
import { addMemberSchema, type AddMemberValues } from "@/lib/validations/schemas";

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
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AddMemberValues>({ resolver: zodResolver(addMemberSchema), defaultValues: { userId: "", role: "MEMBER" } });

  const role = useWatch({ control, name: "role" });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    add.mutate(values, {
      onSuccess: () => {
        toast.success("Member added");
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
          The WorkHub API adds people by user ID; it has no user search. Ask your teammate to copy their ID from{" "}
          <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
            Settings
          </Link>
          .
        </DialogDescription>
      </DialogHeader>
      <FormError message={serverError} />
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
