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
  background: "hsl(224 39% 9%)",
  border: "1px solid hsl(223 26% 18%)",
  borderRadius: 8,
  fontSize: 12,
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
          accent="text-indigo-400"
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(s.avg_duration_seconds)}
          icon={Timer}
          accent="text-sky-400"
        />
        <StatCard
          label="Success Rate"
          value={`${s.success_rate}%`}
          icon={TrendingUp}
          accent="text-emerald-400"
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
                    <stop offset="0%" stopColor="hsl(245 80% 67%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(245 80% 67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(223 26% 18%)" />
                <XAxis dataKey="date" stroke="hsl(217 18% 60%)" fontSize={11} />
                <YAxis stroke="hsl(217 18% 60%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(245 80% 67%)"
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(223 26% 18%)" />
                <XAxis dataKey="date" stroke="hsl(217 18% 60%)" fontSize={11} />
                <YAxis stroke="hsl(217 18% 60%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="credits"
                  stroke="hsl(38 92% 50%)"
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(223 26% 18%)" />
                <XAxis dataKey="date" stroke="hsl(217 18% 60%)" fontSize={11} />
                <YAxis stroke="hsl(217 18% 60%)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calls" fill="hsl(245 80% 67%)" radius={[4, 4, 0, 0]} />
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
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.agent_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.calls} calls · {a.minutes} min · avg{" "}
                        {formatDuration(a.avg_duration_seconds)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400">
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
