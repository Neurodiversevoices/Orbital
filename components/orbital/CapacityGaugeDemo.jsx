// CapacityGaugeDemo — design Claude's original gauge. Self-animating demo values.
// Used by: landing only. NOT shown to signed-in users as real data.
import React from 'react';

// gauge.jsx — Orbital Capacity Gauge v3 (2026 instrument).
//
// Headroom semantics: 0 = empty / no capacity left, 100 = full capacity.
//
// 2026 moves applied:
//   · Glass dial face (backdrop-blur + chamfered border + noise)
//   · OLED-true-black depth — elevation by greyscale, not chrome
//   · Spectrum arc — luminance/chroma rise smoothly with value (no R/Y/G zones)
//   · Counter-arc input spikes — gauge visibly aggregates from 4 input causes
//   · Breathing motion at ~6 bpm (resting respiration)
//   · Tritium-tip needle, machined hub, jewel center
//   · Narrative crossfade reading in plain language
//   · Tabular monospace + Fraunces serif numeral

function CapacityGauge({ accent, accentHue, motion, paletteName }) {
  const ref = React.useRef(null);
  const dataRef = React.useRef({
    capacity: 0.62,
    target: 0.62,
    history: Array(160).fill(0.6),
    inputs: [0.55, 0.40, 0.62, 0.48], // calendar, inbox, deepWork, sleep
    inputTargets: [0.55, 0.40, 0.62, 0.48],
    lastNudge: 0,
    flash: 0,
  });

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, w, h, dpr;
    const isPaper = paletteName === 'Paper';
    const lineRGB = isPaper ? '20,18,12' : '255,255,255';
    const fillRGB = lineRGB;
    const speed = motion === 'bold' ? 1.6 : motion === 'off' ? 0 : 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    }
    requestAnimationFrame(resize);
    setTimeout(resize, 50);
    setTimeout(resize, 200);

    const lerp = (a, b, t) => a + (b - a) * t;

    // Reusable offscreen canvas for the conic-gradient arc fill
    const gCanvas = document.createElement('canvas');
    const gctx = gCanvas.getContext('2d');

    // 240° sweep, ∪ cup shape: v=0 at upper-LEFT, v=1 at upper-RIGHT,
    // deepest point at bottom-center. Sweeps CCW (decreasing angle) so
    // that visually we read left→right around the bottom of the cup.
    const SWEEP = Math.PI * (240 / 180);
    const A0 = Math.PI / 2 + SWEEP / 2;       // upper-left endpoint
    const valToAngle = (v) => A0 - v * SWEEP; // sweeps CCW across the bottom to upper-right

    // Red (0) → cyan (100). OKLCH ramp through neutral at midpoint.
    //   v=0    : red       hue 25,  high chroma
    //   v=0.5  : neutral-warm  hue 80,  mid chroma  (transitional)
    //   v=1    : cyan      hue 220, high chroma
    const arcColor = (v, alpha = 1) => {
      // Ease the hue so we don't sit too long in muddy yellows.
      const eased = v;
      const H = 25 + eased * 195;       // 25 → 220
      const L = 0.58 + Math.sin(eased * Math.PI) * 0.10 + eased * 0.18; // dip mid, rise to peak
      const C = 0.10 + Math.abs(eased - 0.5) * 0.16; // bright at extremes, calmer mid
      return `oklch(${L} ${C} ${H} / ${alpha})`;
    };

    const draw = (now) => {
      try {
      const d = dataRef.current;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.34;        // pivot in upper portion → arc dips down (∪ shape)
      const baseR = Math.min(w * 0.40, h * 0.48);
      // Breathing — 6 bpm = 10s cycle
      const breath = motion === 'off' ? 0 : Math.sin(now * 0.000628) * 0.006;
      const R = baseR * (1 + breath);
      const ARC_W = Math.max(10, R * 0.058);

      // Drift
      if (now - d.lastNudge > 3500) {
        d.target = 0.45 + Math.random() * 0.45;
        d.inputTargets = d.inputTargets.map(() => 0.25 + Math.random() * 0.65);
        d.lastNudge = now;
        d.flash = now;
      }
      d.capacity = lerp(d.capacity, d.target, 0.022 * speed);
      for (let i = 0; i < 4; i++) {
        d.inputs[i] = lerp(d.inputs[i], d.inputTargets[i], 0.02 * speed);
      }
      d.history.shift();
      d.history.push(d.capacity);

      const v = d.capacity;
      const ang = valToAngle(v);
      const flashT = Math.max(0, 1 - (now - d.flash) / 1000);

      ctx.lineCap = 'round';

      // ── 0. Glass dial face (under everything) ──────────────────────
      // Soft inner glow + ambient light disc on the dial face.
      const dialR = R - ARC_W * 1.4;
      const ambient = ctx.createRadialGradient(
        cx - dialR * 0.25, cy - dialR * 0.30, 0,
        cx, cy, dialR * 1.05
      );
      ambient.addColorStop(0, isPaper ? 'rgba(255,253,247,0.5)' : 'rgba(40,38,46,0.55)');
      ambient.addColorStop(0.55, isPaper ? 'rgba(245,242,236,0.2)' : 'rgba(18,17,22,0.4)');
      ambient.addColorStop(1, isPaper ? 'rgba(245,242,236,0)' : 'rgba(8,7,10,0)');
      ctx.fillStyle = ambient;
      ctx.beginPath();
      ctx.arc(cx, cy, dialR, 0, Math.PI * 2);
      ctx.fill();

      // Hairline grid inside the dial
      ctx.strokeStyle = `rgba(${lineRGB},0.05)`;
      ctx.lineWidth = 0.5;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, dialR * (i / 5), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Chamfered outer ring + faint outer glow
      ctx.beginPath();
      ctx.arc(cx, cy, R + ARC_W * 0.95, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${lineRGB},0.07)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, R + ARC_W * 0.95 + 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${lineRGB},0.025)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // ── 1. Counter-arc INPUT SPIKES (inside the cup, pointing inward) ─
      // 4 inputs evenly distributed across the sweep — each renders
      // as a small radial bar pointing INWARD from the arc, sitting
      // between the dial face and the readout.
      const SPIKE_BASE = R - ARC_W / 2 - 16;
      const SPIKE_MAX = 24;
      const spikePositions = [
        { v: d.inputs[0], at: 0.12, l: 'CAL' },
        { v: d.inputs[1], at: 0.36, l: 'INB' },
        { v: d.inputs[2], at: 0.62, l: 'DPW' },
        { v: d.inputs[3], at: 0.86, l: 'SLP' },
      ];
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const sp of spikePositions) {
        const a = valToAngle(sp.at);
        // track (full possible spike, faint)
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * SPIKE_BASE, cy + Math.sin(a) * SPIKE_BASE);
        ctx.lineTo(cx + Math.cos(a) * (SPIKE_BASE - SPIKE_MAX),
                   cy + Math.sin(a) * (SPIKE_BASE - SPIKE_MAX));
        ctx.strokeStyle = `rgba(${lineRGB},0.08)`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // active (proportional)
        const x0 = cx + Math.cos(a) * SPIKE_BASE;
        const y0 = cy + Math.sin(a) * SPIKE_BASE;
        const x1 = cx + Math.cos(a) * (SPIKE_BASE - sp.v * SPIKE_MAX);
        const y1 = cy + Math.sin(a) * (SPIKE_BASE - sp.v * SPIKE_MAX);
        ctx.beginPath();
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = arcColor(sp.v, 0.85);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // label OUTSIDE the arc edge (just outside SPIKE_BASE, between arc and tile)
        const lr = SPIKE_BASE + ARC_W + 6;
        const lx = cx + Math.cos(a) * lr;
        const ly = cy + Math.sin(a) * lr;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(a - Math.PI / 2);
        ctx.fillStyle = `rgba(${fillRGB},0.45)`;
        ctx.fillText(sp.l, 0, 0);
        ctx.restore();
      }

      // ── 2. Track ──────────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, R, A0 - SWEEP, A0, false); // full track band
      ctx.strokeStyle = `rgba(${lineRGB},0.07)`;
      ctx.lineWidth = ARC_W;
      ctx.stroke();

      // ── 3. Active fill — true gradient along arc via conic gradient + clip ─
      // Strategy: build a conic gradient centered on the dial, with color
      // stops mapped to the arc's angular sweep. Clip to a thick ring stroke
      // path so only the arc band fills with the gradient. This guarantees
      // visible per-pixel red→cyan ramping, regardless of segment count.
      // ── 3. Active fill — bulletproof red→cyan via offscreen mask ──
      // 1) Build a temp canvas with a CONIC gradient covering the full dial.
      // 2) On a SECOND temp canvas, stroke the active arc band as the mask.
      // 3) Composite gradient INTO mask via 'source-in', then blit.
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      if (v > 0) {
        const pad = ARC_W * 2;
        const TW = Math.ceil((R + pad) * 2);
        const TH = TW;
        const tcx = TW / 2;
        const tcy = TH / 2;

        // Reuse the cached offscreen canvas; resize only when needed.
        if (gCanvas.width !== TW || gCanvas.height !== TH) {
          gCanvas.width = TW; gCanvas.height = TH;
        } else {
          gctx.globalCompositeOperation = 'source-over';
          gctx.clearRect(0, 0, TW, TH);
        }
        // Conic gradient sweeps CW from startAngle. We want v=0 (red) at
        // A0 (upper-left) and v=1 (cyan) at A0-SWEEP (upper-right). Set
        // startAngle = A0-SWEEP (cyan side) and walk offsets 0→span
        // CW back to A0 (red side), so the colors run cyan→…→red.
        const cg = gctx.createConicGradient(A0 - SWEEP, tcx, tcy);
        const span = SWEEP / (Math.PI * 2);
        const N = 24;
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          // offset 0 at startAngle = cyan (v=1), offset span = red (v=0)
          cg.addColorStop(t * span, arcColor(1 - t, 1));
        }
        gctx.fillStyle = cg;
        gctx.fillRect(0, 0, TW, TH);

        // mask layer — stroke the active arc
        gctx.globalCompositeOperation = 'destination-in';
        gctx.lineCap = 'round';
        gctx.lineWidth = ARC_W;
        gctx.beginPath();
        gctx.arc(tcx, tcy, R, A0, A0 - SWEEP * v, true);
        gctx.strokeStyle = '#fff';
        gctx.stroke();
        gctx.globalCompositeOperation = 'source-over';

        ctx.drawImage(gCanvas, cx - tcx, cy - tcy);
      }

      // Bloom on leading tip — short arc going backward from current angle
      // toward slightly-lower-v. Under the new CCW geometry, "backward"
      // means INCREASING angle, so anticlockwise=false (CW) sweeps the
      // short way. (Wrong sign here paints the entire 240° band with one
      // color and kills the gradient — the source of three earlier bugs.)
      ctx.shadowBlur = 28 + flashT * 18;
      ctx.shadowColor = arcColor(v, 0.9);
      ctx.beginPath();
      ctx.arc(cx, cy, R, ang, valToAngle(Math.max(0, v - 0.018)), false);
      ctx.strokeStyle = arcColor(v, 1);
      ctx.lineWidth = ARC_W;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── 4. Tick marks ─────────────────────────────────────────────
      const TICK_INNER = R + ARC_W / 2 + 5;
      const TICK_MAJOR = R + ARC_W / 2 + 16;
      const TICK_MINOR = R + ARC_W / 2 + 10;
      ctx.font = '500 10.5px "JetBrains Mono", ui-monospace, monospace';
      for (let i = 0; i <= 100; i += 2) {
        const t = i / 100;
        const a = valToAngle(t);
        const isMajor = i % 10 === 0;
        const r1 = isMajor ? TICK_MAJOR : TICK_MINOR;
        const x0 = cx + Math.cos(a) * TICK_INNER;
        const y0 = cy + Math.sin(a) * TICK_INNER;
        const x1 = cx + Math.cos(a) * r1;
        const y1 = cy + Math.sin(a) * r1;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = isMajor
          ? `rgba(${lineRGB},0.55)`
          : `rgba(${lineRGB},0.18)`;
        ctx.lineWidth = isMajor ? 1.1 : 0.55;
        ctx.stroke();
        if (isMajor) {
          const lr = TICK_MAJOR + 14;
          const lx = cx + Math.cos(a) * lr;
          const ly = cy + Math.sin(a) * lr;
          ctx.fillStyle = `rgba(${fillRGB},0.55)`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i), lx, ly);
        }
      }

      // ── 5. EMPTY / FULL endpoint micro-labels ─────────────────────
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(${fillRGB},0.5)`;
      const endR = R - ARC_W * 0.9 - 14;
      const endL = valToAngle(0);
      const endRR = valToAngle(1);
      ctx.save();
      ctx.translate(cx + Math.cos(endL) * endR, cy + Math.sin(endL) * endR);
      ctx.rotate(endL + Math.PI / 2);
      ctx.fillText('EMPTY', 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(cx + Math.cos(endRR) * endR, cy + Math.sin(endRR) * endR);
      ctx.rotate(endRR - Math.PI / 2);
      ctx.fillText('FULL', 0, 0);
      ctx.restore();

      // ── 6. Needle ────────────────────────────────────────────────
      const NLEN = R + ARC_W / 2 - 4;
      const nx = cx + Math.cos(ang) * NLEN;
      const ny = cy + Math.sin(ang) * NLEN;
      const baseRad = R * 0.04;
      const baseAngL = ang + Math.PI / 2;
      const baseAngR = ang - Math.PI / 2;
      const blx = cx + Math.cos(baseAngL) * baseRad;
      const bly = cy + Math.sin(baseAngL) * baseRad;
      const brx = cx + Math.cos(baseAngR) * baseRad;
      const bry = cy + Math.sin(baseAngR) * baseRad;
      const tailX = cx + Math.cos(ang + Math.PI) * R * 0.10;
      const tailY = cy + Math.sin(ang + Math.PI) * R * 0.10;

      ctx.shadowBlur = 18;
      ctx.shadowColor = arcColor(v, 0.6);
      const needleGrad = ctx.createLinearGradient(cx, cy, nx, ny);
      needleGrad.addColorStop(0, isPaper ? '#22201a' : '#e9e3d3');
      needleGrad.addColorStop(0.7, isPaper ? '#16140e' : '#f6efde');
      needleGrad.addColorStop(1, arcColor(v, 1));
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(blx, bly);
      ctx.lineTo(tailX, tailY);
      ctx.lineTo(brx, bry);
      ctx.closePath();
      ctx.fillStyle = needleGrad;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Needle shaft highlight
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * baseRad * 0.8,
                 cy + Math.sin(ang) * baseRad * 0.8);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = `rgba(${lineRGB},0.55)`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Tritium tip
      ctx.shadowBlur = 14;
      ctx.shadowColor = arcColor(v, 0.85);
      ctx.beginPath();
      ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fillStyle = arcColor(Math.min(1, v + 0.1), 1);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Hub — machined metal
      const hubR = R * 0.085;
      const hubGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, hubR);
      hubGrad.addColorStop(0, isPaper ? '#3a352a' : '#3c3a36');
      hubGrad.addColorStop(0.6, isPaper ? '#1d1b15' : '#16151a');
      hubGrad.addColorStop(1, isPaper ? '#0a0907' : '#050507');
      ctx.beginPath(); ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${lineRGB},0.25)`;
      ctx.lineWidth = 0.75; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, hubR * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${lineRGB},0.18)`;
      ctx.lineWidth = 0.5; ctx.stroke();
      // jewel
      ctx.shadowBlur = 12;
      ctx.shadowColor = arcColor(v, 0.7);
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = arcColor(v, 1); ctx.fill();
      ctx.shadowBlur = 0;

      // ── 7. Centered numeric readout (inside the cup, below pivot) ─
      const pct = Math.round(v * 100);
      const headroom =
        v < 0.25 ? 'no headroom' :
        v < 0.50 ? 'tight'       :
        v < 0.75 ? 'comfortable' :
                   'wide open';

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(${fillRGB},0.5)`;
      ctx.fillText('CAPACITY', cx, cy + R * 0.30);

      ctx.font = '300 92px "Fraunces", "Instrument Serif", serif';
      ctx.fillStyle = isPaper ? '#16140e' : '#f0ece4';
      ctx.fillText(String(pct), cx, cy + R * 0.62);

      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = arcColor(v, 1);
      ctx.fillText('% · ' + headroom, cx, cy + R * 0.78);

      // ── 8. Mini sparkline inside the cup, below the readout ──────
      const sparkY = cy + R * 0.92;
      const sparkW = R * 0.85;
      const sparkX0 = cx - sparkW / 2;
      const sparkH = 16;
      ctx.strokeStyle = `rgba(${lineRGB},0.10)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sparkX0, sparkY); ctx.lineTo(sparkX0 + sparkW, sparkY);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < d.history.length; i++) {
        const x = sparkX0 + (i / (d.history.length - 1)) * sparkW;
        const y = sparkY - (d.history[i] - 0.5) * sparkH * 1.4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = arcColor(v, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
      const lastX = sparkX0 + sparkW;
      const lastY = sparkY - (d.history[d.history.length - 1] - 0.5) * sparkH * 1.4;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = arcColor(v, 1);
      ctx.fill();

      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(${fillRGB},0.4)`;
      ctx.textAlign = 'left';
      ctx.fillText('2H', sparkX0, sparkY + 14);
      ctx.textAlign = 'right';
      ctx.fillText('NOW', sparkX0 + sparkW, sparkY + 14);
      } catch (e) {
        console.error('gauge draw err:', e);
      } finally {
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
    };
  }, [accent, accentHue, motion, paletteName]);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// 2026 HUD: bento companion tiles + narrative crossfade
