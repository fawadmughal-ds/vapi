"use client";

import Link from "next/link";
import { Bot, MoreVertical, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export default function AgentsPage() {
  const { data: agents, loading } = useApi<Agent[]>("/agents");

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agents"
        description="Configure, publish, and monitor voice agents that handle inbound and outbound calls for your workspace."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Voice AI", href: "/agents" },
          { label: "Agents" },
        ]}
        action={
          <Link href="/agents/new">
            <Button>
              <Plus className="size-4" /> New Agent
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first AI voice agent to start handling calls."
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
          {agents.map((agent) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
