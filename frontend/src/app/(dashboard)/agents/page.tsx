"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Bot, Check, MoreVertical, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/use-api";
import { cn, formatDate } from "@/lib/utils";
import type { Agent } from "@/lib/types";

function AgentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forCampaign = searchParams.get("for") === "campaign";
  const returnTo = searchParams.get("return") || "/campaigns/new";

  const { data: agents, loading, error } = useApi<Agent[]>("/agents");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedAgent = agents?.find((a) => a.id === selectedId);

  function continueWithAgent() {
    if (!selectedId) return;
    router.push(`${returnTo}?agentId=${selectedId}`);
  }

  return (
    <div className={cn("space-y-6", forCampaign && selectedId && "pb-24")}>
      <PageHeader
        title={forCampaign ? "Select an agent" : "AI Agents"}
        description={
          forCampaign
            ? "Pick the voice agent for your outbound campaign, then continue to campaign setup."
            : "Configure, publish, and monitor voice agents that handle inbound and outbound calls for your workspace."
        }
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          ...(forCampaign
            ? [
                { label: "Campaigns", href: "/campaigns" },
                { label: "Select agent" },
              ]
            : [
                { label: "Voice AI", href: "/agents" },
                { label: "Agents" },
              ]),
        ]}
        action={
          forCampaign ? (
            <Link href="/campaigns">
              <Button variant="outline">Cancel</Button>
            </Link>
          ) : (
            <Link href="/agents/new">
              <Button>
                <Plus className="size-4" /> New Agent
              </Button>
            </Link>
          )
        }
      />

      {forCampaign && (
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Click an agent to select it, then press{" "}
            <span className="font-medium text-foreground">Continue</span> to set
            up your campaign. Use{" "}
            <span className="font-medium text-foreground">Edit</span> to open the
            full agent editor.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Bot}
          title="Couldn't load agents"
          description={error}
        />
      ) : !agents || agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description={
            forCampaign
              ? "Create an agent before starting a campaign."
              : "Create your first AI voice agent to start handling calls."
          }
          action={
            <Link href="/agents/new">
              <Button>
                <Plus className="size-4" /> Create Agent
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const isSelected = forCampaign && selectedId === agent.id;

            if (forCampaign) {
              return (
                <Card
                  key={agent.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(agent.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(agent.id);
                    }
                  }}
                  className={cn(
                    "card-shine h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "hover:border-primary/30"
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-transparent text-primary ring-1 ring-primary/15">
                        <Bot className="size-5" />
                      </div>
                      {isSelected ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" />
                        </span>
                      ) : (
                        <MoreVertical className="size-4 text-muted-foreground/60" />
                      )}
                    </div>
                    <h3 className="mt-4 font-semibold">{agent.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {agent.description || "No description"}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                      <StatusBadge status={agent.status} />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatDate(agent.created_at)}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={`/agents/${agent.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit agent
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Link key={agent.id} href={`/agents/${agent.id}`} className="group">
                <Card className="card-shine h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-transparent text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
                        <Bot className="size-5" />
                      </div>
                      <MoreVertical className="size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                    </div>
                    <h3 className="mt-4 font-semibold transition-colors group-hover:text-primary">
                      {agent.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {agent.description || "No description"}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                      <StatusBadge status={agent.status} />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatDate(agent.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {forCampaign && selectedAgent && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Selected agent</p>
              <p className="font-medium">{selectedAgent.name}</p>
            </div>
            <Button onClick={continueWithAgent}>Continue to campaign setup</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <AgentsPageContent />
    </Suspense>
  );
}
