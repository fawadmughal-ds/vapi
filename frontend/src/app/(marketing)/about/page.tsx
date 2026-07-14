import Link from "next/link";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <MarketingPageShell
      title="About NextCall"
      description="We're building the operating system for AI-powered voice communication — so every business can deploy intelligent phone agents at scale."
    >
      <div className="mx-auto max-w-3xl space-y-10 text-center">
        <section>
          <h2 className="text-xl font-semibold">Our mission</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Voice is still the highest-converting channel for sales, support, and
            operations. We make it possible for any team to deploy AI agents that
            sound natural, follow your business logic, and integrate with your
            existing telephony stack — without building infrastructure from scratch.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Product vision</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            A multi-tenant platform where agencies, SaaS companies, and enterprises
            each run isolated workspaces with their own agents, numbers, providers,
            campaigns, billing, and analytics — all managed from one control plane.
          </p>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          {["Customer-first", "Security by default", "Ship fast, iterate"].map(
            (v) => (
              <div key={v} className="glass-card p-5">
                <p className="font-medium">{v}</p>
              </div>
            )
          )}
        </section>
        <Link href="/contact">
          <Button size="lg">Book a demo</Button>
        </Link>
      </div>
    </MarketingPageShell>
  );
}
