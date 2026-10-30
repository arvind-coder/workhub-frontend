"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pagination } from "@/types/api";

export function PaginationControls({
  pagination,
  onPageChange,
  noun = "items",
  disabled,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  noun?: string;
  disabled?: boolean;
}) {
  const { page, limit, total, totalPages } = pagination;
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden /> Previous
        </Button>
        <span className="px-2 text-sm text-muted-foreground">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
