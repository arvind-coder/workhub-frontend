import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

function parse(value?: string | null) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function formatDate(value?: string | null, fallback = "—") {
  const date = parse(value);
  return date ? format(date, "MMM d, yyyy") : fallback;
}

export function formatDateTime(value?: string | null, fallback = "—") {
  const date = parse(value);
  return date ? format(date, "MMM d, yyyy 'at' h:mm a") : fallback;
}

export function formatRelative(value?: string | null, fallback = "—") {
  const date = parse(value);
  return date ? `${formatDistanceToNowStrict(date)} ago` : fallback;
}

/**
 * Due dates are picked as calendar days. They are stored at 12:00 UTC so the
 * same calendar day renders in every timezone from UTC-12 to UTC+11.
 */
export function dueInputToIso(value: string): string | undefined {
  return value ? `${value}T12:00:00.000Z` : undefined;
}

export function dueIsoToInput(value?: string): string {
  return value ? value.slice(0, 10) : "";
}

export function formatDue(value?: string | null) {
  if (!value) return null;
  const date = parse(value);
  return date ? format(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()), "MMM d") : null;
}

export function isOverdue(dueDate: string | undefined, status: string, now = new Date()) {
  if (!dueDate || status === "DONE") return false;
  const due = parse(dueDate);
  return due ? due.getTime() < now.getTime() : false;
}
