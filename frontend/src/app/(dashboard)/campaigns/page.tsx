"use client";

import Link from "next/link";
import { Megaphone, Plus, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarketing } from "@/lib/marketing/store";
import { useSubscription } from "@/lib/subscription";

export default function CampaignsPage() {
  const { subscription } = useSubscription();
  const { visiblePlans } = useMarketing();
  const currentPlan = visiblePlans.find((p) => p.backendTier === subscription?.plan);
  const campaignLimit = currentPlan?.limits.campaigns ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaigns"
        description="Launch outbound call campaigns with AI agents — schedule batches, track outcomes, and scale outreach."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Campaigns" },
        ]}
        action={
          <Button disabled>
            <Plus className="size-4" /> New campaign
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calls placed today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              0 / {campaignLimit === -1 ? "∞" : campaignLimit}
            </p>
          </CardContent>
        </Card>
      </div>

      <EmptyState
        icon={Megaphone}
        title="No campaigns yet"
        description="Create your first outbound campaign to reach leads at scale with AI voice agents. Assign a phone number and agent, upload contacts, and launch."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button disabled>
              <Plus className="size-4" /> Create campaign
            </Button>
            <Link
              href="/agents"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              Configure an agent first
            </Link>
          </div>
        }
      />

      <Card className="glass-card border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-5">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Campaign automation</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Schedule outbound batches, set retry rules, track connect rates, and
              sync outcomes to your CRM via webhooks. Campaign limits are set by
              your{" "}
              <Link href="/billing" className="text-primary hover:underline">
                billing plan
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
