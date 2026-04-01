import { useCallback, useEffect, useRef, useState } from "react";
import type { DispatchLiveResponse } from "../types";

/**
 * Fetches dispatch data once on mount.
 * Call `refresh()` to manually re-fetch.
 * Set `autoRefreshMs` > 0 to enable periodic polling (default: off).
 */
export function useDispatchLive(autoRefreshMs = 0) {
  const [data, setData] = useState<DispatchLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/dispatch/live", {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DispatchLiveResponse = await res.json();
      setData(json);
      setError(null);
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

  return { data, error, refresh: fetchData };
}
