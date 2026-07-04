"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";

/**
 * Fetch JSON from the API on mount and whenever `path` or optional `deps` change.
 * Include values in `deps` when the URL string is stable but upstream context
 * changed (e.g. pagination filters). `reload` is always in sync with `path`.
 */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(path);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload, ...deps]);

  return { data, loading, error, reload, setData };
}
