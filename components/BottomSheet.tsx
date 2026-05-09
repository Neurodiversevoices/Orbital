import { View, StyleSheet, Dimensions, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReactNode, useEffect } from "react";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  snapHeights?: number[]; // e.g., [0.3, 0.6, 0.9]
  initialSnap?: number; // index into snapHeights · default 0
  children: ReactNode;
}

const SCREEN_H = Dimensions.get("window").height;

export const BottomSheet = ({
  visible,
  onDismiss,
  snapHeights = [0.5, 0.9],
  initialSnap = 0,
  children,
}: Props) => {
  const insets = useSafeAreaInsets();
  const offsetY = useSharedValue(SCREEN_H);
  const startY = useSharedValue(0);

  const snapPx = (frac: number) => SCREEN_H * (1 - frac);

  useEffect(() => {
    if (visible) {
      offsetY.value = withSpring(snapPx(snapHeights[initialSnap]), {
        stiffness: 200,
        damping: 20,
      });
    } else {
      offsetY.value = withTiming(SCREEN_H, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialSnap]);

  const pan = Gesture.Pan()
    .onStart(() => {
      startY.value = offsetY.value;
    })
    .onUpdate((e) => {
      const next = Math.max(
        snapPx(snapHeights[snapHeights.length - 1]),
        startY.value + e.translationY,
      );
      offsetY.value = next;
    })
    .onEnd((e) => {
      const cur = offsetY.value;
      const candidates = snapHeights.map(snapPx);
      // Drag past threshold · dismiss
      if (e.translationY > 120 && cur > snapPx(snapHeights[0]) + 80) {
        offsetY.value = withTiming(SCREEN_H, { duration: 200 });
        runOnJS(onDismiss)();
        return;
      }
      // Snap to nearest
      const nearest = candidates.reduce((a, b) =>
        Math.abs(b - cur) < Math.abs(a - cur) ? b : a,
      );
      offsetY.value = withSpring(nearest, { stiffness: 200, damping: 20 });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      1 -
      Math.min(
        1,
        (offsetY.value - snapPx(snapHeights[snapHeights.length - 1])) /
          SCREEN_H,
      ),
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.55)" },
          backdropStyle,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 32,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 12,
  },
});
