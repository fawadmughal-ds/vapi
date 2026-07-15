import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(100deg,hsl(var(--muted)/0.4)_20%,hsl(var(--muted-foreground)/0.14)_40%,hsl(var(--muted)/0.4)_60%)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
