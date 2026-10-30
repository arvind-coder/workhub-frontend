import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground", className)}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6l3.5 12L12 9l4.5 9L20 6" />
      </svg>
    </span>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && <span className="text-[17px] font-semibold tracking-tight">WorkHub</span>}
    </span>
  );
}
