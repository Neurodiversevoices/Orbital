// components/orb/ShaderOrb.tsx
// Phase 2 — FBM noise cloudfield, energy streaks, reflection plane
// Replaces: 3-harmonic volumetric wave with domain-warped fractal noise
// Architecture: One Canvas, one shader, three uniforms, zero JS visual logic

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
// SkSL Fragment Shader — Phase 2: Cloudfield
// ─────────────────────────────────────────────
//
// ARCHITECTURE NOTES (for engineering review):
//
// This shader computes a procedurally-lit glass sphere with an internal
// fractal noise cloudfield in a single fragment pass. No loops, no texture
// sampling, no branching.
//
// GPU cost breakdown per pixel:
//   - Hash / value noise:     ~25 ops per call (4 hash + interpolation)
//   - FBM 3-octave:           ~75 ops (3 x vnoise)
//   - FBM 2-octave (x2 warp): ~100 ops (4 x vnoise)
//   - Energy streak (1 vnoise): ~30 ops
//   - Sphere SDF + normal:    ~5 ops
//   - Fresnel + glass:        ~8 ops
//   - Specular (2 lights):    ~6 ops
//   - Reflection plane:       ~5 ops
//   - Compositing:            ~10 ops
//   Total: ~265 ops per pixel. Mobile-safe at 280x280 canvas.
//
// Uniform contract:
//   uTime       — monotonic seconds (drives drift + breath)
//   uCapacity   — 0.0 (depleted/crimson) to 1.0 (resourced/cyan)
//   uResolution — canvas pixel dimensions
//   uCrossfade  — 0.0 (invisible) to 1.0 (fully visible), multiplies final alpha
//
// WHAT CHANGED FROM PHASE 1.5:
//   + Hash-based value noise (Dave Hoskins)
//   + 3-octave FBM with domain warping -> cloudfield
//   + Cloud density/turbulence wired to capacity
//   + Energy streaks (sine-warped diagonal bands)
//   + Reflection plane beneath sphere
//   + Halo picks up cloud color for organic bleed
//   + Breathing rate modulated by capacity state
//   + All smoothstep calls corrected to edge0 < edge1
//   + All sqrt/normalize clamp-protected
//   - 3-harmonic sine wave (removed)
//
// WHAT THIS SHADER DOES NOT DO (by design):
//   - No ray marching (too expensive, unstable on mobile)
//   - No texture sampling (Skia SkSL limitation in RN)
//   - No dynamic light count (constant 2 lights, hardcoded)
//   - No conditional branching (all step/mix/clamp)
//   - No loops of any kind (FBM fully unrolled)
//   - No floor(time) quantization
//
// FALLBACK: If shader fails to compile, component renders a dark
// circle with a faint capacity-colored border. No crash path.