function GaugeHUD({ t }) {
  const { p, accent, fontMono, fontDisplay } = useTheme(t);
  const [tick, setTick] = React.useState(0);
  const [readingIdx, setReadingIdx] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const readings = [
    'you have room for one more thing.',
    'cognitive load trending downward.',
    'best window for deep work: now → 16:40.',
    'reschedule the 3pm — your gauge can\'t carry it.',
  ];
  React.useEffect(() => {
    const id = setInterval(() =>
      setReadingIdx((i) => (i + 1) % readings.length), 4200);
    return () => clearInterval(id);
  }, []);

  const ts = new Date(Date.now() + tick * 1000)
    .toISOString().slice(11, 19);

  // Bento tile shared style
  const tile = {
    position: 'absolute',
    background: 'rgba(255,255,255,0.025)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `0.5px solid ${p.line}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontFamily: fontMono,
    color: p.textDim,
    pointerEvents: 'none',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
      fontFamily: fontMono, color: p.text }}>

      {/* Top-left tile: instrument id + status */}
      <div style={{ ...tile, top: 14, left: 14, fontSize: 9.5, letterSpacing: '0.06em',
        display: 'flex', flexDirection: 'column', gap: 3, minWidth: 140 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>ORB-X1</span>
          <span style={{ color: accent, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent,
              boxShadow: `0 0 8px ${accent}` }} />
            LIVE
          </span>
        </div>
        <div style={{ color: p.textFaint }}>{ts} UTC</div>
        <div style={{ color: p.textFaint }}>480Hz · drift ±0.4σ</div>
      </div>

      {/* Top-right tile: input meta */}
      <div style={{ ...tile, top: 14, right: 14, fontSize: 9.5, letterSpacing: '0.06em',
        display: 'flex', flexDirection: 'column', gap: 3, minWidth: 130, textAlign: 'right' }}>
        <div style={{ color: p.textFaint }}>4 INPUTS</div>
        <div style={{ fontFamily: fontDisplay, fontStyle: 'italic', fontSize: 14,
          color: p.text, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          aggregating
        </div>
        <div style={{ color: p.textFaint, fontSize: 9 }}>cal · inb · dpw · slp</div>
      </div>

      {/* Bottom-left tile: narrative reading w/ crossfade */}
      <div style={{ ...tile, bottom: 14, left: 14, fontSize: 9.5, letterSpacing: '0.06em',
        display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 280 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ color: p.textFaint }}>READING</span>
          <span style={{ color: p.textFaint }}>{String(readingIdx + 1).padStart(2,'0')}/04</span>
        </div>
        <div key={readingIdx} style={{ color: p.text, fontFamily: fontDisplay,
          fontSize: 17, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1.2,
          animation: 'oc-fadeIn 0.6s ease-out' }}>
          {readings[readingIdx]}
        </div>
      </div>

      {/* Bottom-right tile: calibration */}
      <div style={{ ...tile, bottom: 14, right: 14, fontSize: 9.5, letterSpacing: '0.06em',
        textAlign: 'right' }}>
        <div style={{ color: p.textFaint }}>CALIBRATED</div>
        <div style={{ color: p.text, fontVariantNumeric: 'tabular-nums' }}>
          03:14 UTC
        </div>
      </div>

      <style>{`
        @keyframes oc-fadeIn {
          from { opacity: 0; transform: translateY(4px); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0);  filter: blur(0); }
        }
      `}</style>
    </div>
  );
}


export { CapacityGauge as CapacityGaugeDemo, GaugeHUD as GaugeHUDDemo };
