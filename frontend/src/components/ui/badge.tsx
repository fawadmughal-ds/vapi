import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/10 text-primary shadow-[0_0_16px_-10px_hsl(var(--primary)/0.9)]",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        warning: "border-transparent bg-amber-500/15 text-amber-400",
        destructive: "border-transparent bg-destructive/15 text-destructive",
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
