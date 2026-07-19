"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Coins, PhoneCall, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSubscription } from "@/lib/subscription";
import {
  formatDateTime,
  formatDuration,
  formatNumber,
} from "@/lib/utils";
import type { Call, Page } from "@/lib/types";

export function AgentLogs({ agentId }: { agentId: string }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Call> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Page<Call>>(`/calls?agent_id=${agentId}&page=${page}&page_size=15`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId, page]);

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={PhoneCall}
            title="No calls yet"
            description="Calls handled by this agent will show up here."
            className="border-0"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Direction</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="capitalize text-muted-foreground">
                  {c.direction}
                </TableCell>
                <TableCell className="font-medium">
                  {c.caller_number || c.callee_number || "—"}
                </TableCell>
                <TableCell>{formatDuration(c.duration_seconds)}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(c.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.pages} · {data.total} calls
            </p>
            <div className="flex gap-2">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AgentAnalysis({ agentId }: { agentId: string }) {
  const [calls, setCalls] = useState<Call[] | null>(null);
  const { subscription } = useSubscription();
  const rate = subscription?.minutes_per_credit || 1;

  useEffect(() => {
    api
      .get<Page<Call>>(`/calls?agent_id=${agentId}&page=1&page_size=100`)
      .then((d) => setCalls(d.items))
      .catch(() => setCalls([]));
  }, [agentId]);

  const stats = useMemo(() => {
    if (!calls) return null;
    const total = calls.length;
    const completed = calls.filter((c) => c.status === "completed").length;
    const seconds = calls.reduce((s, c) => s + (c.duration_seconds || 0), 0);
    const minutes = seconds / 60;
    return {
      total,
      minutes,
      avg: total ? seconds / total : 0,
      successRate: total ? (completed / total) * 100 : 0,
      credits: rate ? minutes / rate : minutes,
    };
  }, [calls, rate]);

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={BarChart3}
            title="No data yet"
            description="Analytics appear once this agent starts handling calls."
            className="border-0"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total calls" value={formatNumber(stats.total)} icon={PhoneCall} />
      <StatCard
        label="Avg duration"
        value={formatDuration(Math.round(stats.avg))}
        icon={TrendingUp}
        accent="text-violet-500"
      />
      <StatCard
        label="Success rate"
        value={`${stats.successRate.toFixed(0)}%`}
        icon={TrendingUp}
        accent="text-success"
      />
      <StatCard
        label="Credits used"
        value={formatNumber(Math.round(stats.credits))}
        icon={Coins}
        accent="text-amber-400"
      />
    </div>
  );
}
