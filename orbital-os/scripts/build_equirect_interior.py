#!/usr/bin/env python3
"""Build lat-long equirect interior from ref_hero_sample.png (asset only; no shader math change)."""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def main() -> None:
    ob = Path(__file__).resolve().parents[1]  # orbital-os
    root = Path(__file__).resolve().parents[2]  # Orbital app root (assets/)
    src = Path(os.environ.get("ORB_HERO_REF", str(ob / "ref_hero_sample.png")))
    out_app = root / "assets" / "orb_interior_equirect.png"
    out_os = ob / "orb_interior_equirect.png"

    img = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255.0
    h0, w0 = img.shape[:2]
    cx = w0 * 0.5
    cy = h0 * ((0.565 + 0.125) - 0.07)
    r_disk = min(w0, h0) * 0.335

    W, H = 1024, 512
    jj, ii = np.meshgrid(
        np.arange(H, dtype=np.float32),
        np.arange(W, dtype=np.float32),
        indexing="ij",
    )
    u_tex = (ii + 0.5) / W
    v_tex = (jj + 0.5) / H
    theta = u_tex * (2.0 * np.pi) - np.pi
    phi = v_tex * np.pi
    sin_p = np.sin(phi)
    dx = sin_p * np.cos(theta)
    dy = np.cos(phi)
    dz = sin_p * np.sin(theta)

    dz_f = np.where(dz < 0.0, -dz * 0.92 + 0.06, dz + 0.04)
    mag = np.sqrt(dx * dx + dy * dy + dz_f * dz_f) + 1e-6
    dx_u = dx / mag
    dy_u = dy / mag
    dz_u = dz_f / mag

    zenith = np.clip(dz_u, 0.0, 1.0)
    stretch = np.sqrt(np.maximum(0.0, 1.0 - zenith * zenith))
    px = cx + r_disk * dx_u * stretch
    py = cy - r_disk * dy_u * stretch

    ox = px - cx
    oy = py - cy
    dist = np.sqrt(ox * ox + oy * oy)
    max_r = r_disk * 1.08
    pull = np.where(dist > max_r, max_r / (dist + 1e-6), 1.0)
    px = cx + ox * pull
    py = cy + oy * pull

    px = np.clip(px, 0, w0 - 1.001)
    py = np.clip(py, 0, h0 - 1.001)
    x0 = np.floor(px).astype(np.int32)
    y0 = np.floor(py).astype(np.int32)
    x1 = np.clip(x0 + 1, 0, w0 - 1)
    y1 = np.clip(y0 + 1, 0, h0 - 1)
    wx = (px - x0).astype(np.float64)
    wy = (py - y0).astype(np.float64)
    c00 = img[y0, x0]
    c10 = img[y0, x1]
    c01 = img[y1, x0]
    c11 = img[y1, x1]
    out = (
        (1 - wx)[:, :, None] * ((1 - wy)[:, :, None] * c00 + wy[:, :, None] * c01)
        + wx[:, :, None] * ((1 - wy)[:, :, None] * c10 + wy[:, :, None] * c11)
    )
    out = np.clip(out, 0.0, 1.0)

    band = 24
    for k in range(band):
        a = k / band
        left = out[:, k].copy()
        right = out[:, W - band + k].copy()
        out[:, k] = (1 - a) * left + a * right
        lr = out[:, W - 1 - k].copy()
        rr = out[:, band - 1 - k].copy()
        out[:, W - 1 - k] = (1 - a) * lr + a * rr

    pole = max(8, H // 48)
    for j in range(pole):
        t = j / pole
        out[j, :] = (1 - t) * out[pole, :] + t * out[j, :]
        out[H - 1 - j, :] = (1 - t) * out[H - 1 - pole, :] + t * out[H - 1 - j, :]

    rgb = Image.fromarray((out * 255.0).astype(np.uint8), mode="RGB")
    rgb = rgb.filter(ImageFilter.GaussianBlur(radius=0.85))

    out_app.parent.mkdir(parents=True, exist_ok=True)
    rgb.save(out_app, optimize=True)
    rgb.save(out_os, optimize=True)
    print("wrote", out_app)
    print("wrote", out_os, rgb.size)


if __name__ == "__main__":
    main()
