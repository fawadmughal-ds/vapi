"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn, formatCurrency } from "@/lib/utils";
import type { PlanAdminInfo, PlanTier } from "@/lib/types";

export function AdminPricingPanel() {
  const { data: plans, loading, reload } = useApi<PlanAdminInfo[]>("/admin/plans");
  const [editing, setEditing] = useState<PlanTier | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<PlanAdminInfo | null>(null);

  useEffect(() => {
    if (editing && plans) {
      const plan = plans.find((p) => p.tier === editing);
      if (plan) setDraft({ ...plan, features: [...plan.features] });
    }
  }, [editing, plans]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await api.put(`/admin/plans/${draft.tier}`, {
        name: draft.name,
        minutes: draft.minutes,
        credits: draft.credits,
        price_usd: draft.price_usd,
        features: draft.features.filter((f) => f.trim()),
        published: draft.published,
      });
      toast.success(`${draft.name} plan updated`);
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !plans) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edit plan details shown on the public pricing page and tenant billing. Unpublished
        plans are hidden from both.
      </p>
      <div className="grid gap-5 lg:grid-cols-3">
        {plans?.map((plan) => {
          const isEditing = editing === plan.tier;
          const display = isEditing && draft ? draft : plan;
          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative flex flex-col",
                !plan.published && "opacity-75",
                isEditing && "border-primary"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{display.name}</CardTitle>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      display.published
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {display.published ? (
                      <>
                        <Eye className="size-3" /> Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3" /> Hidden
                      </>
                    )}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-semibold">
                    {formatCurrency(display.price_usd)}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs capitalize text-muted-foreground">{plan.tier}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                {isEditing && draft ? (
                  <div className="space-y-3">
                    <Field label="Name">
                      <Input
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Price (USD)">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={draft.price_usd}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              price_usd: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Minutes">
                        <Input
                          type="number"
                          min={0}
                          value={draft.minutes}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              minutes: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Credits">
                      <Input
                        type="number"
                        min={0}
                        value={draft.credits}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            credits: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Features (one per line)">
                      <textarea
                        className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        value={draft.features.join("\n")}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            features: e.target.value.split("\n"),
                          })
                        }
                      />
                    </Field>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.published}
                        onChange={(e) =>
                          setDraft({ ...draft, published: e.target.checked })
                        }
                        className="size-4 rounded border-border"
                      />
                      Published on marketing site & billing
                    </label>
                  </div>
                ) : (
                  <ul className="flex-1 space-y-2">
                    {display.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex gap-2 pt-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={save} disabled={saving}>
                        {saving ? <Spinner /> : <Save className="size-4" />}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setEditing(plan.tier)}
                    >
                      Edit plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
