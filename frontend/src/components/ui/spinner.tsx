import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent border-b-transparent opacity-90",
        className
      )}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
      <div className="relative size-10">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/15 border-t-primary" />
      </div>
      <p className="telemetry-label animate-pulse">Loading workspace</p>
    </div>
  );
}
