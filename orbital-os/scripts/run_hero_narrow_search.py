#!/usr/bin/env python3
"""
Narrow local search vs full-frame hero. Requires ref_hero_sample.png at OB/ref_hero_sample.png
or ORB_REF_METRIC set. Keeps change only if LPIPS improves and SSIM loss <= SSIM_TOL.

Uniforms only (ShaderOrb must match generate_orb_preview Round J baseline).
Silhouette / fresTopLip shader tweaks stay in ShaderOrb.tsx — edit there in separate rounds.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

OB = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
VPY = SCRIPTS / ".venv" / "bin" / "python"
PY = str(VPY) if VPY.is_file() else sys.executable
REF = Path(
    os.environ.get(
        "ORB_REF_METRIC",
        str(OB / "ref_hero_sample.png"),
    )
).resolve()

GEN = [PY, str(SCRIPTS / "generate_orb_preview.py")]
CMP = [PY, str(SCRIPTS / "compare_orb_metrics.py")]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

SSIM_TOL = 0.006  # material regression guard

BASE = {
    "sx": 1.0,
    "sy": 1.0,
    "bx": 0.0,
    "by": 0.0,
    "uParallax": 0.0,
    "uCapacity": 0.35,
    "uTime": 8.15,
}

# Tiny isolated steps (matches generate_orb_preview JSON after image-driven arch)
TRIALS: list[tuple[str, dict]] = [
    ("parallax+0.012", {"uParallax": 0.012}),
    ("parallax-0.0", {"uParallax": 0.0}),
    ("sx+0.004", {"sx": 1.004, "sy": 1.004}),
    ("sx-0.004", {"sx": 0.996, "sy": 0.996}),
    ("by+0.002", {"by": 0.002}),
    ("by-0.002", {"by": -0.002}),
]


def render(port: int, out: Path) -> None:
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--window-size=800,800",
            "--virtual-time-budget=8000",
            f"--screenshot={out}",
            f"http://127.0.0.1:{port}/orb_preview.html",
        ],
        check=True,
        timeout=120,
        capture_output=True,
    )


def measure(ref: Path, cand: Path) -> tuple[float, float]:
    r = subprocess.run(CMP + [str(ref), str(cand)], capture_output=True, text=True)
    r.check_returncode()
    line = r.stdout.strip().splitlines()[-1]
    d = json.loads(line)
    return float(d["ssim"]), float(d["lpips"])


def main() -> None:
    if not REF.is_file():
        print(
            json.dumps(
                {
                    "error": "missing_ref",
                    "path": str(REF),
                    "hint": "Add full-frame hero PNG at this path, then re-run.",
                },
                indent=2,
            )
        )
        sys.exit(2)

    port = 8910 + int(time.time()) % 50
    srv = subprocess.Popen(
        [PY, "-m", "http.server", str(port)],
        cwd=str(OB),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(0.4)
    cand = OB / "orb_latest.png"
    jp = OB / "_hero_trial.json"
    micro = 0
    try:
        jp.write_text(json.dumps(BASE))
        subprocess.run(GEN + ["--params", str(jp)], check=True, cwd=str(OB))
        render(port, cand)
        s0, l0 = measure(REF, cand)
        print(json.dumps({"round": "baseline_J_uniforms", "ssim": s0, "lpips": l0, "ref": str(REF)}))
        best_p = dict(BASE)
        best_s, best_l = s0, l0

        for name, delta in TRIALS:
            old_s, old_l = best_s, best_l
            p = {**best_p, **delta}
            jp.write_text(json.dumps(p))
            subprocess.run(GEN + ["--params", str(jp)], check=True, cwd=str(OB))
            render(port, cand)
            s1, l1 = measure(REF, cand)
            keep = (
                l1 < best_l
                and s1 >= best_s - SSIM_TOL
            )
            if keep:
                prev_l = best_l
                lp_improve = prev_l - l1
                best_p, best_s, best_l = p, s1, l1
                # Phase 2: microscopic = LPIPS gain < 0.001 vs previous best
                if lp_improve < 0.001:
                    micro += 1
                else:
                    micro = 0
            else:
                micro = 0
            print(
                json.dumps(
                    {
                        "param_changed": name,
                        "old_ssim": old_s,
                        "old_lpips": old_l,
                        "new_ssim": s1,
                        "new_lpips": l1,
                        "decision": "KEEP" if keep else "REVERT",
                        "best_after_ssim": best_s,
                        "best_after_lpips": best_l,
                    }
                )
            )
            if micro >= 5:
                print(
                    json.dumps(
                        {
                            "plateau": True,
                            "message": "Switch to crop/framing or ShaderOrb silhouette shader edits.",
                        }
                    )
                )
                break

        print(json.dumps({"winner_params": best_p}, indent=2))
    finally:
        srv.terminate()
        srv.wait(timeout=5)
        if jp.exists():
            jp.unlink()


if __name__ == "__main__":
    main()
