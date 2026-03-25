#version 300 es
precision highp float;

uniform float uTime;
uniform float uCapacity;
uniform vec2 uResolution;

vec3 cyanGlassRim() { return vec3(0.12, 0.88, 0.94); }

vec3 nodeRimFromCap(float cap) {
  cap = clamp(cap, 0.0, 1.0);
  vec3 cr = vec3(0.12, 0.01, 0.02);
  vec3 cy = vec3(0.05, 0.08, 0.1);
  return mix(cr, cy, smoothstep(0.65, 1.0, cap));
}

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

float fbm5(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  v += a * vnoise(p); p = p * 2.02 + vec2(1.6, 8.1); a *= 0.5;
  v += a * vnoise(p); p = p * 2.03 + vec2(-2.2, 4.7); a *= 0.5;
  v += a * vnoise(p); p = p * 2.01 + vec2(3.9, -3.1); a *= 0.5;
  v += a * vnoise(p); p = p * 2.02 + vec2(-4.3, 2.8); a *= 0.5;
  v += a * vnoise(p);
  return v;
}

float fbm6(vec2 p) {
  float v = fbm5(p);
  float a = 0.015625;
  p = p * 2.04 + vec2(7.1, -2.9);
  v += a * vnoise(p);
  return v;
}

float fbm6o(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  v += a * vnoise(p); p = p * 2.03 + vec2(1.2, 3.1); a *= 0.5;
  v += a * vnoise(p); p = p * 2.02 + vec2(-2.1, 1.7); a *= 0.5;
  v += a * vnoise(p); p = p * 2.04 + vec2(0.6, -1.2); a *= 0.5;
  v += a * vnoise(p); p = p * 2.01 + vec2(2.2, 4.3); a *= 0.5;
  v += a * vnoise(p); p = p * 2.05 + vec2(-1.5, 2.8); a *= 0.5;
  v += a * vnoise(p);
  return v;
}

float fbm7(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  v += a * vnoise(p); p = p * 2.03 + vec2(1.15, 2.9); a *= 0.5;
  v += a * vnoise(p); p = p * 2.02 + vec2(-1.8, 1.4); a *= 0.5;
  v += a * vnoise(p); p = p * 2.04 + vec2(0.55, -1.1); a *= 0.5;
  v += a * vnoise(p); p = p * 2.01 + vec2(2.05, 3.75); a *= 0.5;
  v += a * vnoise(p); p = p * 2.05 + vec2(-1.22, 2.35); a *= 0.5;
  v += a * vnoise(p); p = p * 2.03 + vec2(3.05, -2.15); a *= 0.5;
  v += a * vnoise(p);
  return v;
}

vec2 volumeWarp(vec2 sph, float tm, float zPh) {
  vec2 p = sph + vec2(zPh * 0.13, zPh * -0.09);
  vec2 w0 = vec2(fbm5(p * 2.12 + tm * 0.053), fbm5(p * 2.05 - tm * 0.047 + vec2(2.18, 0.68))) * 0.9;
  vec2 u = p * 1.16 + w0;
  vec2 w1 = vec2(fbm6(u * 5.18 + vec2(-0.66, 1.48)), fbm6(u * 4.88 + vec2(1.02, -tm * 0.067))) * 0.44;
  vec2 u2 = u * 1.07 + w1;
  vec2 w2 = vec2(fbm5(u2 * 10.4 + tm * 0.051 + zPh), fbm5(u2 * 9.85 + vec2(-tm * 0.044, 1.78))) * 0.18;
  vec2 u3 = u2 + w2;
  vec2 w3 = vec2(fbm6(u3 * 14.6 + tm * 0.049), fbm6(u3 * 14.1 + vec2(-tm * 0.041, 0.98))) * 0.11;
  return u3 + w3 + vec2(fbm5(u3 * 19.1 + tm * 0.04), fbm5(u3 * 18.4 + vec2(tm * 0.034, -1.32))) * 0.062;
}

