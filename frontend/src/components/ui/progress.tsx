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
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
    >
      <div
        className={cn(
          "relative h-full rounded-full bg-primary transition-[width] duration-700 ease-out",
          indicatorClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
