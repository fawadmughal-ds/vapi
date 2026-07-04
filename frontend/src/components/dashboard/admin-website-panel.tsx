"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Eye,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useMarketing } from "@/lib/marketing/store";
import type { PricingPlan, Testimonial } from "@/lib/marketing/types";
import { cn, formatCurrency } from "@/lib/utils";

export function AdminWebsitePanel() {
  const {
    store,
    updatePricing,
    updateContent,
    updatePlan,
    publishPricing,
    saveDraft,
    activityLog,
    resetToDefaults,
  } = useMarketing();

  const [tab, setTab] = useState("pricing");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("starter");
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [heroDraft, setHeroDraft] = useState(store.content.hero);
  const [announcement, setAnnouncement] = useState(store.content.announcement ?? "");

  useEffect(() => {
    const plan = store.pricing.plans.find((p) => p.planId === selectedPlanId);
    if (plan) setEditingPlan({ ...plan, features: [...plan.features] });
  }, [selectedPlanId, store.pricing.plans]);

  useEffect(() => {
    setHeroDraft(store.content.hero);
    setAnnouncement(store.content.announcement ?? "");
  }, [store.content]);

  function savePlan() {
    if (!editingPlan) return;
    updatePlan(editingPlan.planId, editingPlan);
    toast.success(`${editingPlan.planName} updated`);
  }

  function saveHero() {
    updateContent({
      ...store.content,
      hero: heroDraft,
      announcement: announcement || null,
    });
    toast.success("Hero & announcement saved");
  }

  function addFeature() {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, features: [...editingPlan.features, ""] });
  }

  function removeFeature(i: number) {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((_, idx) => idx !== i),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website & pricing"
        description="Control public website content, pricing plans, and marketing copy. Changes sync to the pricing page, home page, signup, and billing."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/pricing" target="_blank">
              <Button variant="outline" size="sm">
                <Eye className="size-4" /> Preview pricing
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={saveDraft}>
              <Save className="size-4" /> Save draft
            </Button>
            <Button size="sm" onClick={publishPricing}>
              <Upload className="size-4" /> Publish
            </Button>
          </div>
        }
      />

      {store.pricing.draft && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-200">
          Draft mode — click Publish to push changes to the public website.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>
          Last published:{" "}
          {store.pricing.publishedAt
            ? new Date(store.pricing.publishedAt).toLocaleString()
            : "Never"}
        </span>
        <span>Currency: {store.pricing.currency}</span>
        <span>Yearly discount: {store.pricing.yearlyDiscountPercent}%</span>
        <Button variant="ghost" size="sm" onClick={resetToDefaults}>
          <RefreshCw className="size-3" /> Reset defaults
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pricing">Pricing plans</TabsTrigger>
          <TabsTrigger value="hero">Hero & banner</TabsTrigger>
          <TabsTrigger value="faqs">FAQ</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="activity">Activity log</TabsTrigger>
        </TabsList>

        {/* Pricing plans */}
        <TabsContent value="pricing" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="glass-card lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[...store.pricing.plans]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((p) => (
                    <button
                      key={p.planId}
                      type="button"
                      onClick={() => setSelectedPlanId(p.planId)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        selectedPlanId === p.planId
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      )}
                    >
                      <span>{p.planName}</span>
                      <span className="flex items-center gap-1">
                        {p.isPopular && (
                          <Sparkles className="size-3 text-primary" />
                        )}
                        {!p.isVisible && (
                          <Eye className="size-3 text-muted-foreground opacity-50" />
                        )}
                      </span>
                    </button>
                  ))}
              </CardContent>
            </Card>

            {editingPlan && (
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Edit: {editingPlan.planName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Plan name</Label>
                      <Input
                        value={editingPlan.planName}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, planName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sort order</Label>
                      <Input
                        type="number"
                        value={editingPlan.sortOrder}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            sortOrder: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly price ({store.pricing.currency})</Label>
                      <Input
                        type="number"
                        value={editingPlan.monthlyPrice}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            monthlyPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yearly price</Label>
                      <Input
                        type="number"
                        value={editingPlan.yearlyPrice}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            yearlyPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editingPlan.description}
                      rows={2}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingPlan.isVisible}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, isVisible: e.target.checked })
                        }
                      />
                      Visible on website
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingPlan.isPopular}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, isPopular: e.target.checked })
                        }
                      />
                      Mark as popular
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingPlan.trialEnabled}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, trialEnabled: e.target.checked })
                        }
                      />
                      Free trial enabled
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingPlan.isEnterprise}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, isEnterprise: e.target.checked })
                        }
                      />
                      Enterprise / custom
                    </label>
                  </div>

                  {editingPlan.trialEnabled && (
                    <div className="space-y-2 sm:max-w-xs">
                      <Label>Trial days</Label>
                      <Input
                        type="number"
                        value={editingPlan.trialDays}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            trialDays: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Usage limits</Label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          ["callMinutes", "Call minutes"],
                          ["aiAgents", "AI agents"],
                          ["phoneNumbers", "Phone numbers"],
                          ["campaigns", "Campaigns"],
                          ["teamMembers", "Team members"],
                          ["providerConnections", "Providers"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{label}</Label>
                          <Input
                            type="number"
                            value={editingPlan.limits[key]}
                            onChange={(e) =>
                              setEditingPlan({
                                ...editingPlan,
                                limits: {
                                  ...editingPlan.limits,
                                  [key]: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Features</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                        <Plus className="size-3" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editingPlan.features.map((f, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={f}
                            onChange={(e) => {
                              const features = [...editingPlan.features];
                              features[i] = e.target.value;
                              setEditingPlan({ ...editingPlan, features });
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFeature(i)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>CTA label</Label>
                      <Input
                        value={editingPlan.ctaLabel}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, ctaLabel: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA URL</Label>
                      <Input
                        value={editingPlan.ctaUrl}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, ctaUrl: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={savePlan}>Save plan</Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Plan preview cards */}
          <div className="mt-8">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Live preview
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {store.pricing.plans
                .filter((p) => p.isVisible)
                .slice(0, 4)
                .map((p) => (
                  <div key={p.planId} className="glass-card p-4 text-sm">
                    <p className="font-semibold">{p.planName}</p>
                    <p className="text-lg font-bold">
                      {p.isEnterprise
                        ? "Custom"
                        : formatCurrency(p.monthlyPrice)}
                      {!p.isEnterprise && (
                        <span className="text-xs font-normal text-muted-foreground">
                          /mo
                        </span>
                      )}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* Hero */}
        <TabsContent value="hero" className="mt-6">
          <Card className="glass-card max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Homepage hero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["badge", "Badge text"],
                  ["headline", "Headline"],
                  ["subheadline", "Subheadline"],
                  ["primaryCta", "Primary CTA"],
                  ["primaryCtaUrl", "Primary CTA URL"],
                  ["secondaryCta", "Secondary CTA"],
                  ["secondaryCtaUrl", "Secondary CTA URL"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  {key === "subheadline" ? (
                    <Textarea
                      value={heroDraft[key]}
                      rows={3}
                      onChange={(e) =>
                        setHeroDraft({ ...heroDraft, [key]: e.target.value })
                      }
                    />
                  ) : (
                    <Input
                      value={heroDraft[key]}
                      onChange={(e) =>
                        setHeroDraft({ ...heroDraft, [key]: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <Label>Announcement banner</Label>
                <Input
                  value={announcement}
                  placeholder="Leave empty to hide"
                  onChange={(e) => setAnnouncement(e.target.value)}
                />
              </div>
              <Button onClick={saveHero}>Save hero content</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faqs" className="mt-6">
          <div className="space-y-3">
            {store.content.faqs.map((f, i) => (
              <Card key={f.id} className="glass-card">
                <CardContent className="space-y-3 p-4">
                  <Input
                    value={f.question}
                    onChange={(e) => {
                      const faqs = [...store.content.faqs];
                      faqs[i] = { ...f, question: e.target.value };
                      updateContent({ ...store.content, faqs });
                    }}
                  />
                  <Textarea
                    value={f.answer}
                    rows={2}
                    onChange={(e) => {
                      const faqs = [...store.content.faqs];
                      faqs[i] = { ...f, answer: e.target.value };
                      updateContent({ ...store.content, faqs });
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Testimonials */}
        <TabsContent value="testimonials" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {store.content.testimonials.map((t, i) => (
              <Card key={t.id} className="glass-card">
                <CardContent className="space-y-3 p-4">
                  {(["quote", "author", "role", "company"] as const).map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs capitalize">{field}</Label>
                      <Textarea
                        value={t[field]}
                        rows={field === "quote" ? 3 : 1}
                        onChange={(e) => {
                          const testimonials: Testimonial[] = [
                            ...store.content.testimonials,
                          ];
                          testimonials[i] = { ...t, [field]: e.target.value };
                          updateContent({ ...store.content, testimonials });
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-6">
          <Card className="glass-card max-w-xl">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label>Default meta title</Label>
                <Input
                  value={store.content.seo.defaultTitle}
                  onChange={(e) =>
                    updateContent({
                      ...store.content,
                      seo: { ...store.content.seo, defaultTitle: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Default meta description</Label>
                <Textarea
                  value={store.content.seo.defaultDescription}
                  rows={3}
                  onChange={(e) =>
                    updateContent({
                      ...store.content,
                      seo: {
                        ...store.content.seo,
                        defaultDescription: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-6">
          <Card className="glass-card">
            <CardContent className="p-0">
              {activityLog.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No admin activity yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {activityLog.map((a) => (
                    <li key={a.id} className="flex justify-between px-4 py-3 text-sm">
                      <span>
                        <span className="font-medium">{a.action}</span>
                        <span className="text-muted-foreground"> — {a.detail}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
