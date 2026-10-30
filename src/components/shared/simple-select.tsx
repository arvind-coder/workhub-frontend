"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function SimpleSelect<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  label,
  size,
  disabled,
  className,
  id,
  invalid,
}: {
  value: T | null | undefined;
  onValueChange: (value: T) => void;
  options: Option<T>[];
  placeholder?: string;
  /** Accessible name when there is no visible <label>. */
  label?: string;
  size?: "sm" | "default";
  disabled?: boolean;
  className?: string;
  id?: string;
  invalid?: boolean;
}) {
  return (
    <Select
      value={value ?? null}
      items={options}
      onValueChange={(next) => next !== null && onValueChange(next as T)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={label} aria-invalid={invalid} size={size} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
