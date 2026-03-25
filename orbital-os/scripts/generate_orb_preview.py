#!/usr/bin/env python3
"""Build orbital-os/orb_preview.html from ShaderOrb.tsx OVERLAY_SHADER + orb_interior.png."""
from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ORBITAL_OS = Path(__file__).resolve().parents[1]
SHADER_ORB = ROOT / "components" / "orb" / "ShaderOrb.tsx"
OUT_HTML = ORBITAL_OS / "orb_preview.html"
ORB_PNG_SRC = ROOT / "assets" / "orb_interior.png"
ORB_PNG_DST = ORBITAL_OS / "orb_interior.png"


def extract_overlay_sksl(tsx: str) -> str:
    m = re.search(r"const OVERLAY_SHADER = `([\s\S]*?)`;", tsx)
    if not m:
        raise SystemExit("OVERLAY_SHADER not found in ShaderOrb.tsx")
    return m.group(1)


def overlay_sksl_to_glsl_function(sksl: str) -> str:
    s = sksl.strip()
    s = s.replace("uniform float2 ", "uniform vec2 ")
    s = s.replace("float2 ", "vec2 ")
    s = s.replace("half4(", "vec4(")
    s = s.replace("half3(", "vec3(")
    s = s.replace("half(", "float(")
    s = s.replace(
        "vec4 main(vec2 coord) {",
        "vec3 overlayAdd(vec2 coord) {",
    )
    s = s.replace(
        "return vec4(vec3(add), float(1.0));",
        "return vec3(add);",
    )
    return s


def build_glsl_fragment(overlay_fn: str) -> str:
    return f"""#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uResolution;
uniform float uTime;
out vec4 fragColor;

{overlay_fn}

void main() {{
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 uv = coord / uResolution;
  vec3 b = texture(uTex, uv).rgb;
  vec3 add = overlayAdd(coord);
  fragColor = vec4(min(b + add, 1.0), 1.0);
}}
"""


def build_html(fs: str, params: dict) -> str:
    fs_js = fs.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    ut = float(params["uTime"])
    lines = [
        "<!doctype html><html><head><meta charset='utf-8'><title>Orb preview</title></head><body>",
        '<canvas id="c" width="800" height="800"></canvas>',
        "<script>",
        f'const FS = "{fs_js}";',
        'const VS = "#version 300 es\\nprecision highp float;\\nin vec4 aPos;\\nvoid main(){ gl_Position = aPos; }\\n";',
        "function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);",
        "if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s;}",
        'const gl=document.getElementById("c").getContext("webgl2");',
        "const img=new Image();",
        "img.onload=()=>{",
        "const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);",
        "gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);",
        "gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);",
        "gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);",
        "gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);",
        "gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);",
        "gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);",
        "const p=gl.createProgram();",
        "gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VS));",
        "gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,FS));",
        "gl.linkProgram(p);",
        "if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw gl.getProgramInfoLog(p);",
        "gl.useProgram(p);",
        "const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);",
        "gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);",
        "const L=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(L);",
        "gl.vertexAttribPointer(L,2,gl.FLOAT,false,0,0);",
        'gl.uniform2f(gl.getUniformLocation(p,"uResolution"),800,800);',
        f'gl.uniform1f(gl.getUniformLocation(p,"uTime"),{ut});',
        'gl.uniform1i(gl.getUniformLocation(p,"uTex"),0);',
        "gl.viewport(0,0,800,800);gl.drawArrays(gl.TRIANGLES,0,6);",
        "};",
        'img.src="orb_interior.png";',
        "</script></body></html>",
    ]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--params",
        type=Path,
        help="JSON with uTime (optional)",
    )
    ap.add_argument("-o", type=Path, default=OUT_HTML)
    args = ap.parse_args()
    if ORB_PNG_SRC.is_file():
        shutil.copy2(ORB_PNG_SRC, ORB_PNG_DST)
    tsx = SHADER_ORB.read_text()
    sksl = extract_overlay_sksl(tsx)
    overlay_fn = overlay_sksl_to_glsl_function(sksl)
    fs = build_glsl_fragment(overlay_fn)
    params = {
        "uTime": 8.15,
    }
    if args.params:
        params.update(json.loads(args.params.read_text()))
    html = build_html(fs, params)
    args.o.write_text(html)


if __name__ == "__main__":
    main()
