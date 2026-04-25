import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function useGaugeHaptics() {
  const lastSelection = useRef(0);
  const lastImpact = useRef(0);

  const onDetentCross = useCallback(() => {
    if (Platform.OS === 'web') return;
    const now = Date.now();
    if (now - lastSelection.current < 80) return;
    lastSelection.current = now;
    Haptics.selectionAsync();
  }, []);

  const onStateCross = useCallback(() => {
    if (Platform.OS === 'web') return;
    const now = Date.now();
    if (now - lastImpact.current < 200) return;
    lastImpact.current = now;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onSettle = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return { onDetentCross, onStateCross, onSettle };
}
