#!/usr/bin/env python3
"""Few dozen trials; print JSON best for ShaderOrb constants (maximize ssim - 0.25*lpips)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

ORBITAL_OS = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
VPY = SCRIPTS / ".venv" / "bin" / "python"
PY = str(VPY) if VPY.is_file() else sys.executable
REF = Path(os.environ.get("ORB_REF_METRIC", str(ORBITAL_OS / "orb_iteration32g_interior_webgl.png"))).resolve()
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
GEN = [PY, str(SCRIPTS / "generate_orb_preview.py")]
CMP = [PY, str(SCRIPTS / "compare_orb_metrics.py")]


def render(port: int, out: Path) -> bool:
    try:
        subprocess.run(
            [
                CHROME,
                "--headless=new",
                "--window-size=800,800",
                "--virtual-time-budget=6000",
                f"--screenshot={out}",
                f"http://127.0.0.1:{port}/orb_preview.html",
            ],
            check=True,
            timeout=90,
            capture_output=True,
        )
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return False


def main() -> None:
    trials = []
    for sx in (1.028, 1.042):
        for by in (0.012, 0.024):
            for limb in (0.03, 0.038):
                for par in (0.58, 0.72):
                    for top in (0.78, 0.9):
                        trials.append(
                            {
                                "sx": sx,
                                "sy": sx * 0.997,
                                "bx": 0.0,
                                "by": by,
                                "uRefrLimb": limb,
                                "uParallax": par,
                                "uTopSuppress": top,
                                "uCapacity": 0.35,
                                "uTime": 8.15,
                            }
                        )

    port = 8901 + int(time.time()) % 40
    srv = subprocess.Popen(
        [PY, "-m", "http.server", str(port)],
        cwd=str(ORBITAL_OS),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(0.35)
    tmp = ORBITAL_OS / "_sweep.png"
    jp = ORBITAL_OS / "_sweep_params.json"
    best = None
    best_sc = -1e9
    try:
        for p in trials:
            jp.write_text(json.dumps(p))
            subprocess.run(GEN + ["--params", str(jp)], check=True, cwd=str(ORBITAL_OS))
            if not render(port, tmp):
                continue
            r = subprocess.run(CMP + [str(REF), str(tmp)], capture_output=True, text=True)
            if r.returncode != 0 or not r.stdout.strip():
                continue
            d = json.loads(r.stdout.strip().splitlines()[-1])
            ssim_v = float(d["ssim"])
            lp = float(d.get("lpips", 0.0))
            sc = ssim_v - 0.25 * lp
            if sc > best_sc:
                best_sc = sc
                best = (p, ssim_v, lp, sc)
    finally:
        srv.terminate()
        srv.wait(timeout=5)
        for g in (tmp, jp):
            if g.exists():
                g.unlink()

    if not best:
        print(json.dumps({"error": "sweep failed"}))
        sys.exit(1)
    p, ssim_v, lp, sc = best
    print(
        json.dumps(
            {
                "best_params": p,
                "ssim": ssim_v,
                "lpips": lp,
                "score": sc,
                "shader_orb_ts": {
                    "INTERIOR_UV_SCALE": [p["sx"], p["sy"]],
                    "INTERIOR_UV_BIAS": [p["bx"], p["by"]],
                    "REFR_LIMB": p["uRefrLimb"],
                    "PARALLAX_DEPTH": p["uParallax"],
                    "TOP_BAND_SUPPRESS": p["uTopSuppress"],
                },
            }
        )
    )


if __name__ == "__main__":
    main()
