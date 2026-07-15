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
      <div className="relative size-12">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/15 border-t-primary" />
        <span
          className="absolute inset-1.5 animate-spin rounded-full border-2 border-violet-400/15 border-b-violet-400/80"
          style={{ animationDirection: "reverse", animationDuration: "1.1s" }}
        />
        <span className="absolute inset-0 rounded-full bg-primary/10 blur-md" />
      </div>
      <p className="telemetry-label animate-pulse">Loading workspace</p>
    </div>
  );
}
