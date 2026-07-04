"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  Bot,
  CheckCircle2,
  Coins,
  DollarSign,
  LogIn,
  PhoneCall,
  Plug,
  RefreshCw,
  ScrollText,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AuditLogTable } from "@/components/dashboard/audit-log-table";
import { AdminAnalytics } from "@/components/dashboard/admin-analytics";
import {
  AdminAgentsTable,
  AdminCallsTable,
  AdminKnowledgeBaseTable,
  AdminPhoneNumbersTable,
  AdminSquadsTable,
  AdminToolsTable,
} from "@/components/dashboard/admin-resource-tables";
import { PlatformCredits } from "@/components/dashboard/platform-credits";
import { VapiBalance } from "@/components/dashboard/vapi-balance";
import { TenantIntegrationsManager } from "@/components/dashboard/tenant-integrations-panel";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FullPageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type {
  AdminUserRow,
  Page,
  PlanTier,
  PlatformStats,
  SyncResult,
} from "@/lib/types";

const PLANS: PlanTier[] = ["starter", "growth", "pro"];

type AdminTab =
  | "customers"
  | "agents"
  | "squads"
  | "tools"
  | "calls"
  | "numbers"
  | "knowledge"
  | "analytics"
  | "logs";

const TAB_META: Record<AdminTab, { title: string; description: string }> = {
  customers: {
    title: "Admin Console",
    description: "Platform-wide visibility and customer management.",
  },
  agents: {
    title: "Agents",
    description: "Every AI agent created across all tenants.",
  },
  squads: {
    title: "Squads",
    description: "Agent squads configured across all tenants.",
  },
  tools: {
    title: "Tools",
    description: "Function tools configured by tenants.",
  },
  calls: {
    title: "Calls",
    description: "All call activity across the platform.",
  },
  numbers: {
    title: "Phone Numbers",
    description: "Provisioned numbers across all tenants.",
  },
  knowledge: {
    title: "Knowledge Base",
    description: "Documents uploaded by tenants.",
  },
  analytics: {
    title: "Analytics",
    description: "Platform-wide performance across every tenant.",
  },
  logs: {
    title: "System Logs",
    description: "Audit trail of platform-wide activity.",
  },
};

