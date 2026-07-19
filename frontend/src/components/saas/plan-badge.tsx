import type { PlanTier, SubscriptionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_LABELS: Record<PlanTier, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Scale",
};

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active: "bg-success/10 text-success ring-success/20",
  trialing: "bg-primary/10 text-primary ring-primary/20",
  past_due: "bg-destructive/10 text-destructive ring-destructive/20",
  canceled: "bg-muted text-muted-foreground ring-border",
  inactive: "bg-muted text-muted-foreground ring-border",
};

export function PlanBadge({
  plan,
  status,
  className,
}: {
  plan: PlanTier;
  status?: SubscriptionStatus;
  className?: string;
}) {
  const style = status ? STATUS_STYLES[status] : "bg-primary/10 text-primary ring-primary/20";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        style,
        className
      )}
    >
      {PLAN_LABELS[plan] || plan}
      {status === "trialing" && " · Trial"}
    </span>
  );
}
