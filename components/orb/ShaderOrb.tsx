// components/orb/ShaderOrb.tsx
// Minimal baseline: static orb image only (no Skia overlay).

import React from "react";
import { Image, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export type ShaderOrbProps = {
  size?: number;
  capacity?: SharedValue<number>;
  staticCapacity?: number;
  disabled?: boolean;
  testID?: string;
  externalClock?: SharedValue<number>;
  uCrossfade?: SharedValue<number>;
};

export default function ShaderOrb({ size = 280, testID }: ShaderOrbProps) {
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
    >
      <Image
        source={require("../../assets/orb_interior.png")}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  );
}
