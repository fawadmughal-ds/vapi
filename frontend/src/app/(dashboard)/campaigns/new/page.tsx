"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Bot, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import type { Agent, Campaign, PhoneNumber } from "@/lib/types";

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!agentId || !name.trim() || !phoneNumberId) return;
    setCreating(true);
    try {
      const campaign = await api.post<Campaign>("/campaigns", {
        name: name.trim(),
        agent_id: agentId,
        phone_number_id: phoneNumberId,
      });
      toast.success("Campaign created — now add contacts.");
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not create campaign"
      );
      setCreating(false);
    }
  }

  useEffect(() => {
    if (!agentId) {
      router.replace("/campaigns");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [agentData, numbers] = await Promise.all([
          api.get<Agent>(`/agents/${agentId}`),
          api.get<PhoneNumber[]>("/phone-numbers"),
        ]);
        if (cancelled) return;
        setAgent(agentData);
        setPhoneNumbers(numbers);
        if (numbers.length === 1) {
          setPhoneNumberId(numbers[0].id);
        }
      } catch {
        if (!cancelled) router.replace("/campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [agentId, router]);

  if (!agentId || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="New campaign"
        description="Set up an outbound call campaign with your selected agent."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Campaigns", href: "/campaigns" },
          { label: "New campaign" },
        ]}
        action={
          <Link href="/campaigns">
            <Button variant="outline">
              <ArrowLeft className="size-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card className="glass-card border-primary/20">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Selected agent
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{agent.name}</h2>
              <StatusBadge status={agent.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {agent.description || "No description"}
            </p>
          </div>
          <Link href={`/agents/${agent.id}`}>
            <Button variant="outline" size="sm">
              Edit agent
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            <h3 className="font-semibold">Campaign details</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input
              id="campaign-name"
              placeholder="e.g. Q1 lead follow-up"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campaign-phone">Outbound phone number</Label>
            {phoneNumbers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                No phone numbers yet.{" "}
                <Link href="/phone-numbers" className="text-primary hover:underline">
                  Add a number
                </Link>{" "}
                before launching a campaign.
              </div>
            ) : (
              <Select
                id="campaign-phone"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              >
                <option value="">Select a phone number…</option>
                {phoneNumbers.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label || n.e164_number}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            After creating the campaign you can upload a contact list (CSV) and
            launch outbound calls.
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !phoneNumberId || creating}
              title={
                !name.trim() || !phoneNumberId
                  ? "Enter a name and select a phone number"
                  : undefined
              }
            >
              {creating ? "Creating…" : "Create campaign"}
            </Button>
            <Link href="/campaigns">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      }
    >
      <NewCampaignContent />
    </Suspense>
  );
}
