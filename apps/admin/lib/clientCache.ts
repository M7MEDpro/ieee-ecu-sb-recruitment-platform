/**
 * @file clientCache.ts
 * @brief Enterprise SWR Client-Side Cache Layer for Admin & HR Portals.
 * @details Solves the 3-pillar challenge:
 *          1. 0ms Perceived Speed: Serves stale data immediately from memory/sessionStorage.
 *          2. Supabase Free Tier Economy: Deduplicates requests and avoids repeated network roundtrips.
 *          3. Real-Time Continuity: Silently revalidates in the background on focus, interval, and mutations.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-19
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ClientCacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global in-memory cache shared across React trees
const CLIENT_MEMORY_CACHE = new Map<string, ClientCacheEntry<any>>();

// Event bus for cross-component cache invalidation
type InvalidationListener = (keyPattern?: string) => void;
const listeners = new Set<InvalidationListener>();

/**
 * Retrieve data from memory or sessionStorage.
 */
export function getClientCached<T>(key: string, maxAgeMs: number = 25000): T | null {
  // 1. Check in-memory Map (fastest - 0ms)
  const mem = CLIENT_MEMORY_CACHE.get(key);
  if (mem) {
    return mem.data as T;
  }

  // 2. Check sessionStorage fallback (instant on page reload)
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`swr_cache_${key}`);
      if (raw) {
        const parsed: ClientCacheEntry<T> = JSON.parse(raw);
        CLIENT_MEMORY_CACHE.set(key, parsed);
        return parsed.data;
      }
    } catch {}
  }

  return null;
}

/**
 * Check if the cached entry is strictly fresh (younger than freshThreshold).
 */
export function isClientCacheFresh(key: string, freshThresholdMs: number = 8000): boolean {
  const mem = CLIENT_MEMORY_CACHE.get(key);
  if (!mem) return false;
  return Date.now() - mem.timestamp <= freshThresholdMs;
}

/**
 * Save data to client cache.
 */
export function setClientCached<T>(key: string, data: T): void {
  const entry: ClientCacheEntry<T> = { data, timestamp: Date.now() };
  CLIENT_MEMORY_CACHE.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`swr_cache_${key}`, JSON.stringify(entry));
    } catch {}
  }
}

/**
 * Invalidate cache entry or group of entries and notify active subscribers.
 */
export function invalidateClientCache(keyPattern?: string): void {
  if (!keyPattern) {
    CLIENT_MEMORY_CACHE.clear();
  } else {
    for (const k of Array.from(CLIENT_MEMORY_CACHE.keys())) {
      if (k.includes(keyPattern)) {
        CLIENT_MEMORY_CACHE.delete(k);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(`swr_cache_${k}`);
          } catch {}
        }
      }
    }
  }

  // Notify listeners to trigger background revalidation
  listeners.forEach((listener) => {
    try {
      listener(keyPattern);
    } catch (e) {
      console.error('[clientCache] Listener error:', e);
    }
  });
}

export function subscribeToInvalidation(listener: InvalidationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface UseDataCacheOptions<T> {
  freshMs?: number; // How long before background revalidation is triggered (default: 8s)
  revalidateOnFocus?: boolean; // Silently check when user switches back to tab (default: true)
  pollIntervalMs?: number; // Background poll interval in ms (default: 30000ms)
  initialData?: T;
}

/**
 * @brief Custom React hook combining 0ms perceived speed, Supabase quota preservation, and real-time freshness.
 */
export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseDataCacheOptions<T> = {}
) {
  const {
    freshMs = 8000,
    revalidateOnFocus = true,
    pollIntervalMs = 30000,
    initialData,
  } = options;

  // 1. Initial State: Always match server render to prevent hydration mismatches
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(initialData === undefined);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isFetchingRef = useRef(false);

  // Background fetcher that updates state silently without blanking UI
  const revalidate = useCallback(async (silent = true) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!silent) setLoading(true);
    setIsRevalidating(true);

    try {
      const fresh = await fetcher();
      setData(fresh);
      setClientCached(key, fresh);
      setError(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      setIsRevalidating(false);
      isFetchingRef.current = false;
    }
  }, [key, fetcher]);

  // Initial client hydration from cache and freshness revalidation
  useEffect(() => {
    const cached = getClientCached<T>(key);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
      if (!isClientCacheFresh(key, freshMs)) {
        revalidate(true);
      }
    } else {
      revalidate(false);
    }
  }, [key, freshMs, revalidate]);

  // Window Focus Revalidation
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      const isFresh = isClientCacheFresh(key, freshMs);
      if (!isFresh) {
        revalidate(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, freshMs, revalidateOnFocus, revalidate]);

  // Periodic Background Polling
  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      revalidate(true);
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [pollIntervalMs, revalidate]);

  // Listen for external mutations (e.g. review marked, score submitted)
  useEffect(() => {
    const unsubscribe = subscribeToInvalidation((pattern) => {
      if (!pattern || key.includes(pattern)) {
        revalidate(true);
      }
    });
    return unsubscribe;
  }, [key, revalidate]);

  // Optimistic UI mutation helper
  const mutate = useCallback(
    async (optimisticValue: T | ((current: T | null) => T), shouldRevalidate = true) => {
      const updated =
        typeof optimisticValue === 'function'
          ? (optimisticValue as any)(data)
          : optimisticValue;

      setData(updated);
      setClientCached(key, updated);

      if (shouldRevalidate) {
        await revalidate(true);
      }
    },
    [data, key, revalidate]
  );

  return {
    data,
    loading,
    isRevalidating,
    error,
    revalidate: () => revalidate(false),
    mutate,
  };
}
