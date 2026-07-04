"use client";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { useMarketing } from "@/lib/marketing/store";

export default function FaqPage() {
  const { store } = useMarketing();
  const faqs = store.content.faqs;

  const categories = [...new Set(faqs.map((f) => f.category))];

  return (
    <MarketingPageShell
      title="Frequently asked questions"
      description="Everything you need to know about AI voice agents, providers, pricing, and security."
    >
      <div className="mx-auto max-w-3xl space-y-10">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
              {cat}
            </h2>
            <div className="space-y-3">
              {faqs
                .filter((f) => f.category === cat)
                .map((f) => (
                  <details key={f.id} className="glass-card group p-5">
                    <summary className="cursor-pointer font-medium marker:content-none">
                      {f.question}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {f.answer}
                    </p>
                  </details>
                ))}
            </div>
          </section>
        ))}
      </div>
    </MarketingPageShell>
  );
}
