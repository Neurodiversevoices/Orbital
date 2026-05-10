/**
 * useHealthSnapshot — React hook over the HealthKit adapter.
 *
 * Fetches a fresh snapshot on mount, exposes a `refresh` for pull-to-refresh
 * surfaces, and never throws — errors are surfaced as a string for the caller
 * to render (e.g. "Connect Apple Health" CTA).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getHealthSnapshot, initHealth, HealthSnapshot } from './index';

export interface UseHealthSnapshotResult {
  snapshot: HealthSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHealthSnapshot(): UseHealthSnapshotResult {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Best-effort init; safe to call repeatedly.
      await initHealth();
      const next = await getHealthSnapshot(true);
      if (!mountedRef.current) return;
      setSnapshot(next);
    } catch (e) {
      if (!mountedRef.current) return;
      const message = e instanceof Error ? e.message : 'Failed to read Health data';
      console.warn('[useHealthSnapshot] refresh error:', message);
      setError(message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}
