import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils/labels";

const TONES = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/20 text-foreground",
  "bg-chart-5/15 text-chart-5",
];

function tone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length]!;
}

export function UserAvatar({
  name,
  seed,
  size = "default",
  className,
}: {
  name?: string | null;
  seed?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className} aria-label={name ?? "Unknown user"}>
      <AvatarFallback className={cn("font-medium", tone(seed ?? name ?? "?"))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
