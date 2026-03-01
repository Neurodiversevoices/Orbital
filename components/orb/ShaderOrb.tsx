// components/orb/ShaderOrb.tsx
// Phase 1 — Single-pass SkSL fragment shader orb
// Architecture: One Canvas, one shader, three uniforms, zero JS visual logic
// All glass, glow, wave, and lighting computed on GPU

import React, { memo, useEffect } from "react";
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
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  withSpring,
} from "react-native-reanimated";

// ─────────────────────────────────────────────
// SkSL Fragment Shader — Single Pass
// ─────────────────────────────────────────────
// Inputs: uTime (clock), uCapacity (0=depleted, 1=resourced), uResolution
// Outputs: premultiplied alpha color per pixel
// No loops. No textures. No branching (step/mix only). Constant time.

const SHADER_SOURCE = `
uniform float uTime;
uniform float uCapacity;
uniform float2 uResolution;

// ── Color Palette ──
// Capacity drives color: cyan (resourced) → amber (elevated) → crimson (depleted)
vec3 capColor(float cap) {
  vec3 cyan    = vec3(0.08, 0.82, 0.88);
  vec3 amber   = vec3(0.92, 0.62, 0.08);
  vec3 crimson  = vec3(0.88, 0.12, 0.12);
  vec3 lowHalf  = mix(crimson, amber, clamp(cap * 2.0, 0.0, 1.0));
  vec3 highHalf = mix(amber, cyan, clamp((cap - 0.5) * 2.0, 0.0, 1.0));
  return mix(lowHalf, highHalf, step(0.5, cap));
}

half4 main(float2 coord) {
  // Normalize coords to [-1, 1] centered
  float minDim = min(uResolution.x, uResolution.y);
  vec2 uv = (coord * 2.0 - uResolution) / minDim;

  float dist = length(uv);
  float radius = 0.82;
  float t = dist / radius;  // 0=center, 1=edge

  // ── Breathing ──
  float breath = 1.0 + 0.025 * sin(uTime * 0.7);

  // ── Capacity color for this frame ──
  vec3 cColor = capColor(uCapacity);

  // ── Layer 0: Ambient Energy Field (outside + inside) ──
  // Soft radial glow that bleeds beyond the sphere boundary
  float ambientOuter = smoothstep(radius + 0.35, radius - 0.05, dist) * 0.1;
  vec3 ambientField = cColor * ambientOuter * breath;

  // ── Sphere interior mask (branchless) ──
  float inside = smoothstep(radius, radius - 0.008, dist); // anti-aliased edge

  // ── Fake 3D: sphere normal from 2D position ──
  // Clamped t to avoid sqrt of negative
  float tc = min(t, 0.999);
  float z = sqrt(1.0 - tc * tc);
  vec3 normal = vec3(uv / max(dist, 0.001), z);
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  // ── Layer 1: Fresnel Rim (Glass Shell) ──
  // pow(1 - NdotV, exponent) — bright edges, transparent center
  float NdotV = dot(normalize(normal), viewDir);
  float fresnel = pow(1.0 - NdotV, 3.8);

  // Soft optical rolloff — avoids hard plastic rim
  float rimSoft = smoothstep(0.55, 1.0, t);
  float fresnelFinal = fresnel * rimSoft * 0.55;
  vec3 fresnelCol = cColor * fresnelFinal;

  // Very subtle white rim at extreme edge for glass thickness feel
  float whiteRim = pow(1.0 - NdotV, 8.0) * 0.12;
  fresnelCol += vec3(whiteRim);

  // ── Layer 2: Internal Energy Wave (Hero) ──
  // 3-harmonic sine wave as signed distance field with volumetric glow

  // Wave speed: faster when depleted, calmer when resourced
  float speed = 0.9 + (1.0 - uCapacity) * 1.2;
  float phase = uv.x * 3.5 * (1.0 / radius) + uTime * speed;

  // Amplitude: wider when resourced, tighter when depleted
  float amp = (0.06 + 0.05 * uCapacity) * radius;

  // 3 harmonics — no loops, explicit
  float wave = sin(phase) * amp
             + sin(phase * 2.1 + 1.4) * amp * 0.35
             + sin(phase * 3.4 + 3.1) * amp * 0.12;

  // Signed distance from wave center line
  float waveDist = abs(uv.y - wave);

  // Three-pass glow from single SDF (wide → medium → sharp)
  float glowWide  = smoothstep(0.10 * radius, 0.0, waveDist);
  float glowMed   = smoothstep(0.045 * radius, 0.0, waveDist);
  float glowSharp = smoothstep(0.012 * radius, 0.0, waveDist);

  // Layer 3: Depth attenuation — wave brighter at center, fades at edges
  // Simulates subsurface scattering cheaply
  float depthMask = smoothstep(1.0, 0.25, t);

  // Compose wave with depth
  float waveIntensity = (glowWide * 0.12 + glowMed * 0.35 + glowSharp * 0.75) * depthMask;

  // Wave color: slight shift toward white at core
  vec3 waveCol = mix(cColor, vec3(1.0), glowSharp * 0.3) * waveIntensity;

  // ── Layer 3b: Ambient interior glow (very soft center light) ──
  float interiorGlow = smoothstep(0.9, 0.0, t) * 0.06 * breath;
  vec3 interiorCol = cColor * interiorGlow;

  // ── Specular Highlight (top-left, single light source) ──
  vec2 specPos = vec2(-0.32, -0.34);
  float specDist = length(uv / radius - specPos);
  float spec = pow(max(0.0, 1.0 - specDist * 2.2), 12.0) * 0.28;

  // Second subtle spec (bottom-right, fill light)
  vec2 specPos2 = vec2(0.25, 0.30);
  float specDist2 = length(uv / radius - specPos2);
  float spec2 = pow(max(0.0, 1.0 - specDist2 * 3.0), 10.0) * 0.08;

  vec3 specCol = vec3(spec + spec2);

  // ── Layer 4: Edge Vignette ──
  float vignette = smoothstep(1.0, 0.45, t);

  // ── Layer 4b: Top-to-bottom glass wash ──
  float wash = smoothstep(-1.0, 0.6, uv.y / radius) * 0.03;

  // ── Compose all layers ──
  // Base: near-black with very subtle blue tint
  vec3 base = vec3(0.008, 0.012, 0.02);

  vec3 interior = base;
  interior += interiorCol;          // ambient center glow
  interior += waveCol;              // hero wave
  interior += fresnelCol;           // glass rim
  interior += specCol;              // specular highlights
  interior *= vignette;             // edge darkening
  interior += vec3(wash);           // glass surface wash

  // ── Final composite: inside vs outside ──
  vec3 finalCol = mix(ambientField, interior, inside);

  // Premultiply alpha for clean compositing
  float alpha = max(inside, ambientOuter * 0.6);

  return half4(half3(finalCol * alpha), alpha);
}
`;

