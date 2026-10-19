"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Fast & Furious Realtime SWR Memory Cache
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const swrCache = new Map<string, CacheEntry>();

type Listener = (event: string, payload?: any) => void;
const listeners = new Set<Listener>();

export const realtimeSyncBus = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  emit(event: string, payload?: any) {
    listeners.forEach((fn) => {
      try {
        fn(event, payload);
      } catch (err) {
        console.error("Sync bus listener error:", err);
      }
    });
  },
};

/**
 * Broadcast a mutation across the entire app so all views update in real time.
 */
export function broadcastMutation(entityOrTag?: string) {
  realtimeSyncBus.emit("MUTATION", { tag: entityOrTag, timestamp: Date.now() });
}

/**
 * Manually set or update cache entry for instantaneous optimistic updates.
 */
export function setCachedData<T>(key: string, data: T) {
  swrCache.set(key, { data, timestamp: Date.now() });
  realtimeSyncBus.emit("CACHE_UPDATED", { key, data });
}

export function getCachedData<T>(key: string): T | undefined {
  return swrCache.get(key)?.data as T | undefined;
}

export function clearCache(pattern?: string) {
  if (!pattern) {
    swrCache.clear();
  } else {
    for (const key of swrCache.keys()) {
      if (key.includes(pattern)) {
        swrCache.delete(key);
      }
    }
  }
}

interface UseRealtimeDataOptions<T> {
  /** Tag used for targeted invalidation (e.g. 'shops', 'billing', 'markets') */
  tag?: string;
  /** Auto revalidate interval in ms (default 15000 = 15s) */
  refreshInterval?: number;
  /** Initial fallback data if needed */
  initialData?: T;
  /** Whether to revalidate when window regains focus (default true) */
  revalidateOnFocus?: boolean;
}

/**
 * High-performance hook for instant loading + background realtime syncing.
 * 
 * - If data is cached, it returns INSTANTLY (isLoading: false, 0ms render).
 * - Background revalidates silently without skeleton flicker.
 * - Auto-refreshes on tab refocus, online events, and broadcastMutation calls.
 */
export function useRealtimeData<T>(
  url: string | null,
  options: UseRealtimeDataOptions<T> = {}
) {
  const {
    tag,
    refreshInterval = 15000,
    initialData,
    revalidateOnFocus = true,
  } = options;

  const cached = url ? swrCache.get(url) : undefined;

  const [data, setData] = useState<T>(() => {
    if (cached) return cached.data;
    if (initialData !== undefined) return initialData;
    return undefined as unknown as T;
  });

  // If we had cache, we are NOT loading from the user's perspective!
  const [isLoading, setIsLoading] = useState<boolean>(!cached && !initialData);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  const activeUrlRef = useRef(url);
  activeUrlRef.current = url;

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!url) return;

      if (!isBackground && !swrCache.has(url)) {
        setIsLoading(true);
      } else {
        setIsSyncing(true);
      }

      try {
        const res = await fetch(url, {
          headers: {
            "x-realtime-sync": "true",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch ${url}`);
        }

        const json = await res.json();

        if (isMountedRef.current && activeUrlRef.current === url) {
          swrCache.set(url, { data: json, timestamp: Date.now() });
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    },
    [url]
  );

  // Initial fetch and URL change handler
  useEffect(() => {
    isMountedRef.current = true;

    if (!url) {
      setIsLoading(false);
      return;
    }

    const currentCached = swrCache.get(url);
    if (currentCached) {
      setData(currentCached.data);
      setIsLoading(false);
      // Background silent revalidation
      fetchData(true);
    } else {
      fetchData(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [url, fetchData]);

  // Periodic heartbeat sync
  useEffect(() => {
    if (!url || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      // Only sync if document is visible
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [url, refreshInterval, fetchData]);

  // Window focus revalidation
  useEffect(() => {
    if (!revalidateOnFocus || !url) return;

    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
    };
  }, [url, revalidateOnFocus, fetchData]);

  // Realtime mutation event listener
  useEffect(() => {
    if (!url) return;

    const unsubscribe = realtimeSyncBus.subscribe((event, payload) => {
      if (event === "MUTATION") {
        // If mutation is global or tag matches or url contains tag
        if (!payload?.tag || payload.tag === "ALL" || (tag && payload.tag === tag) || (url && url.includes(payload.tag))) {
          fetchData(true);
        }
      } else if (event === "CACHE_UPDATED" && payload?.key === url) {
        setData(payload.data);
      }
    });

    return unsubscribe;
  }, [url, tag, fetchData]);

  // Optimistic update helper
  const mutate = useCallback(
    (newData: T | ((curr: T) => T), shouldRevalidate = true) => {
      if (!url) return;
      const updated = typeof newData === "function" ? (newData as any)(data) : newData;
      setData(updated);
      setCachedData(url, updated);
      if (shouldRevalidate) {
        fetchData(true);
      }
    },
    [url, data, fetchData]
  );

  return {
    data,
    isLoading,
    isSyncing,
    error,
    mutate,
    refetch: () => fetchData(true),
  };
}
