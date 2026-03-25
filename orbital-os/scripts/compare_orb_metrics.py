#!/usr/bin/env python3
"""Resize to common square, then print SSIM and LPIPS (lower LPIPS is better)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim_metric

try:
    import lpips
    import torch
except ImportError:
    lpips = None
    torch = None


def load_square_rgb(path: Path, side: int) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    im = im.crop((left, top, left + s, top + s))
    im = im.resize((side, side), Image.Resampling.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255.0


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: compare_orb_metrics.py ref.png cand.png", file=sys.stderr)
        sys.exit(2)
    ref_p = Path(sys.argv[1])
    cand_p = Path(sys.argv[2])
    side = 800
    ref = load_square_rgb(ref_p, side)
    cand = load_square_rgb(cand_p, side)
    ssim_v = float(ssim_metric(ref, cand, channel_axis=2, data_range=1.0))
    out = {"ssim": ssim_v}
    if lpips is not None and torch is not None:
        loss = lpips.LPIPS(net="alex")
        t0 = torch.from_numpy(ref).permute(2, 0, 1).unsqueeze(0) * 2.0 - 1.0
        t1 = torch.from_numpy(cand).permute(2, 0, 1).unsqueeze(0) * 2.0 - 1.0
        with torch.no_grad():
            out["lpips"] = float(loss(t0, t1).item())
    print(json.dumps(out))


if __name__ == "__main__":
    main()
