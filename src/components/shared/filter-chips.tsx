"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function FilterChips({ chips, onClear }: { chips: Chip[]; onClear: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {chip.label}
          <X aria-hidden className="size-3" />
        </button>
      ))}
      <Button variant="ghost" size="xs" onClick={onClear}>
        Reset filters
      </Button>
    </div>
  );
}
