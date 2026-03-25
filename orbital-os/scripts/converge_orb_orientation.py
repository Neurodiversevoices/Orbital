#!/usr/bin/env python3
"""OBSOLETE: orientation is fixed via coreUV + rotationBetween in ShaderOrb.tsx. Do not run."""
from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image

OB = Path(__file__).resolve().parents[1]  # orbital-os
APP = OB.parent  # Orbital (sibling of orbital-os)
TSX = APP / "components" / "orb" / "ShaderOrb.tsx"
OUT_PNG = OB / "orb_plate_readback.png"
DESK = Path.home() / "Desktop" / "orb_final.png"
PY = OB / "scripts" / ".venv" / "bin" / "python"
GEN = [str(PY), str(OB / "scripts" / "generate_orb_preview.py")]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
JP = OB / "_converge_orient.json"


def heuristic_score(path: Path) -> float:
    im = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255.0
    H, W, _ = im.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = (W - 1) / 2.0, (H - 1) / 2.0
    rad = 0.42 * min(H, W)
    disk = (xx - cx) ** 2 + (yy - cy) ** 2 < rad**2
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    lower_half = disk & (yy >= H / 2)
    lower_third = disk & (yy >= 2 * H / 3)
    bottom = disk & (yy >= 0.72 * H)
    top = disk & (yy < H / 3)

    core = float(np.percentile(lum[lower_half], 88)) if np.any(lower_half) else 0.0
    core_lo3 = float(np.percentile(lum[lower_third], 75)) if np.any(lower_third) else 0.0
    cyan = float(np.mean(np.maximum(0.0, (g + b) / 2.0 - r)[bottom])) if np.any(bottom) else 0.0
    top_std = float(np.std(lum[top])) if np.any(top) else 1.0

    sym = 0.0
    band = disk & (yy >= int(0.35 * H)) & (yy < int(0.65 * H))
    mid = W // 2
    w2 = min(mid, W - mid)
    if w2 > 4:
        for y in range(H):
            if not np.any(band[y, :]):
                continue
            L = lum[y, mid - w2 : mid]
            R = lum[y, mid : mid + w2]
            if L.size and R.size == L.size:
                sym += float(np.mean(np.abs(L - R[::-1])))
        sym /= max(1, H)

    return (
        2.1 * core
        + 1.6 * core_lo3
        + 2.0 * cyan
        - 1.1 * top_std
        - 0.45 * sym
    )


def early_ok(path: Path) -> bool:
    im = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255.0
    H, W, _ = im.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = (W - 1) / 2.0, (H - 1) / 2.0
    rad = 0.42 * min(H, W)
    disk = (xx - cx) ** 2 + (yy - cy) ** 2 < rad**2
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    lower_third = disk & (yy >= 2 * H / 3)
    bottom = disk & (yy >= 0.78 * H)
    top = disk & (yy < H / 3)
    core_q = float(np.percentile(lum[lower_third], 80)) if np.any(lower_third) else 0.0
    cyan = float(np.mean(np.maximum(0.0, (g + b) / 2.0 - r)[bottom])) if np.any(bottom) else 0.0
    top_std = float(np.std(lum[top])) if np.any(top) else 1.0
    return core_q > 0.38 and cyan > 0.045 and top_std < 0.14


def render_preview(port: int, y: float, u: float) -> None:
    JP.write_text(
        json.dumps(
            {
                "uCapacity": 0.35,
                "uYOffset": float(y),
                "uUOffset": float(u),
                "uTime": 8.15,
            }
        )
    )
    subprocess.run(GEN + ["--params", str(JP)], check=True, cwd=str(OB))
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--window-size=800,800",
            "--virtual-time-budget=12000",
            f"--screenshot={OUT_PNG}",
            f"http://127.0.0.1:{port}/orb_preview.html",
        ],
        check=True,
        capture_output=True,
    )


def patch_tsx(y: float, u: float) -> None:
    text = TSX.read_text()
    text = re.sub(
        r"const ORB_Y_OFFSET = [-0-9.]+;",
        f"const ORB_Y_OFFSET = {y:.6f};",
        text,
        count=1,
    )
    text = re.sub(
        r"const ORB_U_OFFSET = [-0-9.]+;",
        f"const ORB_U_OFFSET = {u:.6f};",
        text,
        count=1,
    )
    TSX.write_text(text)


def sync_preview_defaults(y: float, u: float) -> None:
    """Keep generate_orb_preview.py defaults aligned with TSX after search."""
    gp = OB / "scripts" / "generate_orb_preview.py"
    t = gp.read_text()
    t = re.sub(
        r'"uYOffset": [-0-9.]+,',
        f'"uYOffset": {y:.6f},',
        t,
        count=1,
    )
    t = re.sub(
        r'"uUOffset": [-0-9.]+,',
        f'"uUOffset": {u:.6f},',
        t,
        count=1,
    )
    gp.write_text(t)


def main() -> None:
    y = -0.32
    u = 0.035
    step_y = 0.08
    step_u = 0.02
    port = 8990 + int(time.time()) % 40
    srv = subprocess.Popen(
        [str(PY), "-m", "http.server", str(port)],
        cwd=str(OB),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(0.35)
    try:
        for it in range(10):
            candidates = [
                (y, u),
                (y + step_y, u),
                (y - step_y, u),
                (y, u + step_u),
                (y, u - step_u),
            ]
            best_y, best_u, best_s = y, u, -1e18
            for cy, cu in candidates:
                render_preview(port, cy, cu)
                sc = heuristic_score(OUT_PNG)
                if sc > best_s:
                    best_s = sc
                    best_y, best_u = cy, cu

            y, u = best_y, best_u
            render_preview(port, y, u)
            print(
                json.dumps(
                    {"iter": it, "yOffset": y, "uOffset": u, "score": best_s},
                )
            )

            if early_ok(OUT_PNG):
                print(json.dumps({"iter": it, "early_stop": True}))
                break

            step_y *= 0.5
            step_u *= 0.5

        patch_tsx(y, u)
        sync_preview_defaults(y, u)
        render_preview(port, y, u)
        DESK.write_bytes(OUT_PNG.read_bytes())
        print(
            json.dumps(
                {
                    "final_yOffset": y,
                    "final_uOffset": u,
                    "orb_plate_readback": str(OUT_PNG),
                    "orb_final": str(DESK),
                },
                indent=2,
            )
        )
    finally:
        srv.terminate()
        srv.wait(timeout=5)
        JP.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
