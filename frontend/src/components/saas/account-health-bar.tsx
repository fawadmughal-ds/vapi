"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { cn, formatNumber } from "@/lib/utils";

export function AccountHealthBar() {
  const { user } = useAuth();
  const { subscription: sub } = useSubscription();

  if (!sub || user?.role === "super_admin") return null;

  const allowance = sub.credit_limit + (sub.topup_credits || 0);
  const usagePct = Math.min(
    (sub.credits_used / Math.max(allowance, 1)) * 100,
    100
  );
  const lowCredits = sub.credits_remaining <= allowance * 0.1;
  const outOfCredits = sub.credits_remaining <= 0;
  const trial = sub.status === "trialing";
  const pastDue = sub.status === "past_due";

  if (
    !outOfCredits &&
    !lowCredits &&
    !trial &&
    !pastDue &&
    user?.is_email_verified
  )
    return null;

  return (
    <div className="space-y-2">
      {!user?.is_email_verified && (
        <HealthBanner
          tone="warning"
          icon={ShieldCheck}
          title="Verify your email"
          description="Confirm your address to unlock outbound calling and team invites."
          action={
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Verify now
              </Button>
            </Link>
          }
        />
      )}
      {pastDue && (
        <HealthBanner
          tone="error"
          icon={CreditCard}
          title="Payment failed"
          description="Update your payment method to restore calling and avoid service interruption."
          action={
            <Link href="/billing">
              <Button size="sm">
                Update billing <ArrowUpRight className="size-3" />
              </Button>
            </Link>
          }
        />
      )}
      {trial && !outOfCredits && (
        <HealthBanner
          tone="info"
          icon={Sparkles}
          title="Free trial active"
          description={`You're on the ${sub.plan} plan. Upgrade before trial ends to keep your agents live.`}
          action={
            <Link href="/billing">
              <Button variant="outline" size="sm">
                View plans
              </Button>
            </Link>
          }
        />
      )}
      {lowCredits && !outOfCredits && (
        <HealthBanner
          tone="warning"
          icon={AlertTriangle}
          title="Credits running low"
          description={`${formatNumber(Math.round(sub.credits_remaining))} credits remaining (${Math.round(usagePct)}% used). Contact your admin or upgrade to avoid interruption.`}
          action={
            <Link href="/billing">
              <Button variant="outline" size="sm">
                Manage billing
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}

function HealthBanner({
  tone,
  icon: Icon,
  title,
  description,
  action,
}: {
  tone: "info" | "warning" | "error";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const styles = {
    info: "border-primary/30 bg-primary/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    error: "border-destructive/30 bg-destructive/5",
  };
  const iconStyles = {
    info: "text-primary",
    warning: "text-amber-400",
    error: "text-destructive",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        styles[tone]
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 size-4 shrink-0", iconStyles[tone])} />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
