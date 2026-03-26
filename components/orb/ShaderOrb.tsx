// components/orb/ShaderOrb.tsx — one Canvas, Circle-clipped shader + ImageShader, no glow layer.

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDecay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import { Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

const FULL_ORB_SHADER = `
uniform shader image;
uniform float2 uResolution;
uniform float uTime;
uniform float uCapacity;
uniform float uTouchPressure;
uniform float2 uTouch;
uniform float uVelocity;
uniform float uRotation;
uniform float uShockwaveProgress;
uniform float uBreath;
uniform float uCrossfade;
uniform float uPulse;

half4 main(float2 coord) {
  float2 center = uResolution * 0.5;
  float minDim = min(uResolution.x, uResolution.y);
  float2 uv = (coord - center) / (minDim * 0.5);
  float r = length(uv);

  if (r > 1.0) {
    return half4(0.0, 0.0, 0.0, 0.0);
  }

  float2 touchUV = (uTouch - center) / (minDim * 0.5);
  float touchDist = length(uv - touchUV);
  float deform = uTouchPressure * exp(-touchDist * touchDist * 8.0) * 0.06;
  float2 delta = uv - touchUV;
  float dlen = length(delta);
  float2 dir = dlen > 1e-4 ? normalize(delta) : float2(0.0);
  float2 deformedCoord = coord + dir * deform * minDim * -0.5;

  float cosR = cos(uRotation);
  float sinR = sin(uRotation);
  float2 rotCoord = float2(
    cosR * (deformedCoord.x - center.x) - sinR * (deformedCoord.y - center.y) + center.x,
    sinR * (deformedCoord.x - center.x) + cosR * (deformedCoord.y - center.y) + center.y
  );

  half4 plate = image.eval(rotCoord);

  float luma = dot(float3(plate.rgb), float3(0.299, 0.587, 0.114));
  half3 dead = mix(half3(luma * 0.6), plate.rgb * 0.4, 0.2) * half3(1.6, 0.4, 0.3);
  half3 alive = plate.rgb * half3(0.5, 1.05, 1.5) + half3(0.0, 0.03, 0.1) * luma;
  float t = uCapacity;
  half3 skinned = t < 0.5
    ? mix(dead, plate.rgb, t * 2.0)
    : mix(plate.rgb, alive, (t - 0.5) * 2.0);

  float breath = sin(uTime * uBreath) * 0.035;
  skinned *= (1.0 + breath);

  float turb = uVelocity * sin(uv.x * 8.0 + uTime) * sin(uv.y * 8.0) * 0.04;
  skinned *= (1.0 + turb);

  float waveR = uShockwaveProgress * 0.9;
  float waveDist = abs(r - waveR);
  float waveWidth = 0.05 * (1.0 - uShockwaveProgress);
  float wave = smoothstep(waveWidth, 0.0, waveDist) * (1.0 - uShockwaveProgress) * 0.6;
  float3 waveColor = mix(float3(0.8, 0.1, 0.1), float3(0.0, 0.76, 0.8), uCapacity);
  skinned += half3(half(waveColor.x * wave), half(waveColor.y * wave), half(waveColor.z * wave));

  float touchSpec = pow(max(0.0, 1.0 - touchDist / 0.2), 4.0) * uTouchPressure * 0.5;
  skinned += half3(half(touchSpec));

  skinned += half3(half(uPulse * 0.18));

  // Disc inside r<=1 is clip-only in SkSL (no Circle clip — avoids double edge AA fringing).
  float xf = uCrossfade;
  return half4(skinned * xf, xf);
}
`;

let orbFX: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
try {
  orbFX = Skia.RuntimeEffect.Make(FULL_ORB_SHADER);
} catch (e) {
  if (__DEV__) console.error("[ShaderOrb] SkSL compile failed:", e);
}

const THRESHOLD_A = 0.33;
const THRESHOLD_B = 0.66;

export type ShaderOrbProps = {
  size?: number;
  capacity?: SharedValue<number>;
  staticCapacity?: number;
  disabled?: boolean;
  testID?: string;
  externalClock?: SharedValue<number>;
  uCrossfade?: SharedValue<number>;
  soulReveal?: SharedValue<number>;
  soulRipple?: SharedValue<number>;
  touchX?: SharedValue<number>;
  touchY?: SharedValue<number>;
  touchActive?: SharedValue<number>;
  touchPressure?: SharedValue<number>;
  touchVelocity?: SharedValue<number>;
  rotationImpulse?: SharedValue<number>;
};

export type ShaderOrbRef = { pulseSave: () => void };

function ShaderOrbInner(
  {
    size = 280,
    testID,
    capacity,
    staticCapacity,
    disabled = false,
    externalClock,
    uCrossfade: crossfadeP,
    soulReveal: _sr,
    soulRipple: _srp,
    touchX: txP,
    touchY: tyP,
    touchActive: taP,
    touchPressure: tpP,
    touchVelocity: tvP,
    rotationImpulse: rotP,
  }: ShaderOrbProps,
  ref: React.Ref<ShaderOrbRef>,
) {
  const dummyClock = useSharedValue(0);
  const dummyCap = useSharedValue(staticCapacity ?? 0.82);
  const dummyTx = useSharedValue(size / 2);
  const dummyTy = useSharedValue(size / 2);
  const dummyTa = useSharedValue(0);
  const dummyTp = useSharedValue(0);
  const dummyTv = useSharedValue(0);
  const dummyRot = useSharedValue(0);
  const dummyCross = useSharedValue(1);

  const driveInt = useSharedValue(0);
  useEffect(() => {
    if (staticCapacity != null) dummyCap.value = staticCapacity;
  }, [staticCapacity, dummyCap]);
  useEffect(() => {
    driveInt.value = !disabled && externalClock === undefined ? 1 : 0;
  }, [disabled, externalClock, driveInt]);

  const clock = externalClock ?? dummyClock;
  const cap = capacity ?? dummyCap;
  const tx = txP ?? dummyTx;
  const ty = tyP ?? dummyTy;
  const ta = taP ?? dummyTa;
  const tp = tpP ?? dummyTp;
  const tv = tvP ?? dummyTv;
  const rotImp = rotP ?? dummyRot;
  const orbCrossfade = crossfadeP ?? dummyCross;

  const uRotation = useSharedValue(0);
  const lastFrameMs = useSharedValue(-1);
  useFrameCallback((frame) => {
    "worklet";
    const t = frame.timestamp;
    if (driveInt.value === 1) dummyClock.value = t / 1000;
    if (lastFrameMs.value < 0) lastFrameMs.value = t;
    const dt = Math.min(32, t - lastFrameMs.value) / 1000;
    lastFrameMs.value = t;
    uRotation.value += rotImp.value * dt * 2.45;
    uRotation.value *= 0.988;
    rotImp.value *= 0.93;
  });

  const shockwaveProgress = useSharedValue(0);
  const pulseAmp = useSharedValue(0);

  const fireShockHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 55);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 110);
  }, []);

  useAnimatedReaction(
    () => cap.value,
    (c, prev) => {
      if (prev === null || prev === undefined) return;
      const a33 = prev < THRESHOLD_A && c >= THRESHOLD_A;
      const b33 = prev > THRESHOLD_A && c <= THRESHOLD_A;
      const a66 = prev < THRESHOLD_B && c >= THRESHOLD_B;
      const b66 = prev > THRESHOLD_B && c <= THRESHOLD_B;
      if (a33 || b33 || a66 || b66) {
        shockwaveProgress.value = 0;
        shockwaveProgress.value = withTiming(1, { duration: 700 });
        runOnJS(fireShockHaptic)();
      }
    },
  );

  const entryScale = useSharedValue(disabled ? 1 : 0);
  const entryMul = useSharedValue(1);
  const orbOpacity = useSharedValue(disabled ? 1 : 0);

  const fireEntryH = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const fireSuccess = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (disabled) {
      entryScale.value = 1;
      orbOpacity.value = 1;
      return;
    }
    orbOpacity.value = withTiming(1, { duration: 500 });
    entryScale.value = withSequence(
      withSpring(1.08, { damping: 11, stiffness: 165 }),
      withSpring(1.0, { damping: 14, stiffness: 205 }),
    );
    const h = setTimeout(fireEntryH, 200);
    return () => clearTimeout(h);
  }, [disabled, entryScale, fireEntryH, orbOpacity]);

  useImperativeHandle(ref, () => ({
    pulseSave: () => {
      if (disabled) return;
      entryMul.value = withSequence(
        withSpring(1.06, { damping: 6 }),
        withSpring(1.0, { damping: 10 }),
      );
      fireSuccess();
      runOnUI(() => {
        "worklet";
        pulseAmp.value = 0;
        pulseAmp.value = withSequence(
          withTiming(1, { duration: 120 }),
          withTiming(0, { duration: 380 }),
        );
      })();
    },
  }));

  const uBreath = useDerivedValue(() =>
    interpolate(cap.value, [0, 1], [13.83, 3.14159]),
  );

  const wrapperStyle = useAnimatedStyle(() => ({
    backgroundColor: "transparent",
    transform: [
      {
        scale:
          interpolate(cap.value, [0, 1], [0.93, 1.07]) *
          entryScale.value *
          entryMul.value,
      },
    ],
    opacity: orbOpacity.value * orbCrossfade.value,
  }));

  const touchPressureUniform = useDerivedValue(
    () => tp.value * ta.value,
  );

  const uniforms = useDerivedValue(() => ({
    uResolution: vec(size, size),
    uTime: clock.value,
    uCapacity: cap.value,
    uTouchPressure: touchPressureUniform.value,
    uTouch: vec(tx.value, ty.value),
    uVelocity: tv.value,
    uRotation: uRotation.value,
    uShockwaveProgress: shockwaveProgress.value,
    uBreath: uBreath.value,
    uCrossfade: 1.0,
    uPulse: pulseAmp.value,
  }));

  const image = useImage(require("../../assets/orb_interior.png"));

  if (!orbFX) {
    return (
      <View
        testID={testID}
        pointerEvents="none"
        style={{ width: size, height: size, backgroundColor: "transparent" }}
      />
    );
  }

  return (
    <Animated.View
      testID={testID}
      style={[
        { width: size, height: size, backgroundColor: "transparent" },
        wrapperStyle,
      ]}
    >
      <Canvas
        style={{ position: "absolute", width: size, height: size }}
        pointerEvents="none"
        opaque={false}
      >
        {image ? (
          <Fill>
            <Shader source={orbFX} uniforms={uniforms}>
              <ImageShader
                image={image}
                fit="cover"
                rect={{ x: 0, y: 0, width: size, height: size }}
              />
            </Shader>
          </Fill>
        ) : null}
      </Canvas>
    </Animated.View>
  );
}

