/**
 * useReduceMotionSafe — context-tolerant reduce-motion lookup.
 *
 * Reads `useAccessibility().settings.reduceMotion`, but returns `false`
 * cleanly when the gauge is mounted outside an `AccessibilityProvider`
 * (e.g. an isolated Skia test harness). Avoids the conditional-hook
 * anti-pattern by using a small wrapper context-consumer.
 */

import { useContext } from 'react';
import { AccessibilityContext } from '../../lib/hooks/useAccessibility';

export function useReduceMotionSafe(): boolean {
  const ctx = useContext(AccessibilityContext);
  return ctx?.settings.reduceMotion ?? false;
}
