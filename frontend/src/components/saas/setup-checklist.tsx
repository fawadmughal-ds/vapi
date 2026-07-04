"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWorkspaceSetup } from "@/lib/use-workspace-setup";
import { cn } from "@/lib/utils";

export function SetupChecklist({ verified }: { verified: boolean }) {
  const { steps, progress, isComplete, nextStep, loading } =
    useWorkspaceSetup(verified);
  const [dismissed, setDismissed] = useState(false);

  if (loading || isComplete || dismissed) return null;

  return (
    <div className="glass-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5">
      <div className="flex items-start justify-between gap-4 border-b border-border/50 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Complete workspace setup</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {progress}% complete — finish these steps to go live with AI calling.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setDismissed(true)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="px-5 py-3">
        <Progress value={progress} className="h-1.5" />
      </div>
      <ul className="divide-y divide-border/40 px-2 pb-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/40",
                !step.done && nextStep?.id === step.id && "bg-primary/5"
              )}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.done && "text-muted-foreground line-through"
                  )}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {nextStep && (
        <div className="border-t border-border/50 px-5 py-3">
          <Link href={nextStep.href}>
            <Button size="sm" className="w-full sm:w-auto">
              Continue: {nextStep.label}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export function SetupChecklistSidebar({ verified }: { verified: boolean }) {
  const { progress, isComplete, loading } = useWorkspaceSetup(verified);

  if (loading || isComplete) return null;

  return (
    <div className="mx-3 mb-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted-foreground">Setup progress</span>
        <span className="font-semibold text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );
}