const SHADER_SOURCE = `
uniform float uTime;
uniform float uCapacity;
uniform float2 uResolution;
uniform float uCrossfade;

// ────────────────────────────────────────
// COLOR SYSTEM
// ────────────────────────────────────────
// Three-stop gradient: crimson -> amber -> cyan
// Piecewise linear interpolation, no branching.

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

// ────────────────────────────────────────
// HASH-BASED VALUE NOISE
// ────────────────────────────────────────
// Dave Hoskins hash into quintic Hermite value noise.
// No texture sampler required. All ops are ALU.

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// ────────────────────────────────────────
// FRACTAL BROWNIAN MOTION
// ────────────────────────────────────────
// Fully unrolled — no loops, no break/continue.
// Octave offset decorrelates consecutive evaluations.

float fbm3(vec2 p) {
  float v = 0.0; float a = 0.5;
  v += a * vnoise(p); p = p * 2.01 + vec2(1.7, 9.2); a *= 0.5;
  v += a * vnoise(p); p = p * 2.01 + vec2(1.7, 9.2); a *= 0.5;
  v += a * vnoise(p);
  return v;
}

float fbm2(vec2 p) {
  float v = 0.0; float a = 0.5;
  v += a * vnoise(p); p = p * 2.01 + vec2(1.7, 9.2); a *= 0.5;
  v += a * vnoise(p);
  return v;
}

half4 main(float2 coord) {
  float minDim = min(uResolution.x, uResolution.y);
  vec2 uv = (coord * 2.0 - uResolution) / minDim;
  float dist = length(uv);
  float radius = 0.80;
  float t = dist / radius;

  // ────────────────────────────────────────
  // BREATHING — capacity-modulated rate
  // ────────────────────────────────────────
  // Slower when resourced (0.4 Hz base), faster when depleted (1.2 Hz).
  // Two offset sines blocks mechanical feel.
  // Total deviation: +/-1.8% — perceptible as alive, not bouncing.

  float breathRate = 0.4 + (1.0 - uCapacity) * 0.8;
  float breath = 1.0 + 0.012 * sin(uTime * breathRate)
                     + 0.006 * sin(uTime * breathRate * 1.83 + 0.7);

  vec3 cColor = capColor(uCapacity);
  vec3 cColorDim = capColorDim(uCapacity);

  // ────────────────────────────────────────
  // GLOBAL CLOUD COMPUTATION
  // ────────────────────────────────────────
  // Domain-warped 3-octave fbm sampled in sphere-relative space.
  // Computed once, shared across halo enhancement + interior.
  //
  // Capacity wires:
  //   depleted  -> dense, turbulent, faster drift
  //   resourced -> sparse, calm, slower drift

  float cloudSpeed = 0.10 + (1.0 - uCapacity) * 0.15;
  float cloudTurb  = 0.3 + (1.0 - uCapacity) * 0.7;
  float cloudScale = 2.5 + cloudTurb * 0.5;

  vec2 cloudUV = uv * cloudScale / radius
               + vec2(uTime * cloudSpeed, uTime * cloudSpeed * 0.7);

  float wx = fbm2(cloudUV + vec2(3.1, 7.4)) * cloudTurb;
  float wy = fbm2(cloudUV + vec2(6.7, 1.2)) * cloudTurb;
  float cloudRaw = fbm3(cloudUV + vec2(wx, wy));

  // ────────────────────────────────────────
  // LAYER 0: AMBIENT ENERGY FIELD (ENHANCED HALO)
  // ────────────────────────────────────────
  // Soft radial halo bleeding beyond the sphere.
  // Enhanced: picks up dominant cloud color for organic bleed.

  float haloTight = 1.0 - smoothstep(radius - 0.02, radius + 0.22, dist);
  float haloWide  = 1.0 - smoothstep(radius + 0.05, radius + 0.45, dist);
  float haloMask  = smoothstep(radius - 0.01, radius + 0.01, dist);

  float haloShift = cloudRaw * 0.25;
  vec3 haloColor = capColor(clamp(uCapacity - haloShift, 0.0, 1.0));
  vec3 ambientField = haloColor * (haloTight * 0.08 + haloWide * 0.025)
                    * haloMask * breath;

  // ────────────────────────────────────────
  // SPHERE GEOMETRY
  // ────────────────────────────────────────
  // Anti-aliased sphere mask. Fake 3D normal for Fresnel.

  float inside = 1.0 - smoothstep(radius - 0.006, radius, dist);

  float tc = min(t, 0.998);
  float z = sqrt(max(1.0 - tc * tc, 0.0001));
  vec3 normal = vec3(uv / max(dist, 0.0001), z);
  float normLen = max(length(normal), 0.0001);
  vec3 N = normal / normLen;
  vec3 V = vec3(0.0, 0.0, 1.0);
  float NdotV = dot(N, V);

  // ────────────────────────────────────────
  // LAYER 1: GLASS SHELL
  // ────────────────────────────────────────
  // Fresnel rim + absorption + edge line = glass perception.

  float fresnelSoft  = pow(1.0 - NdotV, 2.5) * 0.25;
  float fresnelSharp = pow(1.0 - NdotV, 6.0) * 0.45;
  float fresnelTotal = fresnelSoft + fresnelSharp;
  vec3 fresnelCol = mix(cColor, vec3(0.85), fresnelSharp * 0.6) * fresnelTotal;

  float absorption = smoothstep(0.0, 0.75, t) * 0.15;

  float edgeLine = (1.0 - smoothstep(radius - 0.012, radius, dist))
                 * smoothstep(radius - 0.035, radius - 0.012, dist);
  vec3 edgeCol = cColor * edgeLine * 0.3;

  // ────────────────────────────────────────
  // LAYER 2: FBM NOISE CLOUDFIELD (HERO)
  // ────────────────────────────────────────
  // Domain-warped fractal noise creates evolving cloud formations
  // inside the glass sphere. Replaces the 3-harmonic sine wave.
  //
  // Capacity wires:
  //   depleted  -> dense clouds, low threshold, turbulent
  //   resourced -> sparse clouds, high threshold, calm

  float cloudThreshold = 0.25 + uCapacity * 0.30;
  float cloudVal = smoothstep(cloudThreshold - 0.12, cloudThreshold + 0.12, cloudRaw);

  float depthMask    = 1.0 - smoothstep(0.15, 1.0, t);
  float verticalMask = 1.0 - smoothstep(radius * 0.4, radius * 0.85, abs(uv.y));
  float cloudMask = depthMask * verticalMask;

  // Three-pass glow: wide, medium, sharp (volumetric perception)
  float cloudGlowWide  = cloudVal * 0.10;
  float cloudGlowMed   = smoothstep(0.3, 0.7, cloudVal) * 0.30;
  float cloudGlowSharp = smoothstep(0.65, 0.95, cloudVal) * 0.60;
  float cloudGlow = (cloudGlowWide + cloudGlowMed + cloudGlowSharp) * cloudMask;

  // Core whitens (energy concentration), outer stays capacity-colored
  vec3 cloudCol = mix(cColor, vec3(1.0), cloudGlowSharp * 0.5 * cloudMask) * cloudGlow;

  // Capacity brightness: dims at depletion (never fully off)
  float capIntensity = 0.4 + 0.6 * uCapacity;
  cloudCol *= capIntensity;

  // ────────────────────────────────────────
  // ENERGY STREAKS
  // ────────────────────────────────────────
  // Sine-warped diagonal cyan bands. Visible when resourced,
  // dim/absent when depleted. Signals energy flowing.

  float streakVis = uCapacity * uCapacity * 0.35;
  float streakDiag = (uv.x * 0.7 + uv.y * 1.3) * 5.0 / radius;
  float streakWarp = vnoise(uv * 3.0 + vec2(uTime * 0.2, uTime * 0.15)) * 0.6;
  float streak = sin(streakDiag + uTime * 0.5 + streakWarp);
  streak = smoothstep(0.55, 1.0, streak);

  float streakGlow = streak * streakVis * depthMask * verticalMask;
  vec3 streakCol = vec3(0.05, 0.78, 0.85) * streakGlow;

  // ────────────────────────────────────────
  // LAYER 3: INTERNAL AMBIENT
  // ────────────────────────────────────────
  // Faint center glow blocks dead dark center at any capacity.

  float internalGlow = (1.0 - smoothstep(0.0, 0.95, t)) * 0.035 * breath;
  vec3 internalCol = cColorDim * internalGlow;

  // ────────────────────────────────────────
  // SPECULAR HIGHLIGHTS
  // ────────────────────────────────────────
  // Two fixed-position lights: key (upper-left) + fill (lower-right).

  vec2 keyPos = vec2(-0.30, -0.32);
  float keyDist = length(uv / radius - keyPos);
  float keySpec = pow(max(0.0, 1.0 - keyDist * 2.0), 16.0) * 0.32;

  vec2 fillPos = vec2(0.22, 0.28);
  float fillDist = length(uv / radius - fillPos);
  float fillSpec = pow(max(0.0, 1.0 - fillDist * 2.8), 8.0) * 0.10;

  vec3 specCol = mix(vec3(1.0), cColor, 0.1) * (keySpec + fillSpec);

  // ────────────────────────────────────────
  // LAYER 4: GLASS OVERLAY
  // ────────────────────────────────────────

  float vignette = 1.0 - smoothstep(0.35, 1.0, t);
  float topWash = smoothstep(-1.0, 0.8, uv.y / radius) * 0.025;
  float bottomShadow = smoothstep(0.6, 1.0, (uv.y / radius + 1.0) * 0.5) * 0.08;

  // ────────────────────────────────────────
  // REFLECTION PLANE
  // ────────────────────────────────────────
  // Subtle mirrored surface below the sphere.
  // Faded capacity-colored glow that grounds the orb.

  float reflGap = radius + 0.03;
  float reflBelow = smoothstep(reflGap, reflGap + 0.01, uv.y);
  vec2 reflUV = vec2(uv.x, 2.0 * reflGap - uv.y);
  float reflSphereDist = length(reflUV);
  float reflShape = 1.0 - smoothstep(0.0, radius * 1.1, reflSphereDist);
  float reflFade = 1.0 - smoothstep(0.0, 0.40, uv.y - reflGap);
  vec3 reflCol = cColor * reflShape * reflFade * reflBelow * 0.08 * breath;

  // ────────────────────────────────────────
  // COMPOSITING
  // ────────────────────────────────────────

  vec3 base = vec3(0.006, 0.009, 0.016);

  vec3 interior = base;
  interior += internalCol;
  interior += cloudCol;
  interior += streakCol;
  interior += fresnelCol;
  interior += edgeCol;
  interior += vec3(absorption) * cColorDim;
  interior *= vignette;
  interior += specCol;
  interior += vec3(topWash);
  interior -= vec3(bottomShadow);
  interior = max(interior, vec3(0.0));

  // ────────────────────────────────────────
  // FINAL OUTPUT
  // ────────────────────────────────────────
  // Inside: interior layers. Outside: ambient field + reflection.

  vec3 finalCol = mix(ambientField + reflCol, interior, inside);
  float haloAlpha = (haloTight * 0.08 + haloWide * 0.025) * haloMask * 0.8;
  float reflAlpha = reflBelow * reflShape * reflFade * 0.08;
  float alpha = max(inside, max(haloAlpha, reflAlpha));

  return half4(half3(finalCol), alpha * uCrossfade);
}
`;

