"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";
import { useMarketing } from "@/lib/marketing/store";

export default function SolutionsPage() {
  const { store } = useMarketing();
  const cases = store.content.useCases;

  return (
    <MarketingPageShell
      title="Solutions & use cases"
      description="See how teams across industries deploy AI voice agents to automate calls, reduce costs, and improve outcomes."
    >
      <div className="mx-auto max-w-4xl space-y-8">
        {cases.map((uc) => (
          <article
            key={uc.id}
            id={uc.id}
            className="glass-card overflow-hidden"
          >
            <div className="border-b border-border/50 bg-muted/20 px-6 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                {uc.industry}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{uc.title}</h2>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Problem</h3>
                <p className="mt-1 text-sm">{uc.problem}</p>
                <h3 className="mt-4 text-sm font-medium text-muted-foreground">How AI helps</h3>
                <p className="mt-1 text-sm">{uc.solution}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Example workflow</h3>
                <ol className="mt-2 space-y-2">
                  {uc.workflow.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-4 rounded-lg border border-success/20 bg-success/5 px-3 py-2">
                  <p className="text-xs font-medium text-success">Outcome</p>
                  <p className="mt-0.5 text-sm">{uc.outcome}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link href="/contact">
          <Button>
            Discuss your use case <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </MarketingPageShell>
  );
}
