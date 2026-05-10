/**
 * atmosphericShader.ts — SKSL fragment shader source for the Atmospheric Reservoir.
 *
 * This shader renders two volumetric SDF bodies in the same 3D space using
 * single-pass raymarching:
 *
 *   • RESERVOIR (large body, centered at origin) — represents the user's
 *     stored capacity. FBM-displaced sphere whose surface smoothness is
 *     driven by `uReserves` (high reserves => smooth, calm surface; low
 *     reserves => rough, jittery surface). Color is sampled from the full
 *     capacity spectrum (crimson → amber → teal → cyan).
 *
 *   • DEMAND (smaller body, offset to the right) — represents today's load.
 *     Curl-noise displaced sphere whose surface chop scales with `uDemand`.
 *     Tinted toward the warm end of the spectrum (crimson / amber) and blends
 *     with the reservoir using a soft-min (`smin`) operator so the bodies
 *     fuse metaball-style when proximate.
 *
 * Lighting model: per-step gradient sampling for surface normals + a cheap
 * lambert + rim term, plus a blurred underglow contribution accumulated
 * outside the surface. Final composite over a near-white sky to match the
 * app's light theme background (#FFFFFF).
 *
 * SKSL specifics:
 *   • `main(float2 fragCoord) -> half4` — entry point signature.
 *   • Uses `half4`/`half3` for color outputs (color precision is enough).
 *   • `half3 mix(...)` works the same as GLSL's `mix`.
 *   • SKSL supports `for` loops with constant bounds, but const-foldable
 *     bounds via uniforms are NOT allowed — therefore the step count is
 *     branched at runtime via two unrolled loops gated on uReducedMotion.
 *   • All uniforms must be declared at the top of the program.
 *   • No `#version` / `#extension` pragmas — the runtime supplies its own.
 *
 * Performance: the inner SDF samples FBM at 3 octaves per step; the demand
 * SDF samples 2 octaves of curl-style perturbation. At 32 steps that is
 * roughly 32 × 5 = 160 noise lookups per pixel which is well within budget
 * for iPhone 12+ Metal. Reduced-motion path skips animation entirely and
 * drops to 16 steps for the lowest-power devices.
 *
 * Uniforms:
 *   uTime              — seconds elapsed (driven by Skia useClock)
 *   uReserves          — 0..1 (drives reservoir radius + smoothness)
 *   uDemand            — 0..1 (drives demand chop + warm-tint weight)
 *   uSeed              — vec4 of 0..1 floats for per-user signature
 *                        (.x = noise phase, .y = displacement axis,
 *                         .z = secondary frequency, .w = pulse offset)
 *   uHueShift          — radians (shifts the spectrum lookup slightly)
 *   uSurfacePattern    — 0..3 selects laminar / turbulent / banded / cellular
 *   uPulseSeconds      — period of the breathing pulse (seconds)
 *   uRotationSpeed     — radians/sec (per-user variation in body rotation)
 *   uReducedMotion     — 0 or 1; when 1, the shader uses a fixed time and
 *                        a 16-step march
 *   uResolution        — vec2 of canvas size in pixels
 */

// =============================================================================
// SPECTRUM CONSTANTS (baked sRGB)
//   Crimson #DC2626 -> (220,38,38)/255   ≈ (0.8627, 0.1490, 0.1490)
//   Amber   #F59E0B -> (245,158,11)/255  ≈ (0.9608, 0.6196, 0.0431)
//   Teal    #2DD4BF -> (45,212,191)/255  ≈ (0.1765, 0.8314, 0.7490)
//   Cyan    #06B6D4 -> (6,182,212)/255   ≈ (0.0235, 0.7137, 0.8314)
// =============================================================================

