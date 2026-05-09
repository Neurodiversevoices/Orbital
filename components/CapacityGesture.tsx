import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withSpring } from "react-native-reanimated";
import { View, Text } from "react-native";

interface Props {
  value: number;          // 0-100
  onChange: (v: number) => void;
  width?: number;         // default 280
  height?: number;        // default 60
}

export function CapacityGesture({ value, onChange, width = 280, height = 60 }: Props) {
  const x = useSharedValue((value / 100) * width);

  const colorAt = (v: number): string => {
    // Map 0-100 to capacity spectrum (locked tokens)
    if (v < 25) return "#DC2626";    // crimson
    if (v < 50) return "#F59E0B";    // amber
    if (v < 75) return "#2DD4BF";    // teal
    return "#06B6D4";                 // cyan
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const next = Math.max(0, Math.min(width, e.x));
      x.value = next;
      runOnJS(onChange)(Math.round((next / width) * 100));
    })
    .onEnd(() => { x.value = withSpring(x.value, { stiffness: 200 }); });

  const fillStyle = useAnimatedStyle(() => ({ width: x.value }));
  // Note: color cannot be animated in pure worklet; toggle via JS effect or React render

  return (
    <GestureDetector gesture={pan}>
      <View style={{
        width, height,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
        overflow: "hidden",
        justifyContent: "center",
      }}>
        <Animated.View style={[
          fillStyle,
          {
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            backgroundColor: colorAt(value),
            opacity: 0.85,
          },
        ]} />
        <Text style={{
          alignSelf: "center",
          color: "#F8F4E9", fontFamily: "Space Mono",
          fontSize: 14, letterSpacing: 1.5,
          zIndex: 1,
        }}>{value}</Text>
      </View>
    </GestureDetector>
  );
}
