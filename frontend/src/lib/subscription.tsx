"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { api } from "@/lib/api";
import type { Subscription } from "@/lib/types";

interface SubscriptionContextValue {
  subscription: Subscription | null;
  loading: boolean;
  outOfCredits: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined
);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await api.get<Subscription>("/billing/subscription");
      setSubscription(s);
    } catch {
      /* ignore — treat as unknown, don't lock the user out on a fetch error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const outOfCredits =
    !!subscription && (subscription.credits_remaining ?? 0) <= 0;

  return (
    <SubscriptionContext.Provider
      value={{ subscription, loading, outOfCredits, refresh }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
