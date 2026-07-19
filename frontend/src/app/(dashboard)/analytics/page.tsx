"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Coins, PhoneCall, Timer, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useSubscription } from "@/lib/subscription";
import { useApi } from "@/lib/use-api";
import { formatDuration, formatNumber } from "@/lib/utils";
import type { AnalyticsResponse } from "@/lib/types";

const tooltipStyle = {
  background: "hsl(228 40% 8% / 0.96)",
  border: "1px solid hsl(229 29% 22%)",
  borderRadius: 12,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
};

export default function AnalyticsPage() {
  const { data, loading, error } = useApi<AnalyticsResponse>("/analytics");
  const { subscription } = useSubscription();

  if (loading) return <FullPageSpinner />;
  if (error || !data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {error || "Could not load analytics."}
      </div>
    );
  }
  const s = data.summary;
  const rate = subscription?.minutes_per_credit || 1;
  const creditsPerDay = data.calls_per_day.map((p) => ({
    date: p.date,
    credits: rate ? p.minutes / rate : p.minutes,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Performance across all of your voice agents."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Calls" value={formatNumber(s.total_calls)} icon={PhoneCall} />
        <StatCard
          label="Credits Remaining"
          value={formatNumber(subscription?.credits_remaining)}
          icon={Wallet}
          accent="text-violet-500"
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(s.avg_duration_seconds)}
          icon={Timer}
          accent="text-primary"
        />
        <StatCard
          label="Success Rate"
          value={`${s.success_rate}%`}
          icon={TrendingUp}
          accent="text-success"
        />
        <StatCard
          label="Credits Used"
          value={formatNumber(subscription?.credits_used)}
          icon={Coins}
          accent="text-amber-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calls Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.calls_per_day}>
                <defs>
                  <linearGradient id="calls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(187 96% 58%)" stopOpacity={0.48} />
                    <stop offset="100%" stopColor="hsl(187 96% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="hsl(230 25% 17%)" />
                <XAxis dataKey="date" stroke="hsl(223 18% 65%)" fontSize={11} />
                <YAxis stroke="hsl(223 18% 65%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(187 96% 58%)"
                  fill="url(#calls)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={creditsPerDay}>
                <CartesianGrid strokeDasharray="3 4" stroke="hsl(230 25% 17%)" />
                <XAxis dataKey="date" stroke="hsl(223 18% 65%)" fontSize={11} />
                <YAxis stroke="hsl(223 18% 65%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="credits"
                  stroke="hsl(269 92% 69%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls Per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.calls_per_month}>
                <CartesianGrid strokeDasharray="3 4" stroke="hsl(230 25% 17%)" />
                <XAxis dataKey="date" stroke="hsl(223 18% 65%)" fontSize={11} />
                <YAxis stroke="hsl(223 18% 65%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calls" fill="hsl(187 96% 58%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.agent_performance.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No agent activity yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.agent_performance.map((a) => (
                  <div
                    key={a.agent_id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/15 p-3 transition-colors hover:border-primary/25 hover:bg-primary/[0.04]"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.agent_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.calls} calls · {a.minutes} min · avg{" "}
                        {formatDuration(a.avg_duration_seconds)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-success">
                      {a.success_rate}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
