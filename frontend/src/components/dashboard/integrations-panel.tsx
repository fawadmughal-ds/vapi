"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plug, RefreshCw, Search, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ProviderCategory, ProviderInfo, SyncResult } from "@/lib/types";

export function IntegrationsPanel() {
  const [categories, setCategories] = useState<ProviderCategory[] | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ProviderInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  function load() {
    api
      .get<ProviderCategory[]>("/admin/integrations")
      .then(setCategories)
      .catch(() => setCategories([]));
  }

  useEffect(load, []);

  function openProvider(p: ProviderInfo) {
    setActive(p);
    setApiKey("");
    setLabel(p.label ?? "");
  }

  const filtered = useMemo(() => {
    if (!categories) return null;
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        providers: c.providers.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.providers.length > 0);
  }, [categories, query]);

  async function save() {
    if (!active || !apiKey.trim()) return;
    setSaving(true);
    try {
      await api.put(`/admin/integrations/${active.id}`, {
        api_key: apiKey.trim(),
        label: label.trim() || null,
      });
      toast.success(`${active.name} connected`);
      setActive(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setSaving(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const res = await api.post<SyncResult>("/admin/sync/integrations", {});
      const n = res.integrations?.imported ?? 0;
      toast.success(
        n ? `Imported ${n} connected provider${n === 1 ? "" : "s"}` : "No new providers to import"
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!active) return;
    setSaving(true);
    try {
      await api.delete(`/admin/integrations/${active.id}`);
      toast.success(`${active.name} disconnected`);
      setActive(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  }

  if (!categories) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
          {syncing ? "Syncing…" : "Sync from Vapi"}
        </Button>
      </div>

      {filtered && filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No integrations match your search.
        </p>
      )}

      {filtered?.map((cat) => (
        <div key={cat.category} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {cat.category}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.providers.map((p) => (
              <button
                key={p.id}
                onClick={() => openProvider(p)}
                className={cn(
                  "group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/40",
                  p.connected && "border-success/40"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-semibold uppercase text-secondary-foreground">
                    {p.name.slice(0, 2)}
                  </div>
                  {p.connected ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="size-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </div>
                <p className="font-medium">{p.name}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {p.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={!!active} onClose={() => setActive(null)}>
        {active && (
          <>
            <DialogHeader>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription>{active.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {active.connected && active.masked_key && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Current key: </span>
                  <span className="font-mono">{active.masked_key}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    active.connected ? "Enter a new key to replace" : "Enter API key"
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  placeholder="e.g. Production key"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                {active.connected ? (
                  <Button
                    variant="outline"
                    onClick={disconnect}
                    disabled={saving}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" /> Disconnect
                  </Button>
                ) : (
                  <span />
                )}
                <Button onClick={save} disabled={saving || !apiKey.trim()}>
                  <Plug className="size-4" />
                  {active.connected ? "Update" : "Connect"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
