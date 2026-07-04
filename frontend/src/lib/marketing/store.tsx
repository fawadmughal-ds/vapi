"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "@/lib/api";
import type { PlanAdminInfo } from "@/lib/types";

import { DEFAULT_MARKETING_STORE, STORAGE_KEY } from "./default-data";
import type {
  AdminActivityEntry,
  BillingInterval,
  MarketingStore,
  PricingConfig,
  PricingPlan,
  WebsiteContent,
} from "./types";

interface MarketingContextValue {
  store: MarketingStore;
  visiblePlans: PricingPlan[];
  publishedPlans: PricingPlan[];
  loading: boolean;
  activityLog: AdminActivityEntry[];
  updatePricing: (pricing: PricingConfig) => void;
  updateContent: (content: WebsiteContent) => void;
  updatePlan: (planId: string, patch: Partial<PricingPlan>) => void;
  publishPricing: () => void;
  saveDraft: () => void;
  getPlanPrice: (plan: PricingPlan, interval: BillingInterval) => number;
  logActivity: (action: string, detail: string) => void;
  resetToDefaults: () => void;
}

const MarketingContext = createContext<MarketingContextValue | null>(null);

function mergeApiPlans(
  store: MarketingStore,
  apiPlans: PlanAdminInfo[]
): MarketingStore {
  const tierMap: Record<string, string> = {
    starter: "starter",
    growth: "growth",
    pro: "scale",
  };

  const plans = store.pricing.plans.map((plan) => {
    const backendTier = plan.backendTier;
    if (!backendTier) return plan;
    const api = apiPlans.find((p) => p.tier === backendTier);
    if (!api || !api.published) {
      if (api && !api.published) return { ...plan, isVisible: false };
      return plan;
    }
    return {
      ...plan,
      planName: api.name,
      monthlyPrice: api.price_usd,
      yearlyPrice: Math.round(api.price_usd * 12 * (1 - store.pricing.yearlyDiscountPercent / 100)),
      features: api.features.length ? api.features : plan.features,
      limits: { ...plan.limits, callMinutes: api.minutes },
      isVisible: api.published,
    };
  });

  return { ...store, pricing: { ...store.pricing, plans } };
}

function loadStore(): MarketingStore {
  if (typeof window === "undefined") return DEFAULT_MARKETING_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MarketingStore;
  } catch {
    /* ignore */
  }
  return DEFAULT_MARKETING_STORE;
}

function saveStore(store: MarketingStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function MarketingProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<MarketingStore>(DEFAULT_MARKETING_STORE);
  const [activityLog, setActivityLog] = useState<AdminActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    api
      .get<PlanAdminInfo[]>("/billing/plans", { auth: false })
      .then((apiPlans) => {
        if (cancelled) return;
        setStore((prev) => mergeApiPlans(prev, apiPlans as PlanAdminInfo[]));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const logActivity = useCallback((action: string, detail: string) => {
    const entry: AdminActivityEntry = {
      id: crypto.randomUUID(),
      action,
      detail,
      at: new Date().toISOString(),
    };
    setActivityLog((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const persist = useCallback((next: MarketingStore) => {
    setStore(next);
    saveStore(next);
  }, []);

  const updatePricing = useCallback(
    (pricing: PricingConfig) => {
      persist({ ...store, pricing });
      logActivity("pricing.updated", "Pricing configuration saved");
    },
    [store, persist, logActivity]
  );

  const updateContent = useCallback(
    (content: WebsiteContent) => {
      persist({ ...store, content });
      logActivity("content.updated", "Website content updated");
    },
    [store, persist, logActivity]
  );

  const updatePlan = useCallback(
    (planId: string, patch: Partial<PricingPlan>) => {
      const plans = store.pricing.plans.map((p) =>
        p.planId === planId ? { ...p, ...patch } : p
      );
      persist({ ...store, pricing: { ...store.pricing, plans } });
    },
    [store, persist]
  );

  const publishPricing = useCallback(() => {
    persist({
      ...store,
      pricing: {
        ...store.pricing,
        draft: false,
        publishedAt: new Date().toISOString(),
      },
    });
    logActivity("pricing.published", "Pricing published to public website");
  }, [store, persist, logActivity]);

  const saveDraft = useCallback(() => {
    persist({ ...store, pricing: { ...store.pricing, draft: true } });
    logActivity("pricing.draft", "Pricing saved as draft");
  }, [store, persist, logActivity]);

  const resetToDefaults = useCallback(() => {
    persist(DEFAULT_MARKETING_STORE);
    logActivity("store.reset", "Marketing store reset to defaults");
  }, [persist, logActivity]);

  const getPlanPrice = useCallback(
    (plan: PricingPlan, interval: BillingInterval) => {
      if (plan.isEnterprise) return 0;
      return interval === "yearly"
        ? plan.yearlyPrice
        : plan.monthlyPrice;
    },
    []
  );

  const visiblePlans = useMemo(
    () =>
      [...store.pricing.plans]
        .filter((p) => p.isVisible)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [store.pricing.plans]
  );

  const publishedPlans = useMemo(
    () => (store.pricing.draft ? visiblePlans : visiblePlans),
    [visiblePlans, store.pricing.draft]
  );

  const value: MarketingContextValue = {
    store,
    visiblePlans,
    publishedPlans,
    loading,
    activityLog,
    updatePricing,
    updateContent,
    updatePlan,
    publishPricing,
    saveDraft,
    getPlanPrice,
    logActivity,
    resetToDefaults,
  };

  return (
    <MarketingContext.Provider value={value}>{children}</MarketingContext.Provider>
  );
}

export function useMarketing() {
  const ctx = useContext(MarketingContext);
  if (!ctx)
    throw new Error("useMarketing must be used within MarketingProvider");
  return ctx;
}

/** Safe hook for SSR/public pages — returns defaults if outside provider */
export function useMarketingOptional() {
  return useContext(MarketingContext);
}
