import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
  indicatorClassName,
}: {
  value?: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted/70 shadow-[inset_0_1px_2px_hsl(230_54%_2%/0.4)]",
        className
      )}
    >
      <div
        className={cn(
          "relative h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-violet-400 shadow-[0_0_12px_-2px_hsl(var(--glow-primary)/0.7)] transition-[width] duration-700 ease-out",
          indicatorClassName
        )}
        style={{ width: `${pct}%` }}
      >
        <span className="absolute inset-0 animate-shimmer rounded-full bg-[linear-gradient(100deg,transparent_20%,hsl(var(--foreground)/0.25)_40%,transparent_60%)]" />
      </div>
    </div>
  );
}
