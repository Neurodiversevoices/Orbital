/**
 * useSignalSeed — React hook over the signal seed derivation pipeline.
 *
 * Builds a `PhysiologicalSignature` from the live HealthKit snapshot
 * (`useHealthSnapshot`) plus the user's first capacity log timestamp (used as
 * `signalAgeDays`), then derives a `SignalSeed` ready to pass into
 * `<AtmosphericReservoir seed={...}>`.
 *
 * Behavior:
 *   - On mount, returns the starter seed (`loading: true`) so the renderer
 *     never sees a null seed.
 *   - When the snapshot is denied / unauthorized / null, the starter seed is
 *     kept and `loading` flips to false.
 *   - On a healthy snapshot, derives the real seed and re-derives whenever
 *     `snapshot.fetchedAt` changes (i.e. underlying physiology refresh).
 *   - `refresh()` forces a re-derivation; useful for pull-to-refresh.
 *
 * The hook never throws. All async paths are caught and fall back to the
 * starter seed via the underlying `deriveSignalSeed`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useHealthSnapshot } from './useHealth';
import {
  deriveSignalSeed,
  deriveStarterSeed,
  PhysiologicalSignature,
  SignalSeed,
} from './signalSeed';
import type { HealthSnapshot } from './index';

import { useEnergyLogs } from '../hooks/useEnergyLogs';

const DAY_MS = 24 * 60 * 60 * 1000;

const FALLBACK_SEED: SignalSeed = {
  // Mirror of starter seed; held locally so we don't have to await the async
  // helper for the first render.
  seed: [0.5, 0.5, 0.5, 0.5] as const,
  hueShift: 0,
  surfacePattern: 0,
  pulseSeconds: 6,
  rotationSpeed: 0.08,
};

export interface UseSignalSeedResult {
  seed: SignalSeed;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Convert a `HealthSnapshot` + first-log timestamp into a
 * `PhysiologicalSignature`. Returns `null` if the snapshot lacks any of the
 * three core signals — caller falls back to the starter seed.
 */
function snapshotToSignature(
  snapshot: HealthSnapshot | null,
  firstLogTs: number | null,
): PhysiologicalSignature | null {
  if (!snapshot) return null;
  if (snapshot.status !== 'authorized') return null;
  const { recovery, nervousLoad, cardiacDrift } = snapshot;
  if (!recovery || !nervousLoad || !cardiacDrift) return null;

  // Bedtime midpoint is not directly modelled in the current adapter — use a
  // stable proxy derived from the snapshot fetch time. Bucket-rounding to
  // 15 min in `deriveSignalSeed` smooths small drifts.
  const bedtime = new Date(snapshot.fetchedAt);
  const bedtimeMins = bedtime.getHours() * 60 + bedtime.getMinutes();

  const ageDays = firstLogTs
    ? Math.max(0, Math.floor((Date.now() - firstLogTs) / DAY_MS))
    : 0;

  return {
    restingHR: cardiacDrift.bpm,
    hrvBaseline: nervousLoad.sdnnMs,
    bedtimeMins,
    sleepHours: recovery.hours,
    signalAgeDays: ageDays,
  };
}

export function useSignalSeed(): UseSignalSeedResult {
  const { snapshot } = useHealthSnapshot();
  const { logs } = useEnergyLogs();

  const [seed, setSeed] = useState<SignalSeed>(FALLBACK_SEED);
  const [loading, setLoading] = useState<boolean>(true);
  const mountedRef = useRef(true);

  // First-log timestamp: stable across re-renders unless logs actually change
  // length / content.
  const firstLogTs = useMemo<number | null>(() => {
    if (!logs.length) return null;
    let min = logs[0].timestamp;
    for (let i = 1; i < logs.length; i++) {
      const t = logs[i].timestamp;
      if (typeof t === 'number' && t < min) min = t;
    }
    return min;
  }, [logs]);

  const fetchedAt = snapshot?.fetchedAt ?? null;
  const status = snapshot?.status ?? null;

  const derive = useCallback(async () => {
    setLoading(true);
    try {
      const sig = snapshotToSignature(snapshot, firstLogTs);
      const next = sig
        ? await deriveSignalSeed(sig)
        : await deriveStarterSeed();
      if (!mountedRef.current) return;
      setSeed(next);
    } catch (e) {
      // deriveSignalSeed already swallows; this is belt-and-braces.
      console.warn('[useSignalSeed] derive failed:', e);
      if (mountedRef.current) setSeed(FALLBACK_SEED);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // We intentionally only depend on the *identity* of snapshot via
    // fetchedAt + status below; the closure captures the current snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, firstLogTs]);

  useEffect(() => {
    mountedRef.current = true;
    void derive();
    return () => {
      mountedRef.current = false;
    };
    // Re-derive when the snapshot meaningfully changes (new fetch / status
    // transition) or when the first-log day changes (signalAgeDays bucket
    // rolls over). We do NOT depend on the full `snapshot` object identity
    // because `useHealthSnapshot` may produce new references on every render.
  }, [fetchedAt, status, firstLogTs, derive]);

  const refresh = useCallback(async () => {
    await derive();
  }, [derive]);

  return { seed, loading, refresh };
}
