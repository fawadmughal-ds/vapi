"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketing } from "@/lib/marketing/store";
import type { BillingInterval } from "@/lib/marketing/types";
import { cn, formatCurrency } from "@/lib/utils";

export function PricingCards({
  compact,
  showToggle = true,
}: {
  compact?: boolean;
  showToggle?: boolean;
}) {
  const { visiblePlans, loading, getPlanPrice } = useMarketing();
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  if (loading) {
    return (
      <div className={cn("grid gap-5", compact ? "lg:grid-cols-3" : "lg:grid-cols-4 xl:grid-cols-5")}>
        {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const displayPlans = compact
    ? visiblePlans.filter((p) => !p.isEnterprise).slice(0, 3)
    : visiblePlans;

  return (
    <div>
      {showToggle && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                interval === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                interval === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Yearly <span className="text-success">Save 20%</span>
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid gap-5",
          compact
            ? "lg:grid-cols-3"
            : "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {displayPlans.map((plan) => {
          const price = getPlanPrice(plan, interval);
          return (
            <div
              key={plan.planId}
              className={cn(
                "glass-card-hover relative flex flex-col p-6",
                plan.isPopular && "border-primary/40 glow-sm",
                plan.isEnterprise && "aurora-border"
              )}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <Sparkles className="size-3" /> Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.planName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4">
                {plan.isEnterprise ? (
                  <span className="text-2xl font-semibold">Custom</span>
                ) : plan.monthlyPrice === 0 && plan.planId === "trial" ? (
                  <span className="text-2xl font-semibold">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-semibold tracking-tight">
                      {formatCurrency(price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{interval === "yearly" ? "year" : "mo"}
                    </span>
                  </>
                )}
              </div>
              {plan.trialEnabled && plan.trialDays > 0 && !plan.isEnterprise && (
                <p className="mt-1 text-xs text-primary">
                  {plan.trialDays}-day free trial included
                </p>
              )}
              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.slice(0, compact ? 5 : 8).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.ctaUrl} className="mt-6 block">
                <Button
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                >
                  {plan.ctaLabel}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