// Raw density → erosion → gas mask. Secondary structure = multiplicative FBM peaks (no placed blobs).
float gasDensity(vec2 sph, float tm, float zPh) {
  vec2 uw = volumeWarp(sph, tm, zPh);
  float b = fbm7(uw * 1.07 + vec2(tm * 0.056, tm * 0.043));
  float r1 = abs(fbm7(uw * 2.38 + vec2(-tm * 0.061, tm * 0.052)) * 2.0 - 1.0);
  float r2 = abs(fbm6o(uw * 4.28 + vec2(1.05, -tm * 0.051)) * 2.0 - 1.0);
  float d = smoothstep(0.035, 0.92, b) * mix(0.18, 1.0, pow(max(r1, 0.02), 0.52)) * mix(0.32, 1.0, pow(max(r2, 0.02), 0.42));

  float erA = abs(fbm5(uw * 64.0 + tm * 0.096) * 2.0 - 1.0);
  float erB = fbm5(uw * 122.0 + vec2(-tm * 0.112, tm * 0.102));
  d -= 0.22 * erA * erB;
  d = max(d, 0.04);
  d = clamp(d, 0.0, 1.45);

  float hole = abs(fbm5(uw * 3.42 + vec2(tm * 0.051, -tm * 0.047)) * 2.0 - 1.0);
  d *= smoothstep(0.16, 0.84, hole);

  float fil = abs(fbm5(uw * 40.0 + vec2(-tm * 0.105, tm * 0.114)) * 2.0 - 1.0);
  d *= mix(0.42, 1.0, smoothstep(0.1, 0.91, fil));

  d = smoothstep(0.0, 0.9, d);

  float peak1 = max(0.0, fbm6(uw * 6.35 + vec2(1.85, -0.78)) - 0.32);
  float peak2 = max(0.0, fbm6o(uw * 8.05 + vec2(-2.25, 1.08)) - 0.35);
  float peak3 = max(0.0, fbm5(uw * 5.05 + vec2(0.35, 2.15)) - 0.38);
  d += 0.42 * peak1 + 0.34 * peak2 + 0.28 * peak3;
  d = clamp(d, 0.0, 1.65);

  float r2 = dot(sph, sph);
  d *= (0.48 + 0.52 * smoothstep(1.03, 0.09, r2));
  d *= (0.82 + 0.18 * exp(-r2 * 2.45));
  d = pow(clamp(d, 0.0, 1.65), 0.86) * 2.35;
  return d;
}

// Emission + pseudo single-scattering: light through turbulent volume (density + path depth).
vec3 volumetricLight(float dens, float zIn, vec2 sph, vec3 rim, float tm) {
  float r2 = dot(sph, sph);
  float path = zIn * (1.12 - 0.38 * sqrt(clamp(r2, 0.0, 1.0)));
  float tau = dens * path * 2.05;
  float trans = exp(-tau * 0.68);

  float em = pow(clamp(dens, 0.0, 1.25), 1.28);
  float coreBright = exp(-r2 * 5.2) * em * em * 4.2;

  vec3 cCold = vec3(0.08, 0.006, 0.012);
  vec3 cCrim = vec3(0.55, 0.042, 0.065);
  vec3 cHot = vec3(0.96, 0.24, 0.07);
  vec3 cCore = vec3(1.0, 0.7, 0.38);
  vec3 emit = mix(cCold, cCrim, smoothstep(0.04, 0.44, dens));
  emit = mix(emit, cHot, smoothstep(0.2, 0.7, dens));
  emit = mix(emit, cCore, smoothstep(0.36, 0.96, dens));
  emit *= em + 0.22 * zIn;
  emit += cCore * coreBright * (0.55 + 0.45 * zIn);

  float cosTheta = clamp(zIn * 0.92 + sph.x * 0.12 + sph.y * -0.08, 0.0, 1.0);
  float phase = 0.62 + 0.38 * pow(cosTheta, 0.45);
  vec3 scatter = vec3(1.0, 0.42, 0.13) * (1.0 - trans) * phase * 0.95 * zIn * dens;

  emit *= dens * 1.35;
  vec3 rimTint = rim * 0.085 * dens * dens;
  return (emit + scatter + rimTint) * 1.25;
}

float emberPeaks(vec2 sph, float dens, float tm) {
  float g = smoothstep(0.24, 0.92, dens);
  vec2 s = sph * (1.0 + 0.022 * sin(tm * 0.088 + sph.y * 2.8));
  float h1 = max(0.0, fbm5(s * 1980.0 + vec2(tm * 0.017, -tm * 0.015)) - 0.84);
  float h2 = max(0.0, fbm5(s * 2750.0 - tm * 0.013) - 0.885);
  float h3 = max(0.0, abs(fbm5(s * 1560.0 + tm * 0.019) * 2.0 - 1.0) - 0.79);
  float vig = smoothstep(0.22, 0.9, abs(fbm5(sph * 18.5 + tm * 0.041) * 2.0 - 1.0));
  return (pow(h1, 10.5) * 1.15 + pow(h2, 13.5) * 0.72 + pow(h3, 15.0) * 0.48) * g * vig;
}

vec3 nebulaInterior(vec2 sph, float tm, float zIn, float rr, vec3 rim) {
  float zPh = zIn * 1.46 + fbm5(sph * 3.48 + vec2(tm * 0.039)) * 0.088;
  float d0 = gasDensity(sph, tm, zPh);
  float d1 = gasDensity(sph + vec2(zPh * 0.042, -zPh * 0.032), tm + 0.042, zPh * 0.87 + 0.29);
  float dens = mix(d0, d1, 0.32 + 0.68 * zIn);
  float shell = (1.0 - smoothstep(0.72, 1.02, rr)) * zIn;
  dens *= shell;

  vec3 rgb = volumetricLight(dens, zIn, sph, rim, tm);
  float emb = emberPeaks(sph, dens, tm);
  rgb += vec3(1.0, 0.5, 0.17) * emb * 7.8;
  return rgb * (0.9 + 0.1 * zIn);
}


