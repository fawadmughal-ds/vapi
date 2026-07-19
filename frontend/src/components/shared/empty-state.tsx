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
        "animate-scale-in flex flex-col items-center justify-center rounded-chamfer-lg border border-dashed border-border bg-muted/30 text-center",
        compact ? "py-10 px-6" : "py-16 px-8",
        className
      )}
    >
      <div className="animate-float mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="size-6 text-primary" />
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
