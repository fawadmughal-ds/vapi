"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Receipt,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PlanBadge } from "@/components/saas/plan-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useMarketing } from "@/lib/marketing/store";
import type { BillingInterval } from "@/lib/marketing/types";
import { useApi } from "@/lib/use-api";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { PlanTier, Subscription } from "@/lib/types";

export default function BillingPage() {
  const { data: sub, reload } = useApi<Subscription>("/billing/subscription");
  const { visiblePlans, getPlanPrice } = useMarketing();
  const [checkingOut, setCheckingOut] = useState<PlanTier | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      toast.success("Subscription activated — your workspace is upgraded.");
      reload();
    }
  }, [reload]);

  async function subscribe(plan: PlanTier) {
    setCheckingOut(plan);
    try {
      const res = await api.post<{ checkout_url: string }>("/billing/checkout", {
        plan,
        success_url: `${window.location.origin}/billing?status=success`,
        cancel_url: `${window.location.origin}/billing?status=cancelled`,
      });
      window.location.href = res.checkout_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setCheckingOut(null);
    }
  }

  const allowance = sub ? sub.credit_limit + (sub.topup_credits || 0) : 0;
  const usagePct = sub
    ? Math.min((sub.credits_used / Math.max(allowance, 1)) * 100, 100)
    : 0;
  const currentMarketingPlan = visiblePlans.find(
    (p) => p.backendTier === sub?.plan
  );
  const limits = currentMarketingPlan?.limits;
  const nearLimit = usagePct >= 85;
  const pastDue = sub?.status === "past_due";

  const upgradePlans = visiblePlans.filter(
    (p) => p.backendTier && !p.isEnterprise && p.isVisible
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & usage"
        description="Manage your subscription, monitor credit consumption, and upgrade when your workspace grows."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Billing" },
        ]}
        badge={sub ? <PlanBadge plan={sub.plan} status={sub.status} /> : undefined}
      />

      {pastDue && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium">Payment failed</p>
            <p className="text-xs text-muted-foreground">
              Update your payment method to restore full calling capacity. Agents
              may be paused if billing is not resolved.
            </p>
          </div>
        </div>
      )}

      {sub && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  Current plan
                  <StatusBadge status={sub.status} />
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Credit-based usage for this billing period
                </p>
              </div>
              <span className="text-sm font-semibold capitalize text-primary">
                {sub.plan}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits consumed</span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(Math.round(sub.credits_used))} /{" "}
                    {formatNumber(Math.round(allowance))}
                  </span>
                </div>
                <Progress
                  value={usagePct}
                  className={cn("h-2", nearLimit && "[&>div]:bg-amber-400")}
                />
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatNumber(Math.round(sub.credits_remaining))} credits
                    remaining
                  </span>
                  {sub.topup_credits > 0 && (
                    <span className="text-emerald-400">
                      +{formatNumber(Math.round(sub.topup_credits))} top-up credits
                    </span>
                  )}
                </div>
              </div>
              {nearLimit && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                  Approaching plan limit — upgrade to avoid call interruptions.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plan limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {limits ? (
                <>
                  {[
                    { label: "AI agents", value: limits.aiAgents },
                    { label: "Phone numbers", value: limits.phoneNumbers },
                    { label: "Campaigns", value: limits.campaigns },
                    { label: "Team members", value: limits.teamMembers },
                    {
                      label: "Call minutes (plan)",
                      value: formatNumber(limits.callMinutes),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium tabular-nums">{row.value}</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-muted-foreground">Plan limits loading…</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Upgrade plan</h2>
          <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium",
                interval === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium",
                interval === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {upgradePlans.map((plan) => {
            const isCurrent = sub?.plan === plan.backendTier;
            const isPopular = plan.isPopular;
            const price = getPlanPrice(plan, interval);
            return (
              <Card
                key={plan.planId}
                className={cn(
                  "glass-card-hover relative flex flex-col",
                  isPopular && "border-primary/40 glow-sm"
                )}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg">
                    <Sparkles className="size-3" /> Most popular
                  </span>
                )}
                <CardHeader>
                  <CardTitle>{plan.planName}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-semibold tracking-tight">
                      {formatCurrency(price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{interval === "yearly" ? "year" : "month"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.limits.callMinutes.toLocaleString()} call minutes included
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-2.5">
                    {plan.features.slice(0, 6).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={isPopular ? "default" : "outline"}
                    disabled={isCurrent || checkingOut !== null || !plan.backendTier}
                    onClick={() => plan.backendTier && subscribe(plan.backendTier)}
                  >
                    {checkingOut === plan.backendTier && <Spinner />}
                    {isCurrent ? "Current plan" : plan.ctaLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="glass-card border-dashed">
          <CardContent className="flex items-start gap-3 p-5">
            <Receipt className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Invoices</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Download past invoices and usage statements from the billing portal
                after your first paid subscription.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-dashed">
          <CardContent className="flex items-start gap-3 p-5">
            <CreditCard className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Payment method</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Manage cards and billing details through Stripe during checkout or
                from your customer portal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Zap className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Need Enterprise?</p>
              <p className="text-xs text-muted-foreground">
                Custom limits, SSO, dedicated support, and compliance packages for
                large teams.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
          >
            Contact sales
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
