"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { PricingCards } from "@/components/marketing/pricing-cards";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMarketing } from "@/lib/marketing/store";
import { formatCurrency } from "@/lib/utils";

export default function PricingPage() {
  const { visiblePlans, store } = useMarketing();

  return (
    <>
      <MarketingPageShell
        title="Pricing"
        description="Flexible plans for every stage — from trial to enterprise. All pricing is managed centrally and reflected across the platform."
      >
        <PricingCards showToggle />

        {/* Comparison table */}
        <div className="mt-20">
          <h2 className="mb-6 text-xl font-semibold">Feature comparison</h2>
          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Limit</TableHead>
                  {visiblePlans
                    .filter((p) => !p.isEnterprise)
                    .map((p) => (
                      <TableHead key={p.planId}>{p.planName}</TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { key: "callMinutes", label: "Call minutes" },
                  { key: "aiAgents", label: "AI agents" },
                  { key: "phoneNumbers", label: "Phone numbers" },
                  { key: "campaigns", label: "Campaigns" },
                  { key: "teamMembers", label: "Team members" },
                ].map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {visiblePlans
                      .filter((p) => !p.isEnterprise)
                      .map((p) => (
                        <TableCell key={p.planId}>
                          {p.limits[row.key as keyof typeof p.limits].toLocaleString()}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Overage */}
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Usage-based overage</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePlans
              .flatMap((p) =>
                p.overageRates.map((o) => ({ plan: p.planName, ...o }))
              )
              .slice(0, 6)
              .map((o, i) => (
                <div key={i} className="glass-card p-4 text-sm">
                  <p className="font-medium">{o.plan} — {o.label}</p>
                  <p className="mt-1 text-muted-foreground">
                    {formatCurrency(o.pricePerUnit)} per {o.unit}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 glass-card border-violet-500/20 bg-violet-500/5 p-8 text-center">
          <h2 className="text-xl font-semibold">Need Enterprise?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Custom limits, SSO, dedicated support, compliance packages, and
            private deployment options.
          </p>
          <Link href="/contact" className="mt-6 inline-block">
            <Button>Contact sales</Button>
          </Link>
        </div>
      </MarketingPageShell>

      {/* FAQ preview */}
      <section className="border-t border-border/40 bg-muted/10 py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-center text-2xl font-semibold">Pricing FAQ</h2>
          <div className="mt-8 space-y-4">
            {store.content.faqs
              .filter((f) => f.category === "Pricing" || f.category === "Billing")
              .concat(store.content.faqs.filter((f) => f.category === "Product").slice(0, 1))
              .map((f) => (
                <div key={f.id} className="glass-card p-5">
                  <h3 className="font-medium">{f.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
                </div>
              ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/faq">
              <Button variant="outline">View all FAQs</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
