"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Coins, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { PlatformCredits as Pool } from "@/lib/types";

export function PlatformCredits() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function load() {
    api
      .get<Pool>("/admin/platform/credits")
      .then(setPool)
      .catch(() => setPool(null));
  }

  useEffect(load, []);

  if (!pool) {
    return <Skeleton className="h-40 w-full" />;
  }

  const usedPct =
    pool.credits_purchased > 0
      ? (pool.credits_used / pool.credits_purchased) * 100
      : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Coins className="size-5" />
            </div>
            <div>
              <p className="font-semibold">Platform Credits</p>
              <p className="text-xs text-muted-foreground">
                Capacity purchased from your provider. 1 credit ={" "}
                {pool.minutes_per_credit} min.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="size-4" /> Settings
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Add Credits
            </Button>
          </div>
        </div>

        {pool.is_low && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
            <AlertTriangle className="size-4" />
            Low balance — {formatNumber(pool.credits_remaining)} credits left.
            Add more to avoid call interruptions.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-4">
          <Metric label="Purchased" value={formatNumber(pool.credits_purchased)} />
          <Metric label="Used" value={formatNumber(pool.credits_used)} />
          <Metric
            label="Remaining"
            value={formatNumber(pool.credits_remaining)}
            sub={`${formatNumber(pool.minutes_remaining)} min`}
            accent
          />
          <Metric
            label="Allocated to tenants"
            value={formatNumber(pool.credits_allocated)}
          />
        </div>

        <div className="space-y-1">
          <Progress value={usedPct} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{usedPct.toFixed(0)}% of pool used</span>
            <Badge variant={pool.enforce_pool ? "warning" : "secondary"}>
              {pool.enforce_pool ? "Hard cap on" : "Hard cap off"}
            </Badge>
          </div>
        </div>

        {pool.credits_allocated > pool.credits_remaining + pool.credits_used && (
          <p className="text-xs text-amber-400">
            You&apos;ve allocated more credits to tenants than remain in the pool
            (oversold). Add credits to cover demand.
          </p>
        )}
      </CardContent>

      <AddCreditsDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={(p) => {
          setPool(p);
          setAddOpen(false);
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        pool={pool}
        onClose={() => setSettingsOpen(false)}
        onDone={(p) => {
          setPool(p);
          setSettingsOpen(false);
        }}
      />
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold ${accent ? "text-primary" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function AddCreditsDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (p: Pool) => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    try {
      const p = await api.post<Pool>("/admin/platform/credits/purchase", {
        amount: value,
      });
      toast.success(`Added ${formatNumber(value)} credits`);
      setAmount("");
      onDone(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add credits");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Add Platform Credits</DialogTitle>
        <DialogDescription>
          Record credits purchased from your provider. This increases your total
          capacity pool.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Credits to add</Label>
          <Input
            id="amount"
            type="number"
            min={1}
            placeholder="e.g. 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving || !amount}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function SettingsDialog({
  open,
  pool,
  onClose,
  onDone,
}: {
  open: boolean;
  pool: Pool;
  onClose: () => void;
  onDone: (p: Pool) => void;
}) {
  const [rate, setRate] = useState(String(pool.minutes_per_credit));
  const [enforce, setEnforce] = useState(pool.enforce_pool);
  const [threshold, setThreshold] = useState(String(pool.low_balance_threshold));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRate(String(pool.minutes_per_credit));
    setEnforce(pool.enforce_pool);
    setThreshold(String(pool.low_balance_threshold));
  }, [pool]);

  async function submit() {
    setSaving(true);
    try {
      const p = await api.patch<Pool>("/admin/platform/settings", {
        minutes_per_credit: Number(rate) || 1,
        enforce_pool: enforce,
        low_balance_threshold: Number(threshold) || 0,
      });
      toast.success("Settings saved");
      onDone(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Credit Settings</DialogTitle>
        <DialogDescription>
          Control the conversion rate and how the pool is enforced.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rate">Minutes per credit</Label>
          <Input
            id="rate"
            type="number"
            step="0.1"
            min={0.1}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            How many call minutes one credit is worth (default 1).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="threshold">Low-balance warning (credits)</Label>
          <Input
            id="threshold"
            type="number"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enforce}
            onChange={(e) => setEnforce(e.target.checked)}
            className="size-4 rounded border-border"
          />
          Hard-block all calls when the pool runs out (prevents overselling)
        </label>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
