import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  accent = "text-primary",
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  accent?: string;
  trend?: { value: string; positive?: boolean };
}) {
  return (
    <div className="glass-card-hover metric-glow p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
          )}
          {hint && (
            <p className="text-xs text-muted-foreground/80">{hint}</p>
          )}
          {trend && !loading && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-muted/70 to-violet-500/10 ring-1 ring-primary/15",
            accent
          )}
        >
          <Icon className="size-[18px]" />
        </div>
      </div>
    </div>
  );
}
