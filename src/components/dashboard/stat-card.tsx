import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  loading,
  tone = "default",
}: {
  label: string;
  value?: number | string;
  icon: LucideIcon;
  hint?: string;
  href?: string;
  loading?: boolean;
  tone?: "default" | "danger" | "success";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          aria-hidden
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            tone === "danger" && "bg-priority-high/10 text-priority-high",
            tone === "success" && "bg-status-done/10 text-status-done",
            tone === "default" && "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value ?? "—"}</p>}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border bg-card p-4 shadow-xs";
  return href ? (
    <Link href={href} className={cn(cls, "outline-none transition-all hover:border-primary/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
