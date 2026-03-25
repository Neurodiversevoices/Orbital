#!/usr/bin/env python3
"""Grid search preview params; keep best by maximize ssim - 0.25*lpips."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

ORBITAL_OS = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
REF_DEFAULT = ORBITAL_OS / "orb_iteration32g_interior_webgl.png"

GEN = [sys.executable, str(SCRIPTS / "generate_orb_preview.py")]
CMP = [sys.executable, str(SCRIPTS / "compare_orb_metrics.py")]

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def render_latest(port: int, out_png: Path) -> None:
    url = f"http://127.0.0.1:{port}/orb_preview.html"
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--window-size=800,800",
            "--virtual-time-budget=6000",
            f"--screenshot={out_png}",
            url,
        ],
        check=True,
        timeout=120,
        capture_output=True,
    )


def score_from_json(s: str) -> tuple[float, float, float]:
    d = json.loads(s.strip())
    ssim_v = float(d["ssim"])
    lp = float(d.get("lpips", 0.0))
    return ssim_v, lp, ssim_v - 0.25 * lp


def main() -> None:
    ref = Path(os.environ.get("ORB_REF_METRIC", str(REF_DEFAULT))).resolve()
    if not ref.is_file():
        print("missing ref", ref, file=sys.stderr)
        sys.exit(1)

    trials = []
    for sx in (1.02, 1.035, 1.05):
        for by in (0.0, 0.015, 0.03):
            for limb in (0.024, 0.032, 0.04):
                for par in (0.45, 0.62, 0.78):
                    for top in (0.65, 0.82, 0.95):
                        trials.append(
                            {
                                "sx": sx,
                                "sy": sx * 0.998,
                                "bx": 0.0,
                                "by": by,
                                "uRefrLimb": limb,
                                "uParallax": par,
                                "uTopSuppress": top,
                                "uCapacity": 0.35,
                                "uTime": 8.15,
                            }
                        )

    best = None
    best_sc = -1e9
    port = 8899 + (int(time.time()) % 50)
    out_png = ORBITAL_OS / "_tune_tmp.png"
    srv = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        cwd=str(ORBITAL_OS),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(0.4)
    try:
        for i, p in enumerate(trials):
            params_path = ORBITAL_OS / "_tune_params.json"
            params_path.write_text(json.dumps(p))
            subprocess.run(GEN + ["--params", str(params_path)], check=True, cwd=str(ORBITAL_OS))
            try:
                render_latest(port, out_png)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                continue
            r = subprocess.run(
                CMP + [str(ref), str(out_png)],
                capture_output=True,
                text=True,
                check=False,
            )
            if r.returncode != 0:
                continue
            try:
                ssim_v, lp, sc = score_from_json(r.stdout)
            except (json.JSONDecodeError, KeyError):
                continue
            if sc > best_sc:
                best_sc = sc
                best = (dict(p), ssim_v, lp, sc)
            if (i + 1) % 20 == 0:
                print(json.dumps({"progress": i + 1, "best": best}), flush=True)
    finally:
        srv.terminate()
        srv.wait(timeout=5)
        for garbage in (out_png, ORBITAL_OS / "_tune_params.json"):
            if garbage.exists():
                garbage.unlink()

    if best is None:
        print(json.dumps({"error": "no successful trials"}))
        sys.exit(1)
    params, ssim_v, lp, sc = best
    print(json.dumps({"best_params": params, "ssim": ssim_v, "lpips": lp, "score": sc}))


if __name__ == "__main__":
    main()
