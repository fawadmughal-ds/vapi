import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { AnimatedCounter } from "@/components/shared/animated-counter";
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
    <div className="group glass-card-hover metric-glow card-shine p-5">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              <AnimatedCounter value={value} />
            </p>
          )}
          {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
          {trend && !loading && (
            <p
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                trend.positive ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              {trend.positive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-muted/70 to-violet-500/10 ring-1 ring-primary/15 transition-all duration-300 group-hover:scale-105 group-hover:ring-primary/35",
            accent
          )}
        >
          <Icon className="size-[18px] transition-transform duration-300 group-hover:-rotate-6" />
        </div>
      </div>
    </div>
  );
}
