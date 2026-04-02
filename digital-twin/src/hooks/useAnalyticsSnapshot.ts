import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyticsSnapshot } from "../types";

/**
 * Loads analytics snapshot. Tries the backend API first, falls back to
 * a local file at /analytics_snapshot.json (in public/).
 * Call `refresh()` to manually re-fetch.
 */
export function useAnalyticsSnapshot(autoRefreshMs = 0) {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Try the backend API first
      const res = await fetch("/api/analytics/snapshot", {
        signal: controller.signal,
      });
      if (res.ok) {
        const json: AnalyticsSnapshot = await res.json();
        setSnapshot(json);
        setError(null);
        return;
      }

      // If API fails (401/404/500), try local fallback
      const local = await fetch("/analytics_snapshot.json", {
        signal: controller.signal,
      });
      if (local.ok) {
        const json: AnalyticsSnapshot = await local.json();
        setSnapshot(json);
        setError(null);
        return;
      }

      throw new Error("No snapshot available");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (autoRefreshMs > 0) {
      const id = setInterval(fetchData, autoRefreshMs);
      return () => {
        clearInterval(id);
        abortRef.current?.abort();
      };
    }
    return () => abortRef.current?.abort();
  }, [fetchData, autoRefreshMs]);

  return { snapshot, error, refresh: fetchData };
}
