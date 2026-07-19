"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Coins,
  Phone,
  PhoneCall,
  Plug,
  Plus,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { AccountHealthBar } from "@/components/saas/account-health-bar";
import { PlanBadge } from "@/components/saas/plan-badge";
import { SetupChecklist } from "@/components/saas/setup-checklist";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { useWorkspaceSetup } from "@/lib/use-workspace-setup";
import { useApi } from "@/lib/use-api";
import {
  formatDateTime,
  formatDuration,
  formatNumber,
} from "@/lib/utils";
import type { AnalyticsResponse, Call, Page } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: analytics, loading } = useApi<AnalyticsResponse>("/analytics");
  const { data: calls } = useApi<Page<Call>>("/calls?page=1&page_size=5");
  const { subscription } = useSubscription();
  const setup = useWorkspaceSetup(user?.is_email_verified ?? false);

  const s = analytics?.summary;
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Good ${timeOfDay()}, ${firstName}`}
        description="Your workspace command center — monitor agents, calls, usage, and next actions."
        badge={
          subscription ? (
            <PlanBadge plan={subscription.plan} status={subscription.status} />
          ) : undefined
        }
        breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Home" }]}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/phone-numbers">
              <Button variant="outline" size="sm">
                <Phone className="size-4" /> Add number
              </Button>
            </Link>
            <Link href="/agents/new">
              <Button size="sm">
                <Plus className="size-4" /> New agent
              </Button>
            </Link>
          </div>
        }
      />

      <AccountHealthBar />

      {!setup.isComplete && !setup.loading && (
        <SetupChecklist verified={user?.is_email_verified ?? false} />
      )}

      <div className="reveal grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total calls"
          value={formatNumber(s?.total_calls)}
          icon={PhoneCall}
          loading={loading}
          hint="All-time workspace volume"
        />
        <StatCard
          label="Credits remaining"
          value={formatNumber(subscription?.credits_remaining)}
          icon={Wallet}
          loading={loading}
          accent="text-primary"
          hint={
            subscription
              ? `${formatNumber(subscription.credits_used)} used this period`
              : undefined
          }
        />
        <StatCard
          label="Success rate"
          value={`${s?.success_rate ?? 0}%`}
          icon={TrendingUp}
          loading={loading}
          accent="text-success"
          trend={
            s && s.total_calls > 0
              ? { value: "Call completion health", positive: (s.success_rate ?? 0) >= 80 }
              : undefined
          }
        />
        <StatCard
          label="Active resources"
          value={setup.counts.agents + setup.counts.numbers}
          icon={Bot}
          loading={setup.loading}
          accent="text-violet-500"
          hint={`${setup.counts.agents} agents · ${setup.counts.numbers} numbers · ${setup.counts.integrations} providers`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="glass-card xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Recent call activity</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Latest conversations across all agents in this workspace
              </p>
            </div>
            <Link href="/calls">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!calls ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : calls.items.length === 0 ? (
              <EmptyState
                compact
                icon={PhoneCall}
                title="No calls yet"
                description="Publish an agent and connect a phone number to start handling live conversations."
                action={
                  <Link href="/agents/new">
                    <Button size="sm">
                      <Zap className="size-4" /> Create your first agent
                    </Button>
                  </Link>
                }
                className="border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Caller</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.items.map((c) => (
                    <TableRow key={c.id} className="group">
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span
                            className={
                              c.status === "in_progress"
                                ? "status-dot status-dot-live"
                                : c.status === "completed"
                                  ? "status-dot bg-success/60"
                                  : "status-dot bg-muted-foreground/30"
                            }
                          />
                          {c.caller_number || c.callee_number || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.agent_name || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDuration(c.duration_seconds)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDateTime(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  icon: Bot,
                  label: "Deploy an AI agent",
                  href: "/agents/new",
                  done: setup.counts.agents > 0,
                },
                {
                  icon: Phone,
                  label: "Connect a phone number",
                  href: "/phone-numbers",
                  done: setup.counts.numbers > 0,
                },
                {
                  icon: Plug,
                  label: "Enable a voice provider",
                  href: "/providers",
                  done: setup.counts.integrations > 0,
                },
                {
                  icon: Coins,
                  label: "Review billing & limits",
                  href: "/billing",
                  done: false,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group/step flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5 transition-all hover:-translate-y-px hover:border-primary/30 hover:bg-accent/30"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15 transition-colors group-hover/step:bg-primary/15">
                    <item.icon className="size-4 text-primary/90" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.done ? (
                    <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-success">
                      Done
                    </span>
                  ) : (
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover/step:translate-x-0.5" />
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top performing agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!analytics ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : analytics.agent_performance.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Agent metrics appear after your first calls.
                </p>
              ) : (
                analytics.agent_performance.slice(0, 5).map((a, i) => (
                  <div
                    key={a.agent_id}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-2 transition-all hover:border-primary/25 hover:bg-muted/20"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.agent_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.calls} calls · avg {formatDuration(a.avg_duration_seconds)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-success">
                      {a.success_rate}%
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
