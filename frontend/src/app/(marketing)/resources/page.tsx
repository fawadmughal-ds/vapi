"use client";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { useMarketing } from "@/lib/marketing/store";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  guide: "Guide",
  "case-study": "Case study",
  update: "Product update",
  "best-practice": "Best practice",
};

export default function ResourcesPage() {
  const { store } = useMarketing();
  const articles = store.content.resources;

  return (
    <MarketingPageShell
      title="Resources"
      description="Guides, case studies, and best practices for deploying AI voice agents at scale."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <article key={a.id} className="glass-card-hover flex flex-col p-6">
            <span
              className={cn(
                "inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium uppercase",
                "bg-primary/10 text-primary"
              )}
            >
              {CATEGORY_LABELS[a.category] || a.category}
            </span>
            <h2 className="mt-3 font-semibold leading-snug">{a.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.excerpt}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {a.date} · {a.readTime} read
            </p>
          </article>
        ))}
      </div>
    </MarketingPageShell>
  );
}
