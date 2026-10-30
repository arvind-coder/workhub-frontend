"use client";

import { Copy, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/components/layout/user-menu";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useCurrentUser } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/dates";
import { ROLE_LABEL } from "@/lib/utils/labels";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsView() {
  const { data: me } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const { signOut, pending } = useSignOut();

  const copyId = async () => {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.id);
      toast.success("User ID copied");
    } catch {
      toast.error("Couldn't copy. Select the ID and copy it manually.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account and preferences." />
      <div className="grid max-w-3xl gap-4">
        <Section title="Profile" description="Profile details are managed by your organisation; the API doesn't support editing them here.">
          {me && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <UserAvatar name={me.name} seed={me.id} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{me.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{me.email}</p>
                </div>
              </div>
              <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Role</dt>
                <dd>{ROLE_LABEL[me.role]}</dd>
                <dt className="text-muted-foreground">Member since</dt>
                <dd>{formatDate(me.createdAt)}</dd>
                <dt className="text-muted-foreground">User ID</dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">{me.id}</code>
                  <Button variant="outline" size="xs" onClick={() => void copyId()}>
                    <Copy aria-hidden /> Copy
                  </Button>
                </dd>
              </dl>
              <p className="text-xs text-muted-foreground">Share your user ID with a project manager so they can add you to a project.</p>
            </div>
          )}
        </Section>

        <Section title="Appearance" description="Choose how WorkHub looks on this device.">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3 sm:max-w-md">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const selected = (theme ?? "system") === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected && "border-primary bg-primary/5 text-primary",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Session" description="Signing out ends your session on this device and revokes its refresh token.">
          <Button variant="outline" disabled={pending} onClick={signOut}>
            <LogOut aria-hidden /> Sign out
          </Button>
        </Section>
      </div>
    </div>
  );
}
