// components/orb/ShaderTherm.tsx
// Thermometric column instrument — vertical capacity-filled glass column.
// Shares clock + capacity from parent (index.tsx). No internal clock.
// Uses same optical material language as ShaderOrb: Fresnel rim, specular,
// glass absorption, capacity-driven color ramp.

import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Canvas,
  Shader,
  Fill,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import {
  SharedValue,
  useDerivedValue,
} from "react-native-reanimated";

// ─────────────────────────────────────────────
// SkSL Fragment Shader — Thermometric Column
// ─────────────────────────────────────────────
//
// ARCHITECTURE NOTES:
//
// Single-pass SkSL shader rendering a vertical glass column.
// Capacity fills from bottom to top with the same crimson/amber/cyan
// color ramp used by the Orb. Glass perception via Fresnel rim,
// specular highlights, and absorption. No loops, no branching.
//
// Uniform contract:
//   uTime       — monotonic seconds (shared clock from parent)
//   uCapacity   — 0.0 (depleted/crimson) to 1.0 (resourced/cyan)
//   uResolution — canvas pixel dimensions
//   uCrossfade  — 0.0 (invisible) to 1.0 (fully visible)
//
// GPU cost: ~45 ops per pixel. Well within mobile budget.

const THERM_SHADER_SOURCE = `
uniform float uTime;
uniform float uCapacity;
uniform float2 uResolution;
uniform float uCrossfade;

// ────────────────────────────────────────
// COLOR SYSTEM (shared with Orb)
// ────────────────────────────────────────

vec3 capColor(float cap) {
  vec3 cyan   = vec3(0.05, 0.78, 0.85);
  vec3 amber  = vec3(0.88, 0.68, 0.12);
  vec3 crimson = vec3(0.82, 0.10, 0.10);
  float lo = clamp(cap * 2.0, 0.0, 1.0);
  float hi = clamp((cap - 0.5) * 2.0, 0.0, 1.0);
  return mix(mix(crimson, amber, lo), mix(amber, cyan, hi), step(0.5, cap));
}

vec3 capColorDim(float cap) {
  return capColor(cap) * 0.4;
}

half4 main(float2 coord) {
  // Normalize to centered UV, aspect-aware
  float2 res = uResolution;
  float minDim = min(res.x, res.y);
  vec2 uv = (coord * 2.0 - res) / minDim;

  // ────────────────────────────────────────
  // COLUMN GEOMETRY
  // ────────────────────────────────────────
  // Rounded-rect column: tall and narrow.
  // Column half-width and half-height in UV space.
  float colW = 0.18;
  float colH = 0.72;
  float cornerR = 0.10;

  // Signed distance to rounded rect
  vec2 q = abs(uv) - vec2(colW - cornerR, colH - cornerR);
  float sdf = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - cornerR;

  // Anti-aliased mask
  float inside = 1.0 - smoothstep(-0.006, 0.0, sdf);

  // ────────────────────────────────────────
  // FILL LEVEL
  // ────────────────────────────────────────
  // Capacity fills bottom-to-top.
  // uv.y: negative=top, positive=bottom (screen coords).
  // Column bottom = +colH, top = -colH. Total height = 2*colH.
  // Fill from bottom: the boundary is at colH - uCapacity * 2*colH
  //   = colH * (1.0 - 2.0 * uCapacity)

  float fillEdge = colH * (1.0 - 2.0 * uCapacity);

  // Breathing modulation on fill edge for organic feel
  float breathRate = 0.4 + (1.0 - uCapacity) * 0.8;
  float breath = 1.0 + 0.008 * sin(uTime * breathRate)
                     + 0.004 * sin(uTime * breathRate * 1.83 + 0.7);
  float animFillEdge = fillEdge + 0.005 * sin(uTime * breathRate * 0.5);

  // Soft fill boundary (meniscus)
  float fillMask = 1.0 - smoothstep(animFillEdge - 0.025, animFillEdge + 0.025, uv.y);

  // ────────────────────────────────────────
  // FLUID COLOR
  // ────────────────────────────────────────
  // Color at each vertical position reflects local capacity.
  // Bottom is crimson/depleted, top is cyan/resourced.
  // The filled region uses the capacity color; unfilled is dark glass.

  float localCap = 1.0 - smoothstep(-colH, colH, uv.y);
  vec3 fluidColor = capColor(localCap);

  // Meniscus glow: bright line at the fill boundary
  float meniscusDist = abs(uv.y - animFillEdge);
  float meniscusGlow = (1.0 - smoothstep(0.0, 0.04, meniscusDist)) * 0.6;
  vec3 meniscusCol = capColor(uCapacity) * meniscusGlow;

  // ────────────────────────────────────────
  // GLASS MATERIAL
  // ────────────────────────────────────────
  // Fresnel-like rim brightening using distance from column center.

  float normX = abs(uv.x) / colW;
  float rimFresnel = pow(clamp(normX, 0.0, 1.0), 3.0) * 0.35;

  vec3 cColor = capColor(uCapacity);

  // Glass absorption: darken center slightly for depth
  float absorption = (1.0 - smoothstep(0.0, 0.8, normX)) * 0.08;

  // Edge highlight
  float edgeDist = abs(abs(sdf) - 0.003);
  float edgeLine = (1.0 - smoothstep(0.0, 0.008, edgeDist)) * inside * 0.25;

  // Specular highlight (single light, upper-left)
  float specX = clamp((uv.x / colW + 0.5) * 0.5, 0.0, 1.0);
  float specY = clamp((-uv.y / colH + 0.5) * 0.5, 0.0, 1.0);
  float spec = pow(specX * specY, 8.0) * 0.2;

  // ────────────────────────────────────────
  // COMPOSITING
  // ────────────────────────────────────────

  vec3 base = vec3(0.006, 0.009, 0.016);

  // Empty region: dark glass with slight capacity tint
  vec3 emptyCol = base + capColorDim(uCapacity) * 0.05;

  // Filled region: fluid color with absorption and breathing
  vec3 filledCol = fluidColor * (0.35 + 0.15 * breath) + meniscusCol;

  // Blend filled/empty
  vec3 interior = mix(emptyCol, filledCol, fillMask);

  // Apply glass effects
  interior += cColor * rimFresnel;
  interior -= vec3(absorption);
  interior += cColor * edgeLine;
  interior += vec3(spec) * mix(vec3(1.0), cColor, 0.15);
  interior = max(interior, vec3(0.0));

  // ────────────────────────────────────────
  // HALO (subtle outer glow matching Orb style)
  // ────────────────────────────────────────

  float haloDist = max(-sdf, 0.0);
  float halo = (1.0 - smoothstep(0.0, 0.15, haloDist)) * 0.05;
  float haloMask = smoothstep(-0.01, 0.01, sdf);
  vec3 haloCol = cColor * halo * haloMask * breath;

  // ────────────────────────────────────────
  // FINAL OUTPUT
  // ────────────────────────────────────────

  vec3 finalCol = mix(haloCol, interior, inside);
  float haloAlpha = halo * haloMask * 0.6;
  float alpha = max(inside, haloAlpha);

  return half4(half3(finalCol), alpha * uCrossfade);
}
`;

