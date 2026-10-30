import type { ReactNode } from "react";
import { CheckCircle2, KanbanSquare, Users } from "lucide-react";
import { Logo } from "@/components/shared/logo";

const POINTS = [
  { icon: KanbanSquare, text: "Plan projects and move tasks across a board or list" },
  { icon: Users, text: "Invite teammates and assign work with clear ownership" },
  { icon: CheckCircle2, text: "Track progress with live project statistics" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10 blur-3xl" />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Everything your team is working on, in one place.</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-primary-foreground/90">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
