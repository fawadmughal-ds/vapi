"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useMarketing } from "@/lib/marketing/store";
import { useSubscription } from "@/lib/subscription";
import type { Agent, Campaign } from "@/lib/types";

export default function CampaignsPage() {
  const router = useRouter();
  const { subscription } = useSubscription();
  const { visiblePlans } = useMarketing();
  const currentPlan = visiblePlans.find((p) => p.backendTier === subscription?.plan);
  const campaignLimit = currentPlan?.limits.campaigns ?? 0;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agentId, setAgentId] = useState("");

  useEffect(() => {
    api.get<Agent[]>("/agents").then(setAgents).catch(() => {});
    api.get<Campaign[]>("/campaigns").then(setCampaigns).catch(() => {});
  }, []);

  const activeCount = campaigns.filter((c) => c.status === "running").length;
  const callsToday = campaigns.reduce((sum, c) => sum + c.called_contacts, 0);

  function openCreateDialog() {
    setAgentId("");
    setDialogOpen(true);
  }

  function continueWithAgent() {
    if (!agentId) {
      toast.error("Select an agent to continue");
      return;
    }
    setDialogOpen(false);
    router.push(`/campaigns/new?agentId=${agentId}`);
  }

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
          <Button onClick={openCreateDialog} disabled={agents.length === 0}>
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
            <p className="text-2xl font-semibold tabular-nums">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calls placed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{callsToday}</p>
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
              {campaigns.length} / {campaignLimit === -1 ? "∞" : campaignLimit}
            </p>
          </CardContent>
        </Card>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first outbound campaign to reach leads at scale with AI voice agents. Assign a phone number and agent, upload contacts, and launch."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {agents.length === 0 ? (
                <Link href="/agents/new">
                  <Button>
                    <Plus className="size-4" /> Create an agent first
                  </Button>
                </Link>
              ) : (
                <Button onClick={openCreateDialog}>
                  <Plus className="size-4" /> Create campaign
                </Button>
              )}
              {agents.length > 0 && (
                <Link href="/agents?for=campaign&return=/campaigns/new">
                  <Button variant="outline">Browse agents</Button>
                </Link>
              )}
            </div>
          }
        />
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="glass-card transition-colors hover:border-primary/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{c.name}</h3>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.agent_name || "Agent"}
                      {c.phone_number ? ` · ${c.phone_number}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold tabular-nums">{c.total_contacts}</p>
                      <p className="text-xs text-muted-foreground">Contacts</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold tabular-nums text-success">
                        {c.called_contacts}
                      </p>
                      <p className="text-xs text-muted-foreground">Called</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold tabular-nums">{c.pending_contacts}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
          <DialogDescription>
            Choose the AI agent that will handle outbound calls for this campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Agent</Label>
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">Select an agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap justify-between gap-2 pt-1">
            <Link href="/agents?for=campaign&return=/campaigns/new">
              <Button variant="outline" type="button">
                Browse all agents
              </Button>
            </Link>
            <Button onClick={continueWithAgent}>Continue</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
