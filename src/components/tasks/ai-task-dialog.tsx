"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/field";
import { FormError } from "@/components/shared/form-error";
import { SimpleSelect } from "@/components/shared/simple-select";
import { invalidateTaskData, useGenerateTasks } from "@/features/tasks/hooks";
import { tasksApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/errors";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/utils/labels";
import { useQueryClient } from "@tanstack/react-query";
import type { TaskSuggestion } from "@/types/api";

const MIN_REQUIREMENT = 10;
const MAX_REQUIREMENT = 2000;

interface Draft extends TaskSuggestion {
  key: number;
  selected: boolean;
}

export function AiTaskDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const generate = useGenerateTasks(projectId);
  const [requirement, setRequirement] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = requirement.trim();
  const validRequirement = trimmed.length >= MIN_REQUIREMENT && trimmed.length <= MAX_REQUIREMENT;
  const selected = drafts?.filter((d) => d.selected) ?? [];
  const canSave = selected.length > 0 && selected.every((d) => d.title.trim().length >= 3 && d.description.trim().length >= 1);

  const patch = (key: number, change: Partial<Draft>) =>
    setDrafts((prev) => prev && prev.map((d) => (d.key === key ? { ...d, ...change } : d)));

  const onGenerate = () => {
    setError(null);
    generate.mutate(trimmed, {
      onSuccess: ({ tasks }) => setDrafts(tasks.map((t, i) => ({ ...t, key: i, selected: true }))),
      onError: (e) => setError(getErrorMessage(e, "Tasks couldn't be generated. Please try again.")),
    });
  };

  // Tasks are created one by one; any that fail stay in the list so the user can retry them.
  const onSave = async () => {
    setError(null);
    setSaving(true);
    const failed = new Set<number>();
    let lastError: unknown;

    for (const d of selected) {
      try {
        await tasksApi.create(projectId, {
          title: d.title.trim(),
          description: d.description.trim(),
          priority: d.priority,
        });
      } catch (e) {
        failed.add(d.key);
        lastError = e;
      }
    }

    await invalidateTaskData(queryClient, projectId);
    setSaving(false);

    const created = selected.length - failed.size;
    if (created > 0) toast.success(`${created} ${created === 1 ? "task" : "tasks"} created`);

    if (failed.size === 0) {
      onClose();
      return;
    }
    setDrafts((prev) => prev && prev.filter((d) => failed.has(d.key)));
    setError(`${failed.size} ${failed.size === 1 ? "task" : "tasks"} couldn't be saved: ${getErrorMessage(lastError)}`);
  };

  const busy = generate.isPending || saving;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate tasks with AI</DialogTitle>
          <DialogDescription>
            {drafts
              ? "Review and edit the suggestions. Nothing is saved until you confirm."
              : "Describe a feature and AI will suggest a task breakdown you can edit before saving."}
          </DialogDescription>
        </DialogHeader>
        <FormError message={error} />

        {drafts === null ? (
          <>
            <Field id="ai-requirement" label="Feature requirement" required hint={`${trimmed.length}/${MAX_REQUIREMENT} characters (minimum ${MIN_REQUIREMENT})`}>
              <Textarea
                id="ai-requirement"
                rows={6}
                autoFocus
                maxLength={MAX_REQUIREMENT + 500}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="Users can reset their password through an emailed link that expires after 30 minutes."
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" onClick={onGenerate} disabled={!validRequirement || busy}>
                {generate.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
                Generate tasks
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <ul className="space-y-3">
              {drafts.map((d) => (
                <li key={d.key} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-2.5"
                      checked={d.selected}
                      onCheckedChange={(c) => patch(d.key, { selected: c === true })}
                      aria-label={`Include "${d.title}"`}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={d.title}
                        maxLength={150}
                        aria-label="Task title"
                        aria-invalid={d.selected && d.title.trim().length < 3}
                        onChange={(e) => patch(d.key, { title: e.target.value })}
                      />
                      <Textarea
                        rows={3}
                        value={d.description}
                        maxLength={2000}
                        aria-label="Task description"
                        onChange={(e) => patch(d.key, { description: e.target.value })}
                      />
                      <SimpleSelect
                        size="sm"
                        className="w-40"
                        label="Priority"
                        value={d.priority}
                        onValueChange={(priority) => patch(d.key, { priority })}
                        options={[...PRIORITY_ORDER].reverse().map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDrafts(null); setError(null); }} disabled={busy}>
                Back
              </Button>
              <Button type="button" onClick={() => void onSave()} disabled={!canSave || busy}>
                {saving && <Loader2 aria-hidden className="animate-spin" />}
                Save {selected.length} {selected.length === 1 ? "task" : "tasks"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
