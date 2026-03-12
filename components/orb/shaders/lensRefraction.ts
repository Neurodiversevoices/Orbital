/**
 * lensRefraction.ts — SKSL barrel distortion shader
 */

export const LENS_REFRACTION_SKSL = `
uniform shader content;
uniform vec2 iResolution;
uniform vec2 center;
uniform float radius;
uniform float ior;
uniform float chromaticAberration;
uniform float vignetteStrength;
uniform float grainAmount;
uniform float time;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 barrelDistort(vec2 uv, vec2 c, float strength) {
  vec2 delta = uv - c;
  float dist = length(delta) / radius;
  if (dist > 1.0) return uv;
  float distortionFactor = 1.0 + strength * dist * dist;
  return c + delta * distortionFactor;
}

half4 main(vec2 fragCoord) {
  vec2 uv = fragCoord;
  vec2 delta = uv - center;
  float dist = length(delta) / radius;
  if (dist > 1.0) {
    return content.eval(uv);
  }
  float distortStrength = (ior - 1.0) * 0.5;
  vec2 uvR = barrelDistort(uv, center, distortStrength + chromaticAberration);
  vec2 uvG = barrelDistort(uv, center, distortStrength);
  vec2 uvB = barrelDistort(uv, center, distortStrength - chromaticAberration);
  float r = content.eval(uvR).r;
  float g = content.eval(uvG).g;
  float b = content.eval(uvB).b;
  float a = content.eval(uv).a;
  half4 color = half4(r, g, b, a);
  float vignette = 1.0 - pow(dist, 2.2) * vignetteStrength;
  color.rgb *= vignette;
  vec2 specularCenter = center + vec2(-radius * 0.25, -radius * 0.3);
  float specDist = length(uv - specularCenter) / (radius * 0.4);
  float specular = max(0.0, 1.0 - specDist) * 0.08;
  specular = pow(specular, 2.0);
  color.rgb += specular;
  float grain = hash(fragCoord + vec2(time * 1.7, time * 0.3)) * 2.0 - 1.0;
  color.rgb += grain * grainAmount;
  float angle = atan(delta.y, delta.x);
  float scratchPattern = fract(sin(angle * 47.0 + dist * 23.0) * 43758.5453);
  float scratch = step(0.97, scratchPattern) * 0.015 * (1.0 - dist);
  color.rgb += scratch;
  return color;
}
`;

export const LENS_DEFAULTS = {
  ior: 1.15,
  chromaticAberration: 0.003,
  vignetteStrength: 0.35,
  grainAmount: 0.035,
};
