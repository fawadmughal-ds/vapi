import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border/90 bg-muted/25 px-3 py-1 text-sm shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] transition-all placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
