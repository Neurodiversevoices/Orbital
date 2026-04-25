// Stage 1 PROBE 3 verified: activeOffsetX/Y([-5,5]) + failOffsetY([-9999,9999])
// allows Pan to claim the touch immediately, beating the parent ScrollView.
import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  ACCESSIBILITY_STEP,
  crossedThreshold,
  pointToScore,
  scoreToAngle,
  snapToNearestDetent,
} from '../../../lib/capacity/gaugeMath';

interface Args {
  initialScore: number;
  centerX: number;
  centerY: number;
  onScoreChange: (score: number) => void;
  onDetentCross: () => void;
  onStateCross: () => void;
  onSettle: () => void;
}

export function useGaugeGesture({
  initialScore, centerX, centerY,
  onScoreChange, onDetentCross, onStateCross, onSettle,
}: Args) {
  const score = useSharedValue(initialScore);
  const prev = useSharedValue(initialScore);
  const dragging = useSharedValue(false);
  const angle = useDerivedValue(() => scoreToAngle(score.value));

  const reportScore = useCallback(
    (v: number) => onScoreChange(Math.round(v)),
    [onScoreChange],
  );

  const gesture = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .activeOffsetY([-5, 5])
    .failOffsetY([-9999, 9999])
    .onBegin((e) => {
      'worklet';
      dragging.value = true;
      prev.value = score.value;
      const next = pointToScore(e.x - centerX, e.y - centerY);
      const c = crossedThreshold(prev.value, next);
      score.value = next;
      if (c.detent !== null) runOnJS(onDetentCross)();
      if (c.stateBoundary !== null) runOnJS(onStateCross)();
      runOnJS(reportScore)(next);
    })
    .onChange((e) => {
      'worklet';
      const next = pointToScore(e.x - centerX, e.y - centerY);
      const c = crossedThreshold(score.value, next);
      prev.value = score.value;
      score.value = next;
      if (c.detent !== null) runOnJS(onDetentCross)();
      if (c.stateBoundary !== null) runOnJS(onStateCross)();
      runOnJS(reportScore)(next);
    })
    .onEnd(() => {
      'worklet';
      dragging.value = false;
      const target = snapToNearestDetent(score.value);
      const wasSnapped = Math.abs(target - score.value) > 0.5;
      score.value = withSpring(target, { damping: 18, stiffness: 200, mass: 0.9 });
      if (wasSnapped) runOnJS(onSettle)();
      runOnJS(reportScore)(target);
    });

  const incrementByA11y = useCallback(() => {
    const next = Math.min(100, Math.round(score.value) + ACCESSIBILITY_STEP);
    score.value = withSpring(next);
    onScoreChange(next);
    onDetentCross();
  }, [score, onScoreChange, onDetentCross]);

  const decrementByA11y = useCallback(() => {
    const next = Math.max(0, Math.round(score.value) - ACCESSIBILITY_STEP);
    score.value = withSpring(next);
    onScoreChange(next);
    onDetentCross();
  }, [score, onScoreChange, onDetentCross]);

  return { gesture, score, angle, dragging, incrementByA11y, decrementByA11y };
}
