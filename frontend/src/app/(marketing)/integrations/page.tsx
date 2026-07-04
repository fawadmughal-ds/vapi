"use client";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { useMarketing } from "@/lib/marketing/store";
import { cn } from "@/lib/utils";

export default function IntegrationsPage() {
  const { store } = useMarketing();
  const items = store.content.integrations;

  return (
    <MarketingPageShell
      title="Integrations"
      description="Connect your telephony stack, automate workflows, and extend the platform with developer-friendly APIs."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="glass-card-hover p-6">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{item.name}</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                  item.status === "available" && "bg-emerald-500/10 text-emerald-400",
                  item.status === "beta" && "bg-amber-500/10 text-amber-400",
                  item.status === "coming_soon" && "bg-muted text-muted-foreground"
                )}
              >
                {item.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-xs text-primary">{item.category}</p>
            <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 glass-card p-8 text-center">
        <h2 className="text-lg font-semibold">Developer-friendly by design</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          REST API, webhooks, and SDK access for building custom integrations.
          Full documentation available after signup.
        </p>
      </div>
    </MarketingPageShell>
  );
}
