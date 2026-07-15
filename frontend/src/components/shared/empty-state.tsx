import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-scale-in flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-muted/10 text-center shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]",
        compact ? "py-10 px-6" : "py-16 px-8",
        className
      )}
    >
      <div className="animate-float mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 ring-1 ring-primary/20 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.75)]">
        <Icon className="size-6 text-primary/80" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
