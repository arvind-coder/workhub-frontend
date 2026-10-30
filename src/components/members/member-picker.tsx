"use client";

import { useId, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { MIN_USER_SEARCH_LENGTH, useUserSearch } from "@/features/members/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/types/api";

/**
 * Search-as-you-type people picker (ARIA combobox). Results come from the API
 * (`GET /users?search=`); people who already have access are shown but disabled.
 */
export function MemberPicker({
  selected,
  onSelect,
  unavailable,
  onUseId,
}: {
  selected: UserSummary | null;
  onSelect: (user: UserSummary | null) => void;
  /** user id -> reason it can't be chosen (already owner / member). */
  unavailable: ReadonlyMap<string, string>;
  /** Called when search isn't available so the caller can offer manual ID entry. */
  onUseId: () => void;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const term = useDebouncedValue(input, 300);
  const search = useUserSearch(term);
  const settled = term.trim() === input.trim();
  const long = input.trim().length >= MIN_USER_SEARCH_LENGTH;
  const results = long && settled ? (search.data ?? []) : [];

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2.5">
        <UserAvatar name={selected.name} seed={selected.id} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{selected.name}</p>
          <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Choose someone else" onClick={() => onSelect(null)}>
          <X aria-hidden />
        </Button>
      </div>
    );
  }

  const choose = (user: UserSummary) => {
    if (unavailable.has(user.id)) return;
    onSelect(user);
    setInput("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const user = results[active];
      if (user) choose(user);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const notAvailable = isApiError(search.error) && (search.error.isNotFound || search.error.status === 405);
  const busy = long && (!settled || search.isFetching) && !search.isError;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="member-search"
          role="combobox"
          aria-expanded={open && long}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${results[active]!.id}` : undefined}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="Search by name or email…"
          maxLength={100}
          className="pl-8"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {busy && <Loader2 aria-hidden className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      <div aria-live="polite" className="text-xs text-muted-foreground">
        {!long && "Type at least 2 characters to search."}
        {long && !busy && !search.isError && results.length === 0 && `No one matches “${input.trim()}”.`}
      </div>

      {search.isError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {notAvailable ? "People search isn't available on this server yet." : "We couldn't search for people."}{" "}
          {notAvailable ? (
            <button type="button" className="font-medium underline" onClick={onUseId}>
              Add by user ID instead
            </button>
          ) : (
            <button type="button" className="font-medium underline" onClick={() => void search.refetch()}>
              Try again
            </button>
          )}
        </div>
      )}

      {open && long && results.length > 0 && (
        <ul id={listId} role="listbox" aria-label="People" className="max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-sm">
          {results.map((user, i) => {
            const reason = unavailable.get(user.id);
            return (
              <li
                key={user.id}
                id={`${listId}-${user.id}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={Boolean(reason)}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(user)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2",
                  i === active && "bg-accent",
                  reason && "cursor-not-allowed opacity-60",
                )}
              >
                <UserAvatar name={user.name} seed={user.id} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                {reason && <span className="shrink-0 text-xs text-muted-foreground">{reason}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