// ─────────────────────────────────────────────
// React Native Component
// ─────────────────────────────────────────────

type ShaderOrbProps = {
  /** Pixel size of the orb canvas (square) */
  size?: number;
  /** Capacity value: 0 = depleted, 1 = resourced. Animated with spring. */
  capacity?: SharedValue<number>;
  /** Static capacity if no shared value provided (0-1) */
  staticCapacity?: number;
  /** Disable for login screen (no gesture, just ambient) */
  disabled?: boolean;
  /** Test ID for automation */
  testID?: string;
};

// Compile shader once at module level — not per render
let runtimeEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
try {
  runtimeEffect = Skia.RuntimeEffect.Make(SHADER_SOURCE);
} catch (e) {
  console.error("[ShaderOrb] Shader compilation failed:", e);
}

const ShaderOrb = memo(function ShaderOrb({
  size = 280,
  capacity: externalCapacity,
  staticCapacity = 1.0,
  disabled = false,
  testID,
}: ShaderOrbProps) {
  // ── Clock: monotonic time in seconds ──
  const clock = useSharedValue(0);

  useFrameCallback((info) => {
    // info.timeSinceFirstFrame is in ms
    clock.value = (info.timeSinceFirstFrame ?? 0) / 1000;
  });

  // ── Capacity: use external shared value or internal static ──
  const internalCapacity = useSharedValue(staticCapacity);

  useEffect(() => {
    if (!externalCapacity) {
      internalCapacity.value = withSpring(staticCapacity, {
        damping: 20,
        stiffness: 80,
      });
    }
  }, [staticCapacity]);

  const activeCapacity = externalCapacity ?? internalCapacity;

  // ── Uniforms: derived on UI thread, sent to GPU ──
  const uniforms = useDerivedValue(() => {
    return {
      uTime: clock.value,
      uCapacity: activeCapacity.value,
      uResolution: vec(size, size),
    };
  });

  // ── Fallback if shader failed to compile ──
  if (!runtimeEffect) {
    return (
      <View
        testID={testID}
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
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
        <Shader source={runtimeEffect} uniforms={uniforms} />
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

export default ShaderOrb;
