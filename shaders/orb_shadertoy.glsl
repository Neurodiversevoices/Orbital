// ShaderToy parity with app SkSL — amber cores, 2× node spread, k=30, aggressive Reinhard.

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

float previewCap() {
    return clamp(0.52 + 0.08 * sin(iTime * 0.07), 0.0, 1.0);
}

vec3 cyanGlassRim() {
    return vec3(0.12, 0.88, 0.94);
}

vec3 nodeRimFromCap(float cap) {
    cap = clamp(cap, 0.0, 1.0);
    vec3 cr = vec3(0.12, 0.01, 0.02);
    vec3 cy = vec3(0.05, 0.08, 0.1);
    return mix(cr, cy, smoothstep(0.65, 1.0, cap));
}

vec3 stellarNodeContrib(vec2 sph, vec2 center, float k, float amp, float tm, vec3 rim) {
    float turb = 0.94 + 0.06 * fbm5(sph * 6.2 + center * 11.7 + vec2(tm * 0.022));
    vec2 d = sph - center;
    float f = exp(-k * dot(d, d));
    vec3 coreAmber = vec3(0.9, 0.4, 0.05);
    vec3 ncol = mix(rim, coreAmber, pow(clamp(f, 0.0, 1.0), 0.22));
    return ncol * f * amp * turb;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    float minDim = min(res.x, res.y);
    vec2 ndc0 = (fragCoord * 2.0 - res) / minDim;

    float cap = previewCap();
    float tm = iTime;

    vec3 col = vec3(0.0);

    vec2 ndc = ndc0 * (1.0 + 0.002 * sin(tm * 0.27 + ndc0.y * 1.8));
    float r = length(ndc);
    float outerCut = 1.0 - smoothstep(1.28, 1.42, r);
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

    vec3 acc = vec3(0.0);
    acc += stellarNodeContrib(sph, vec2(-0.36, 0.24), 30.0, 14.0, tm, rimC);
    acc += stellarNodeContrib(sph, vec2(0.56, -0.16), 30.0, 9.0, tm, rimC);
    acc += stellarNodeContrib(sph, vec2(-0.10, -0.44), 30.0, 7.0, tm, rimC);
    acc += stellarNodeContrib(sph, vec2(0.30, 0.50), 30.0, 6.0, tm, rimC);
    acc += stellarNodeContrib(sph, vec2(-0.56, -0.30), 30.0, 4.5, tm, rimC);

    vec3 interior = vec3(0.01, 0.0, 0.0) + acc;
    float rimBand = smoothstep(0.94, 0.998, r);
    vec3 fres = cy * pow(1.0 - NdV, 4.0) * 1.35 * insideMask * rimBand;

    vec3 rgb = interior + fres;
    rgb = max(rgb, 0.0);
    vec3 mapped = rgb / (1.0 + rgb * 2.5);

    float aIn = insideMask;
    float alpha = aIn;

    float aOrb = alpha * outerCut;
    col = col * (1.0 - aOrb) + mapped * aOrb;

    fragColor = vec4(col, 1.0);
}