function AdminConsole() {
  const { user, loading: authLoading, impersonate } = useAuth();
  const searchParams = useSearchParams();
  const tab = ((searchParams.get("tab") as AdminTab) || "customers") as AdminTab;
  const { data: stats, reload: reloadStats } = useApi<PlatformStats>("/admin/stats");
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<AdminUserRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityUser, setActivityUser] = useState<AdminUserRow | null>(null);
  const [creditUser, setCreditUser] = useState<AdminUserRow | null>(null);
  const [integrationsUser, setIntegrationsUser] = useState<AdminUserRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: "15" });
    if (debounced) params.set("search", debounced);
    api
      .get<Page<AdminUserRow>>(`/admin/customers?${params.toString()}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, debounced]);

  async function toggleStatus(u: AdminUserRow) {
    const action = u.status === "active" ? "suspend" : "activate";
    try {
      await api.post(`/admin/customers/${u.id}/${action}`);
      toast.success(`Account ${action}d`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function setPlan(u: AdminUserRow, plan: PlanTier) {
    try {
      await api.post(`/admin/customers/${u.id}/plan/${plan}`);
      toast.success(`Plan set to ${plan}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function syncFromProvider() {
    setSyncing(true);
    try {
      const res = await api.post<SyncResult>("/admin/sync/all", {});
      const parts = [
        res.agents && `${res.agents.imported} agents`,
        res.calls && `${res.calls.imported} calls`,
        res.integrations && `${res.integrations.imported} integrations`,
      ].filter(Boolean);
      toast.success(
        parts.length ? `Imported ${parts.join(", ")}` : "Everything already in sync"
      );
      reloadStats();
      load();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function enterAccount(u: AdminUserRow) {
    try {
      await impersonate(u.id);
      toast.success(`Viewing as ${u.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enter account");
    }
  }

  if (authLoading) return <FullPageSpinner />;
  if (user?.role !== "super_admin") {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          You don&apos;t have access to the admin console.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={TAB_META[tab].title}
        description={TAB_META[tab].description}
        action={
          <Button variant="outline" onClick={syncFromProvider} disabled={syncing}>
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync from Vapi"}
          </Button>
        }
      />

      {tab === "customers" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Customers"
              value={formatNumber(stats?.total_customers)}
              icon={Users}
              loading={!stats}
            />
            <StatCard
              label="Agents"
              value={formatNumber(stats?.total_agents)}
              icon={Bot}
              loading={!stats}
              accent="text-indigo-400"
            />
            <StatCard
              label="Total Calls"
              value={formatNumber(stats?.total_calls)}
              icon={PhoneCall}
              loading={!stats}
              accent="text-sky-400"
            />
            <StatCard
              label="Est. MRR"
              value={formatCurrency(stats?.total_revenue_estimate)}
              icon={DollarSign}
              loading={!stats}
              accent="text-emerald-400"
            />
            <StatCard
              label="Provider Cost"
              value={formatCurrency(stats?.total_cost)}
              icon={DollarSign}
              loading={!stats}
              accent="text-amber-400"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PlatformCredits />
            <VapiBalance />
          </div>
        </>
      )}

      {tab === "agents" && <AdminAgentsTable key={`agents-${refreshKey}`} />}
      {tab === "squads" && <AdminSquadsTable key={`squads-${refreshKey}`} />}
      {tab === "tools" && <AdminToolsTable key={`tools-${refreshKey}`} />}
      {tab === "calls" && <AdminCallsTable key={`calls-${refreshKey}`} />}
      {tab === "numbers" && <AdminPhoneNumbersTable key={`numbers-${refreshKey}`} />}
      {tab === "knowledge" && <AdminKnowledgeBaseTable key={`kb-${refreshKey}`} />}
      {tab === "analytics" && <AdminAnalytics />}

      {tab === "logs" && (
        <Card>
          <CardContent className="p-4">
            <AuditLogTable path="/admin/audit-logs" />
          </CardContent>
        </Card>
      )}

      {tab === "customers" && (
      <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Real spend</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.plan || "starter"}
                        onChange={(e) =>
                          setPlan(u, e.target.value as PlanTier)
                        }
                        className="h-8 w-28"
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatNumber(u.credits_remaining)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        / {formatNumber(u.credit_limit + u.topup_credits)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(u.total_cost)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatNumber(u.minutes_used)} min · {formatNumber(u.credits_used)} cr
                      </span>
                    </TableCell>
                    <TableCell>{u.agent_count}</TableCell>
                    <TableCell>{u.call_count}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIntegrationsUser(u)}
                        >
                          <Plug className="size-4" /> Integrations
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCreditUser(u)}
                        >
                          <Coins className="size-4" /> Credits
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActivityUser(u)}
                        >
                          <ScrollText className="size-4" /> Activity
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => enterAccount(u)}
                        >
                          <LogIn className="size-4" /> Enter
                        </Button>
                        <Button
                          variant={u.status === "active" ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleStatus(u)}
                        >
                          {u.status === "active" ? (
                            <>
                              <Ban className="size-4" /> Suspend
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4" /> Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
      </>
      )}

      <Dialog
        open={!!activityUser}
        onClose={() => setActivityUser(null)}
        className="max-w-3xl"
      >
        {activityUser && (
          <>
            <DialogHeader>
              <DialogTitle>Activity — {activityUser.name}</DialogTitle>
              <DialogDescription>
                Recent actions performed by {activityUser.email}.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              <AuditLogTable
                path={`/admin/customers/${activityUser.id}/activity`}
                pageSize={15}
              />
            </div>
          </>
        )}
      </Dialog>

      <Dialog
        open={!!integrationsUser}
        onClose={() => setIntegrationsUser(null)}
        className="max-w-lg"
      >
        {integrationsUser && (
          <>
            <DialogHeader>
              <DialogTitle>Integrations — {integrationsUser.name}</DialogTitle>
              <DialogDescription>
                Choose which connected providers this tenant may use.
              </DialogDescription>
            </DialogHeader>
            <TenantIntegrationsManager
              userId={integrationsUser.id}
              userName={integrationsUser.name}
            />
          </>
        )}
      </Dialog>

      <CreditManager
        user={creditUser}
        onClose={() => setCreditUser(null)}
        onSaved={() => {
          setCreditUser(null);
          load();
        }}
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <AdminConsole />
    </Suspense>
  );
}

function CreditManager({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [limit, setLimit] = useState("");
  const [adjust, setAdjust] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setLimit(String(user.credit_limit));
      setAdjust("");
    }
  }, [user]);

  const adjustNum = adjust === "" || adjust === "-" ? 0 : Number(adjust);
  const newLimit =
    limit === "" ? (user?.credit_limit ?? 0) : Number(limit) || 0;

  // Mirror the backend: give -> top-up wallet; take back -> top-up first, then allowance.
  const give = adjustNum > 0 ? adjustNum : 0;
  let take = adjustNum < 0 ? -adjustNum : 0;
  let projectedTopup = (user?.topup_credits ?? 0) + give;
  let limitAfter = newLimit;
  if (take > 0) {
    const fromTopup = Math.min(take, projectedTopup);
    projectedTopup -= fromTopup;
    take -= fromTopup;
    if (take > 0) {
      const periodRem = Math.max(limitAfter - (user?.credits_used ?? 0), 0);
      limitAfter = Math.max(limitAfter - Math.min(take, periodRem), 0);
    }
  }
  const projectedPeriod = Math.max(limitAfter - (user?.credits_used ?? 0), 0);
  const projectedRemaining = projectedPeriod + projectedTopup;

  // Can't take back more credits than the tenant currently has.
  const takeTooMuch =
    !!user && adjustNum < 0 && -adjustNum > user.credits_remaining;

  function bumpAdjust(delta: number) {
    const base = Number.isFinite(adjustNum) ? adjustNum : 0;
    let next = base + delta;
    // Don't let the take-back exceed the tenant's current balance.
    if (user && next < 0 && -next > user.credits_remaining) {
      next = -user.credits_remaining;
    }
    setAdjust(String(next));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await api.post(`/admin/customers/${user.id}/credits`, {
        credit_limit: limit === "" ? undefined : Number(limit),
        add_topup: adjustNum === 0 ? undefined : adjustNum,
      });
      toast.success("Credits updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onClose={onClose}>
      {user && (
        <>
          <DialogHeader>
            <DialogTitle>Credits — {user.name}</DialogTitle>
            <DialogDescription>
              {formatNumber(user.credits_remaining)} of{" "}
              {formatNumber(user.credit_limit + user.topup_credits)} credits
              remaining ({formatNumber(user.credits_used)} used this period).
              Real provider spend: {formatCurrency(user.total_cost)} across{" "}
              {formatNumber(user.minutes_used)} min.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="limit">Monthly allowance (credits)</Label>
              <Input
                id="limit"
                type="number"
                min={0}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Overrides the plan default. Resets each billing period.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup">Adjust top-up credits</Label>
              <Input
                id="topup"
                type="number"
                placeholder="e.g. 100 to give, -50 to take back"
                value={adjust}
                onChange={(e) => setAdjust(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {[-100, -50, -10, 10, 50, 100].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => bumpAdjust(d)}
                  >
                    {d > 0 ? `+${d}` : d}
                  </Button>
                ))}
                {adjust !== "" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setAdjust("")}
                  >
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Positive numbers grant persistent credits; negative numbers take
                them back (top-up first, then allowance). Top-up credits
                don&apos;t expire at period end.
              </p>
              {takeTooMuch && user && (
                <p className="text-xs text-destructive">
                  You can&apos;t take back more than{" "}
                  {formatNumber(user.credits_remaining)} credits (their current
                  balance).
                </p>
              )}
            </div>
            {user && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">New balance</span>
                  <span className="font-medium">
                    {formatNumber(projectedRemaining)} credits
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatNumber(projectedPeriod)} allowance +{" "}
                    {formatNumber(projectedTopup)} top-up
                  </span>
                  <span>was {formatNumber(user.credits_remaining)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving || takeTooMuch}>
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
