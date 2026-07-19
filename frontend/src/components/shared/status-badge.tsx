import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<string, BadgeProps["variant"]> = {
  // calls
  completed: "success",
  in_progress: "default",
  ringing: "default",
  queued: "secondary",
  failed: "destructive",
  no_answer: "warning",
  busy: "warning",
  // agents
  published: "success",
  draft: "secondary",
  disabled: "destructive",
  // orders
  confirmed: "default",
  fulfilled: "success",
  pending: "warning",
  canceled: "destructive",
  // subscription / account
  active: "success",
  trialing: "default",
  past_due: "warning",
  inactive: "secondary",
  suspended: "destructive",
  // phone numbers
  assigned: "success",
  available: "secondary",
  released: "destructive",
  // documents
  ready: "success",
  processing: "warning",
  uploading: "secondary",
};

const DOT: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-primary",
  secondary: "bg-muted-foreground/50",
  success: "bg-success",
  warning: "bg-amber-400",
  destructive: "bg-destructive",
  outline: "bg-muted-foreground/50",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = MAP[status] ?? "secondary";
  const label = status.replace(/_/g, " ");
  const live = status === "in_progress" || status === "ringing";
  return (
    <Badge variant={variant} className="gap-1.5 capitalize">
      <span
        className={cn(
          "size-1.5 rounded-full",
          DOT[variant ?? "secondary"],
          live && "animate-pulse"
        )}
      />
      {label}
    </Badge>
  );
}
