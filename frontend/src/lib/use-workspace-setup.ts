"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Agent, PhoneNumber, ProviderCategory } from "@/lib/types";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function useWorkspaceSetup(isVerified: boolean) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [numbers, setNumbers] = useState<PhoneNumber[] | null>(null);
  const [integrations, setIntegrations] = useState<ProviderCategory[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<Agent[]>("/agents").catch(() => [] as Agent[]),
      api.get<PhoneNumber[]>("/phone-numbers").catch(() => [] as PhoneNumber[]),
      api
        .get<ProviderCategory[]>("/integrations/available")
        .catch(() => [] as ProviderCategory[]),
    ])
      .then(([a, n, i]) => {
        if (cancelled) return;
        setAgents(a);
        setNumbers(n);
        setIntegrations(i);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isVerified]);

  const steps = useMemo<SetupStep[]>(() => {
    const hasAgent = (agents?.length ?? 0) > 0;
    const hasPublished = agents?.some((a) => a.is_provisioned) ?? false;
    const hasNumber = (numbers?.length ?? 0) > 0;
    const hasIntegration =
      integrations?.some((c) => c.providers.some((p) => p.connected)) ?? false;

    return [
      {
        id: "verify",
        label: "Verify your email",
        description: "Confirm ownership to unlock production features.",
        href: "/settings",
        done: isVerified,
      },
      {
        id: "agent",
        label: "Create your first AI agent",
        description: "Define voice, model, and instructions for call handling.",
        href: "/agents/new",
        done: hasAgent,
      },
      {
        id: "publish",
        label: "Publish an agent",
        description: "Deploy to the voice infrastructure to enable live calls.",
        href: "/agents",
        done: hasPublished,
      },
      {
        id: "number",
        label: "Connect a phone number",
        description: "Route inbound and outbound calls through your workspace.",
        href: "/phone-numbers",
        done: hasNumber,
      },
      {
        id: "integration",
        label: "Connect a provider",
        description: "Link Twilio, ElevenLabs, or other voice stack providers.",
        href: "/providers",
        done: hasIntegration,
      },
    ];
  }, [agents, numbers, integrations, isVerified]);

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progress = Math.round((completed / total) * 100);
  const isComplete = completed === total;
  const nextStep = steps.find((s) => !s.done);

  return {
    steps,
    completed,
    total,
    progress,
    isComplete,
    nextStep,
    loading,
    counts: {
      agents: agents?.length ?? 0,
      numbers: numbers?.length ?? 0,
      integrations: integrations?.reduce(
        (n, c) => n + c.providers.filter((p) => p.connected).length,
        0
      ) ?? 0,
    },
  };
}