// ─────────────────────────────────────────────
// React Native Component
// ─────────────────────────────────────────────

type ShaderOrbProps = {
  size?: number;
  capacity?: SharedValue<number>;
  staticCapacity?: number;
  disabled?: boolean;
  testID?: string;
  externalClock?: SharedValue<number>;
  uCrossfade?: SharedValue<number>;
};

let runtimeEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
try {
  runtimeEffect = Skia.RuntimeEffect.Make(SHADER_SOURCE);
} catch (e) {
}

const ShaderOrb = memo(function ShaderOrb({
  size = 280,
  capacity: externalCapacity,
  staticCapacity = 1.0,
  disabled = false,
  testID,
  externalClock,
  uCrossfade: externalCrossfade,
}: ShaderOrbProps) {
  const clock = useSharedValue(0);

  useFrameCallback((info) => {
    if (!externalClock) {
      clock.value = (info.timeSinceFirstFrame ?? 0) / 1000;
    }
  });

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
  const activeClock = externalClock ?? clock;
  const defaultCrossfade = useSharedValue(1.0);
  const activeCrossfade = externalCrossfade ?? defaultCrossfade;

  const uniforms = useDerivedValue(() => {
    return {
      uTime: activeClock.value,
      uCapacity: activeCapacity.value,
      uResolution: vec(size, size),
      uCrossfade: activeCrossfade.value,
    };
  });

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