export const ATMOSPHERIC_SHADER_SOURCE = /* sksl */ `
//
// Uniforms — bound from the JS side via Skia's <Shader uniforms={...} />
//
uniform float  uTime;
uniform float  uReserves;
uniform float  uDemand;
uniform float4 uSeed;
uniform float  uHueShift;
uniform float  uSurfacePattern;
uniform float  uPulseSeconds;
uniform float  uRotationSpeed;
uniform float  uReducedMotion;
uniform float2 uResolution;

//
// Spectrum colors (the canonical capacity spectrum baked as constants).
//
const half3 CRIMSON = half3(0.8627, 0.1490, 0.1490);
const half3 AMBER   = half3(0.9608, 0.6196, 0.0431);
const half3 TEAL    = half3(0.1765, 0.8314, 0.7490);
const half3 CYAN    = half3(0.0235, 0.7137, 0.8314);
const half3 SKY     = half3(1.0,    1.0,    1.0);   // light-theme bg #FFFFFF

//
// hash / noise primitives. Standard 3D value-noise built from a 1D hash.
//
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash31(float3 p) {
    p = fract(p * float3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

float vnoise(float3 p) {
    float3 i = floor(p);
    float3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep weights

    float n000 = hash31(i + float3(0.0, 0.0, 0.0));
    float n100 = hash31(i + float3(1.0, 0.0, 0.0));
    float n010 = hash31(i + float3(0.0, 1.0, 0.0));
    float n110 = hash31(i + float3(1.0, 1.0, 0.0));
    float n001 = hash31(i + float3(0.0, 0.0, 1.0));
    float n101 = hash31(i + float3(1.0, 0.0, 1.0));
    float n011 = hash31(i + float3(0.0, 1.0, 1.0));
    float n111 = hash31(i + float3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z) * 2.0 - 1.0; // remap to -1..1
}

//
// 3-octave FBM. Used for the reservoir surface displacement.
//
float fbm3(float3 p) {
    float a = 0.5;
    float r = 0.0;
    r += vnoise(p) * a;          a *= 0.5;  p *= 2.02;
    r += vnoise(p) * a;          a *= 0.5;  p *= 2.03;
    r += vnoise(p) * a;
    return r;
}

//
// Cheap pseudo-curl: returns a 3D vector field by sampling vnoise with three
// orthogonal offsets and taking the rotor. Not a real curl (no exact
// derivative), but close enough for surface displacement.
//
float3 pseudoCurl(float3 p) {
    float e  = 0.35;
    float n1 = vnoise(p + float3( e, 0.0, 0.0));
    float n2 = vnoise(p + float3(-e, 0.0, 0.0));
    float n3 = vnoise(p + float3(0.0,  e, 0.0));
    float n4 = vnoise(p + float3(0.0, -e, 0.0));
    float n5 = vnoise(p + float3(0.0, 0.0,  e));
    float n6 = vnoise(p + float3(0.0, 0.0, -e));
    return float3(n3 - n4, n5 - n6, n1 - n2) * 0.5;
}

//
// Soft-min — Inigo Quilez exponential variant.
// k controls the blend radius; we use k = 0.3 throughout.
//
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

//
// Gentle rotation around Y-axis, used to spin the bodies based on per-user
// rotation speed.
//
float3 rotateY(float3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return float3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

//
// Surface-pattern modulator. Returns a 0..1 multiplier that biases the
// displacement based on uSurfacePattern (0 = laminar/flat, 1 = turbulent,
// 2 = banded, 3 = cellular).
//
float surfacePattern(float3 p, float t) {
    int mode = int(clamp(uSurfacePattern, 0.0, 3.0));
    if (mode == 0) {
        // Laminar — soft horizontal flow lines.
        return 0.5 + 0.5 * sin(p.y * 3.0 + t * 0.6);
    }
    if (mode == 1) {
        // Turbulent — stacked vnoise.
        return 0.5 + 0.5 * vnoise(p * 2.5 + float3(0.0, t * 0.4, 0.0));
    }
    if (mode == 2) {
        // Banded — sharper rings.
        float v = sin(p.y * 8.0 + t * 0.5);
        return smoothstep(-0.6, 0.6, v);
    }
    // Cellular — abs(noise) gives ridge-like bands.
    return abs(vnoise(p * 3.0 + float3(t * 0.2, 0.0, 0.0)));
}

//
// Reservoir SDF — large displaced sphere centered at origin.
// Capacity (uReserves) drives:
//   • base radius (slightly larger when reserves are high)
//   • displacement amplitude (smaller when reserves are high — calmer)
//
float sdReservoir(float3 p, float t) {
    float radius = mix(0.78, 1.05, uReserves);
    float amp    = mix(0.22, 0.06, uReserves); // less chop when full

    float3 q     = rotateY(p, t * uRotationSpeed * 0.6 + uSeed.x * 6.2831);
    float3 np    = q * (1.6 + uSeed.z * 0.5) + float3(0.0, t * 0.12, 0.0);
    float  fb    = fbm3(np);
    float  patt  = surfacePattern(q * 1.2, t);
    float  disp  = amp * (fb * 0.7 + (patt - 0.5) * 0.6);

    return length(p) - (radius + disp);
}

//
// Demand SDF — smaller displaced sphere offset to the right.
// uDemand drives chop amplitude.
//
float sdDemand(float3 p, float t) {
    // The demand body breathes slightly to the right of center; its X
    // offset is stable, but its Y oscillates with the per-user pulse.
    float pulsePhase = (uPulseSeconds > 0.0)
        ? (t / max(uPulseSeconds, 0.0001)) * 6.2831
        : 0.0;
    float3 center = float3(
        0.85,
        0.04 * sin(pulsePhase + uSeed.w * 6.2831),
        0.0
    );

    float radius = mix(0.42, 0.62, uDemand);
    float amp    = mix(0.08, 0.28, uDemand); // more chop when load is high

    float3 lp    = p - center;
    float3 q     = rotateY(lp, -t * uRotationSpeed * 0.9 + uSeed.y * 6.2831);
    float3 cn    = pseudoCurl(q * 2.4 + float3(t * 0.18, 0.0, t * 0.11));
    float  patt  = surfacePattern(q * 1.6 + cn, t * 1.2);
    float  disp  = amp * (cn.x * 0.5 + cn.y * 0.3 + (patt - 0.5) * 0.4);

    return length(lp) - (radius + disp);
}

//
// Combined scene SDF. Returns the soft-min of the two bodies plus a label
// (0..1) describing which body dominated — used downstream for tinting.
//
struct SceneSample {
    float dist;
    float bodyMix; // 0 = pure reservoir, 1 = pure demand
};

SceneSample mapScene(float3 p, float t) {
    float dr = sdReservoir(p, t);
    float dd = sdDemand(p, t);

    // smin with k = 0.3
    float k  = 0.3;
    float h  = clamp(0.5 + 0.5 * (dd - dr) / k, 0.0, 1.0);
    float d  = mix(dd, dr, h) - k * h * (1.0 - h);

    SceneSample s;
    s.dist    = d;
    s.bodyMix = 1.0 - h; // h close to 1 => reservoir wins
    return s;
}

//
// Spectrum lookup — maps a 0..1 value to the canonical 4-stop spectrum.
// 'hueShift' rotates the spectrum lookup along the curve in 0..1 space.
//
half3 spectrum(float t, float hueShift) {
    float u = fract(t + hueShift / 6.2831);
    if (u < 0.3333) {
        return mix(CRIMSON, AMBER, half(u / 0.3333));
    }
    if (u < 0.6666) {
        return mix(AMBER, TEAL, half((u - 0.3333) / 0.3333));
    }
    return mix(TEAL, CYAN, half((u - 0.6666) / 0.3334));
}

//
// Shading — sample SDF gradient for a normal, then a cheap lambert + rim.
//
half3 shade(float3 hitPos, float bodyMix, float t) {
    // Numerical gradient
    float e = 0.0035;
    float dx = mapScene(hitPos + float3(e, 0.0, 0.0), t).dist
             - mapScene(hitPos - float3(e, 0.0, 0.0), t).dist;
    float dy = mapScene(hitPos + float3(0.0, e, 0.0), t).dist
             - mapScene(hitPos - float3(0.0, e, 0.0), t).dist;
    float dz = mapScene(hitPos + float3(0.0, 0.0, e), t).dist
             - mapScene(hitPos - float3(0.0, 0.0, e), t).dist;
    float3 n = normalize(float3(dx, dy, dz) + float3(1e-6));

    float3 lightDir = normalize(float3(0.45, 0.85, 0.55));
    float  lambert  = max(dot(n, lightDir), 0.0);
    float  rim      = pow(1.0 - max(dot(n, float3(0.0, 0.0, 1.0)), 0.0), 2.0);

    // Reservoir samples the full spectrum based on a height + bodyMix mix;
    // demand body weights toward red/amber as uDemand increases.
    float reservoirT = 0.5 + 0.5 * hitPos.y + 0.15 * sin(hitPos.x * 1.2 + t * 0.3);
    half3 reservoirColor = spectrum(reservoirT, uHueShift);

    // Demand tint — interpolate crimson <-> amber by uDemand, then nudge
    // a touch toward teal so it doesn't clash when load is low.
    half3 warmTint = mix(AMBER, CRIMSON, half(uDemand));
    half3 demandColor = mix(warmTint, TEAL, half(0.18 * (1.0 - uDemand)));

    half3 baseColor = mix(reservoirColor, demandColor, half(1.0 - bodyMix));

    // Cheap shading: ambient + lambert + rim
    half3 lit = baseColor * half(0.35 + 0.65 * lambert);
    lit += baseColor * half(0.4 * rim);

    return lit;
}

//
// Underglow — sample the SDF at the pixel position projected onto the z=0
// plane and use the (clamped) negative distance as additive haze.
//
half3 underglow(float2 uv, float t) {
    // Sample SDF at z=0 to estimate "how close" the pixel is to a body
    // outside the surface. We use this to fade in a colored haze.
    float3 ray = float3(uv, 0.0);
    float d = mapScene(ray, t).dist;
    float halo = exp(-3.5 * max(d, 0.0)); // 1.0 at surface, fades out
    half3 tint = mix(
        spectrum(0.45 + uHueShift / 6.2831, 0.0),
        mix(AMBER, CRIMSON, half(uDemand)),
        half(0.35)
    );
    return tint * half(halo * 0.55);
}

//
// Single raymarch step body — returns true (1.0) if surface was hit.
// We pack hit + position into outputs since SKSL doesn't allow pointer-args.
//
struct RayHit {
    float hit;     // 0 or 1
    float3 pos;    // hit position
    float bodyMix; // body mix at hit
};

RayHit march(float3 ro, float3 rd, int steps, float maxDist, float t) {
    RayHit h;
    h.hit = 0.0;
    h.pos = ro;
    h.bodyMix = 0.0;

    float dist = 0.0;
    for (int i = 0; i < 64; i++) {
        if (i >= steps) { break; } // bounded by const, runtime gates via steps

        float3 p = ro + rd * dist;
        SceneSample s = mapScene(p, t);
        if (s.dist < 0.0015) {
            h.hit = 1.0;
            h.pos = p;
            h.bodyMix = s.bodyMix;
            return h;
        }
        dist += max(s.dist * 0.85, 0.01);
        if (dist > maxDist) {
            break;
        }
    }
    return h;
}

//
// Entry point.
//
half4 main(float2 fragCoord) {
    // Normalized device coords centered at (0,0), Y-up.
    float2 res = uResolution;
    float2 uv  = (fragCoord - 0.5 * res) / max(res.y, 1.0);
    uv.y = -uv.y;

    // When reduced motion is on, freeze time at a deterministic frame.
    float t = (uReducedMotion > 0.5) ? (uSeed.x * 12.0) : uTime;

    // Build a simple perspective ray. Camera sits at -3 on Z and looks
    // toward origin; rays are pre-normalized in clip-ish space.
    float3 ro = float3(0.0, 0.0, -3.0);
    float3 rd = normalize(float3(uv * 1.6, 1.0));

    int steps = (uReducedMotion > 0.5) ? 16 : 32;
    RayHit hit = march(ro, rd, steps, 4.0, t);

    // Sky / background underglow first.
    half3 col = SKY;
    col += underglow(uv * 1.2, t);

    if (hit.hit > 0.5) {
        half3 lit = shade(hit.pos, hit.bodyMix, t);
        // Composite over sky with a soft falloff at silhouette.
        // SKSL: keep alpha intent baked into the color for opaque output.
        col = mix(col, lit, half(0.92));
    }

    // Subtle vignette so the centerpiece reads as the focal point.
    float r2 = dot(uv, uv);
    col *= half(smoothstep(1.4, 0.0, r2));

    // Light-theme tone-roll — keep highlights from blowing out to pure
    // white so the bodies still read against #FFFFFF bg.
    col = clamp(col, half3(0.0), half3(1.0));

    return half4(col, 1.0);
}
`;

/**
 * The list of uniform names in declaration order, matching the SKSL above.
 * Skia's `<Shader uniforms={...} />` accepts an object keyed by name, but a
 * canonical list is useful for tests / dev diagnostics.
 */
export const ATMOSPHERIC_UNIFORM_NAMES = [
  'uTime',
  'uReserves',
  'uDemand',
  'uSeed',
  'uHueShift',
  'uSurfacePattern',
  'uPulseSeconds',
  'uRotationSpeed',
  'uReducedMotion',
  'uResolution',
] as const;

export type AtmosphericUniformName = (typeof ATMOSPHERIC_UNIFORM_NAMES)[number];
