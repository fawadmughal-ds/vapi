"use client";

import { useEffect, useState } from "react";
import { Plug } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ProviderCategory, TenantProviderEntitlement } from "@/lib/types";

export function TenantIntegrationsPanel() {
  const { data, loading } = useApi<ProviderCategory[]>("/integrations/available");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Platform-managed providers enabled for your account. Keys are configured by your administrator."
      />
      {loading && !data ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No integrations available"
          description="Your administrator has not enabled any integrations for your account yet."
        />
      ) : (
        <div className="space-y-6">
          {data.map((cat) => (
            <Card key={cat.category}>
              <CardHeader>
                <CardTitle className="text-base">{cat.category}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {cat.providers.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{p.name}</p>
                      <StatusBadge status={p.connected ? "active" : "inactive"} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function TenantIntegrationsManager({
  userId,
  userName,
  onSaved,
}: {
  userId: string;
  userName: string;
  onSaved?: () => void;
}) {
  const [items, setItems] = useState<TenantProviderEntitlement[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<TenantProviderEntitlement[]>(`/admin/customers/${userId}/integrations`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId]);

  async function save() {
    if (!items) return;
    setSaving(true);
    try {
      const updated = await api.put<TenantProviderEntitlement[]>(
        `/admin/customers/${userId}/integrations`,
        {
          providers: items.map((i) => ({
            provider_id: i.provider_id,
            enabled: i.enabled,
          })),
        }
      );
      setItems(updated);
      toast.success(`Integrations updated for ${userName}`);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No platform integrations are connected yet. Connect providers under{" "}
        <span className="text-foreground">Admin → Integrations</span> first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Toggle which connected providers{" "}
        <span className="text-foreground">{userName}</span> may use. Saving
        creates explicit entitlements for this tenant.
      </p>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <label
            key={item.provider_id}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) =>
                setItems((prev) =>
                  prev?.map((p) =>
                    p.provider_id === item.provider_id
                      ? { ...p, enabled: e.target.checked }
                      : p
                  ) ?? prev
                )
              }
              className="size-4 rounded border-border"
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Spinner />}
          Save entitlements
        </Button>
      </div>
    </div>
  );
}