// ─────────────────────────────────────────────
// React Native Component
// ─────────────────────────────────────────────

type ShaderThermProps = {
  size?: number;
  capacity: SharedValue<number>;
  externalClock: SharedValue<number>;
  uCrossfade: SharedValue<number>;
  testID?: string;
};

let thermEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
try {
  thermEffect = Skia.RuntimeEffect.Make(THERM_SHADER_SOURCE);
} catch (e) {
  console.error("[ShaderTherm] Shader compilation failed:", e);
}

const ShaderTherm = memo(function ShaderTherm({
  size = 280,
  capacity,
  externalClock,
  uCrossfade,
  testID,
}: ShaderThermProps) {
  const uniforms = useDerivedValue(() => {
    return {
      uTime: externalClock.value,
      uCapacity: capacity.value,
      uResolution: vec(size, size),
      uCrossfade: uCrossfade.value,
    };
  });

  if (!thermEffect) {
    return (
      <View
        testID={testID}
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: 14,
          },
        ]}
      />
    );
  }

  return (
    <Canvas
      style={{ width: size, height: size }}
      testID={testID}
    >
      <Fill>
        <Shader source={thermEffect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
});

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#01020A",
    borderWidth: 1,
    borderColor: "rgba(8, 209, 224, 0.15)",
  },
});

export default ShaderTherm;