const ShaderOrb = memo(forwardRef(ShaderOrbInner));
ShaderOrb.displayName = "ShaderOrb";
export default ShaderOrb;

export type OrbTouchArgs = {
  orbSize: number;
  hitOffsetX: number;
  hitOffsetY: number;
};

export function useOrbTouchGesture({
  orbSize,
  hitOffsetX,
  hitOffsetY,
}: OrbTouchArgs) {
  const tx = useSharedValue(orbSize / 2);
  const ty = useSharedValue(orbSize / 2);
  const ta = useSharedValue(0);
  const tp = useSharedValue(0);
  const tv = useSharedValue(0);
  const hL = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const g = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(false)
        .onBegin((e) => {
          "worklet";
          tx.value = Math.max(0, Math.min(orbSize, e.x - hitOffsetX));
          ty.value = Math.max(0, Math.min(orbSize, e.y - hitOffsetY));
          ta.value = 1;
          tp.value = withSpring(1, { damping: 9, stiffness: 220 });
          runOnJS(hL)();
        })
        .onUpdate((e) => {
          "worklet";
          tx.value = Math.max(0, Math.min(orbSize, e.x - hitOffsetX));
          ty.value = Math.max(0, Math.min(orbSize, e.y - hitOffsetY));
          tv.value =
            Math.sqrt(e.velocityX * e.velocityX + e.velocityY * e.velocityY) /
            1000;
        })
        .onEnd((e) => {
          "worklet";
          ta.value = 0;
          tp.value = withSpring(0, { damping: 8, stiffness: 135 });
          tv.value = withDecay({
            velocity:
              Math.sqrt(e.velocityX * e.velocityX + e.velocityY * e.velocityY) /
              800,
            deceleration: 0.992,
          });
        })
        .onFinalize(() => {
          "worklet";
          ta.value = 0;
        }),
    [hitOffsetX, hitOffsetY, hL, orbSize],
  );
  return {
    gesture: g,
    touchX: tx,
    touchY: ty,
    touchActive: ta,
    touchPressure: tp,
    touchVelocity: tv,
  };
}

export function useSoulLongPress(
  soulReveal: SharedValue<number>,
  soulRipple: SharedValue<number>,
) {
  const hSoul = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);
  return useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(600)
        .onStart(() => {
          "worklet";
          soulReveal.value = withSpring(1, { damping: 16, stiffness: 180 });
          runOnJS(hSoul)();
        })
        .onEnd(() => {
          "worklet";
          soulRipple.value = 1;
          soulRipple.value = withTiming(0, { duration: 520 });
          soulReveal.value = withSpring(0, { damping: 14, stiffness: 155 });
        }),
    [hSoul, soulReveal, soulRipple],
  );
}