out vec4 fragColor;

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  float minDim = min(uResolution.x, uResolution.y);
  vec2 ndc0 = (coord * 2.0 - uResolution) / minDim;
  float rScreen = length(ndc0);
  float px = 2.0 / minDim;
  float disk = 1.0 - smoothstep(1.0 - px * 2.0, 1.0 + px * 2.0, rScreen);

  vec3 mapped = vec3(0.0);
  float blendG = 0.0;
  if (disk > 0.0) {
    float cap = clamp(uCapacity, 0.0, 1.0);
    float tm = uTime;
    vec2 ndc = ndc0 * (1.0 + 0.002 * sin(tm * 0.27 + ndc0.y * 1.8));
    float r = length(ndc);
    float insideMask = 1.0 - smoothstep(0.9935, 1.0065, r);
    float limb = smoothstep(0.62, 1.0, r);
    vec2 refr = ndc * (1.0 - 0.10 * limb * limb);
    float rr = length(refr);
    float zIn = sqrt(max(1.0 - min(rr * rr, 0.9999), 1.0e-5));
    vec3 N = normalize(vec3(refr.x, refr.y, zIn));
    vec3 V = vec3(0.0, 0.0, 1.0);
    float NdV = clamp(dot(N, V), 0.0, 1.0);
    vec2 sph = refr.xy;
    vec3 rimC = nodeRimFromCap(cap);
    vec3 cy = cyanGlassRim();

    float ped = smoothstep(0.045, 0.018, abs(length(sph - vec2(0.0, -0.72)) - 0.075));
    float baseDark = 1.0 - (1.0 - ped) * 0.14;

    vec3 interior = vec3(0.0001, 0.0, 0.0);
    interior += nebulaInterior(sph, tm, zIn, rr, rimC);
    interior *= baseDark;

    float rimBand = smoothstep(0.94, 0.998, r);
    float rimBoost = 1.0 + 0.16 * smoothstep(-0.35, 0.25, -N.y);
    vec3 fres = cy * pow(1.0 - NdV, 3.4) * 1.62 * rimBoost * insideMask * rimBand;
    float glint = pow(1.0 - NdV, 11.5) * smoothstep(0.78, 0.998, r) * 2.35 * insideMask;
    vec3 specHit = vec3(0.82, 0.94, 1.0) * glint * 0.36;

    vec3 poleGlow = cy * pow(abs(N.y), 1.85) * smoothstep(0.5, 0.99, r) * insideMask * zIn * 0.42;
    poleGlow += cy * pow(1.0 - abs(N.y), 2.4) * smoothstep(0.58, 0.99, r) * insideMask * zIn * 0.18;

    float caustSharp = exp(-length(sph - vec2(0.0, -0.52)) * 11.0) * smoothstep(0.45, 0.93, zIn) * 0.055;
    vec3 caustWarm = vec3(1.0, 0.45, 0.11) * caustSharp;

    vec3 rgb = interior + fres + specHit + poleGlow + caustWarm;
    rgb = max(rgb, 0.0);
    rgb = min(rgb, vec3(2.55, 1.45, 0.42));
    mapped = rgb / (1.0 + rgb * 1.82);
    mapped = pow(mapped, vec3(1.06, 1.04, 1.01));
  }
  // Ground / pedestal only outside the glass disk — never replace orb interior.
  float below = smoothstep(0.02, 0.55, ndc0.y);
  blendG = below * smoothstep(1.02, 1.24, rScreen);
  if (blendG > 0.001) {
    vec2 gq = ndc0 * vec2(1.05, 0.88) + vec2(0.0, -0.06);
    float grit = 0.022 + 0.09 * fbm5(gq * 10.5 + vec2(uTime * 0.01, 0.0));
    float warmF = exp(-length(vec2(gq.x * 0.85, gq.y - 0.4)) * 2.45) * 0.74;
    float cyanF = exp(-length(vec2(gq.x, gq.y - 0.37)) * 3.1) * 0.52;
    float sideC = exp(-length(vec2(gq.x - 0.64, gq.y - 0.35)) * 3.2) * 0.14;
    sideC += exp(-length(vec2(gq.x + 0.64, gq.y - 0.35)) * 3.2) * 0.14;
    vec3 ground = vec3(grit);
    ground += vec3(1.0, 0.42, 0.1) * warmF;
    ground += cyanGlassRim() * (cyanF + sideC);
    mapped = mix(mapped, ground, blendG);
  }
  float aOut = max(disk, blendG);
    fragColor = vec4(mapped, 1.0);
}
