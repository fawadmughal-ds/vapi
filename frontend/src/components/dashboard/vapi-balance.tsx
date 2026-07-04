"use client";

import { useEffect, useState } from "react";
import { PhoneCall, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ProviderBalance } from "@/lib/types";

function money(v: number, currency: string) {
  if (currency === "USD") return `$${v.toFixed(2)}`;
  return `${v.toFixed(2)} ${currency}`;
}

export function VapiBalance() {
  const [data, setData] = useState<ProviderBalance | null>(null);
  const [open, setOpen] = useState(false);

  function load() {
    api
      .get<ProviderBalance>("/admin/platform/provider-balance")
      .then(setData)
      .catch(() => setData(null));
  }

  useEffect(load, []);

  if (!data) return <Skeleton className="h-40 w-full" />;

  const lowPct = data.balance > 0 ? (data.remaining / data.balance) * 100 : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="font-semibold">Voice Provider Balance</p>
              <p className="text-xs text-muted-foreground">
                Your Vapi wallet, estimated from real call costs.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <RefreshCw className="size-4" /> Update balance
          </Button>
        </div>

        {!data.is_set ? (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
            Vapi has no API to read your wallet balance. Enter the balance shown
            in your{" "}
            <a
              href="https://dashboard.vapi.ai/org/billing"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              Vapi billing dashboard
            </a>{" "}
            and we&apos;ll subtract real call spend from it as calls happen.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Balance entered"
                value={money(data.balance, data.currency)}
                sub={data.balance_at ? `as of ${formatDateTime(data.balance_at)}` : undefined}
              />
              <Metric
                label="Spent since"
                value={money(data.spent_since, data.currency)}
              />
              <Metric
                label="Credit left"
                value={money(data.remaining, data.currency)}
                accent
              />
            </div>
            {lowPct <= 15 && (
              <p className="text-xs text-amber-400">
                Low balance — top up in the Vapi dashboard, then update the figure
                here.
              </p>
            )}
          </>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <PhoneCall className="size-3.5" />
          All-time provider spend (from call costs):{" "}
          <span className="font-medium text-foreground">
            {money(data.total_spend, data.currency)}
          </span>
        </div>
      </CardContent>

      <UpdateDialog
        open={open}
        current={data}
        onClose={() => setOpen(false)}
        onDone={(d) => {
          setData(d);
          setOpen(false);
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
      <p className={`mt-0.5 text-xl font-semibold ${accent ? "text-emerald-400" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function UpdateDialog({
  open,
  current,
  onClose,
  onDone,
}: {
  open: boolean;
  current: ProviderBalance;
  onClose: () => void;
  onDone: (d: ProviderBalance) => void;
}) {
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState(current.currency || "USD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBalance(current.is_set ? String(current.balance) : "");
      setCurrency(current.currency || "USD");
    }
  }, [open, current]);

  async function submit() {
    if (balance === "") return;
    setSaving(true);
    try {
      const d = await api.put<ProviderBalance>("/admin/platform/provider-balance", {
        balance: Number(balance),
        currency,
      });
      toast.success("Balance updated");
      onDone(d);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Update Vapi balance</DialogTitle>
        <DialogDescription>
          Enter the current balance from your Vapi billing dashboard. We reset
          the spend baseline to now and decrement it from actual call costs.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="balance">Current balance</Label>
            <Input
              id="balance"
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 250.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Unit</Label>
            <Input
              id="currency"
              placeholder="USD"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving || balance === ""}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
