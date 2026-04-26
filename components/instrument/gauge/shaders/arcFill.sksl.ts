export const ARC_FILL_SKSL = `
uniform float  uCapacity;
uniform float  uTime;
uniform float2 uResolution;
uniform float3 uStateColor;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}
float noise(float2 p) {
  float2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + float2(1.0, 0.0)),
        c = hash(i + float2(0.0, 1.0)), d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(float2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uResolution;
  float2 p  = uv * 3.0 + float2(uTime * 0.06, 0.0);
  float n   = fbm(p);
  float bright = 0.55 + 0.45 * n;
  float3 col = uStateColor * bright;
  float edge = smoothstep(0.42, 0.5, abs(uv.y - 0.5));
  col += float3(edge * 0.2);
  return half4(col, 1.0);
}
`;

export const GLASS_DISC_SKSL = `
uniform float2 uResolution;
uniform float  uTint;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uResolution;
  float r = distance(uv, float2(0.5));
  float vignette = smoothstep(0.5, 0.2, r);
  float3 base = float3(0.05, 0.06, 0.08);
  float3 tint = float3(1.0) * uTint * vignette;
  return half4(base + tint, 0.55 + 0.25 * vignette);
}
`;
