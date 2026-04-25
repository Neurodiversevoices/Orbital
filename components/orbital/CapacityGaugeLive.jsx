// CapacityGaugeLive — same visual contract as Demo; driven by external CapacityReading data.
// Used by: web app + iOS Today screen. Fed by lib/capacity/calculateCapacity output.
//
// Props:
//   data:            CapacityReading | null  — live engine output
//   inputBreakdown:  { calendar, inbox, deepWork, sleep } 0..1
//   accent, accentHue, motion, paletteName  — same visual props as Demo
//
// When data is null, gauge sits still at 0.5 (loading state, no fake values shown as real).
import React from 'react';

export function CapacityGaugeLive({ data, inputBreakdown, accent, accentHue, motion, paletteName }) {
  const ref = React.useRef(null);
  const dataRef = React.useRef({
    capacity: 0.5, target: 0.5,
    inputs: [0.5, 0.5, 0.5, 0.5], inputTargets: [0.5, 0.5, 0.5, 0.5],
    history: Array(160).fill(0.5),
    flash: 0,
  });

  React.useEffect(() => {
    if (data && typeof data.capacityScore === 'number') {
      dataRef.current.target = Math.max(0, Math.min(1, data.capacityScore / 100));
      dataRef.current.flash = performance.now();
    }
    if (inputBreakdown) {
      dataRef.current.inputTargets = [
        inputBreakdown.calendar ?? 0.5,
        inputBreakdown.inbox ?? 0.5,
        inputBreakdown.deepWork ?? 0.5,
        inputBreakdown.sleep ?? 0.5,
      ];
    }
  }, [data, inputBreakdown]);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, w, h, dpr;
    const isPaper = paletteName === 'Paper';
    const lineRGB = isPaper ? '20,18,12' : '255,255,255';
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
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    const lerp = (a, b, t) => a + (b - a) * t;
    const SWEEP = Math.PI * (240 / 180);
    const A0 = Math.PI / 2 + SWEEP / 2;
    const valToAngle = v => A0 - v * SWEEP;

    const arcColor = (v, alpha = 1) => {
      const H = 25 + v * 195;
      const L = 0.58 + Math.sin(v * Math.PI) * 0.10 + v * 0.18;
      const C = 0.10 + Math.abs(v - 0.5) * 0.16;
      return `oklch(${L} ${C} ${H} / ${alpha})`;
    };

    const draw = (now) => {
      try {
        const d = dataRef.current;
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h * 0.34;
        const baseR = Math.min(w * 0.40, h * 0.48);
        // Skip drawing until the container has real dimensions
        if (baseR < 10) { raf = requestAnimationFrame(draw); return; }
        const breath = motion === 'off' ? 0 : Math.sin(now * 0.000628) * 0.006;
        const R = baseR * (1 + breath);
        const ARC_W = Math.max(10, R * 0.058);

        d.capacity = lerp(d.capacity, d.target, 0.022 * speed);
        for (let i = 0; i < 4; i++) d.inputs[i] = lerp(d.inputs[i], d.inputTargets[i], 0.02 * speed);
        d.history.shift();
        d.history.push(d.capacity);

        const v = d.capacity;
        const ang = valToAngle(v);

        ctx.lineCap = 'round';

        // Dial face
        const dialR = Math.max(1, R - ARC_W * 1.4);
        const ambient = ctx.createRadialGradient(cx - dialR * 0.25, cy - dialR * 0.30, 0, cx, cy, dialR * 1.05);
        ambient.addColorStop(0, isPaper ? 'rgba(255,253,247,0.5)' : 'rgba(40,38,46,0.55)');
        ambient.addColorStop(0.55, isPaper ? 'rgba(245,242,236,0.2)' : 'rgba(18,17,22,0.4)');
        ambient.addColorStop(1, isPaper ? 'rgba(245,242,236,0)' : 'rgba(8,7,10,0)');
        ctx.fillStyle = ambient;
        ctx.beginPath(); ctx.arc(cx, cy, dialR, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = `rgba(${lineRGB},0.05)`;
        ctx.lineWidth = 0.5;
        for (let i = 1; i <= 4; i++) {
          ctx.beginPath(); ctx.arc(cx, cy, dialR * (i / 5), 0, Math.PI * 2); ctx.stroke();
        }

        // Arc track
        ctx.beginPath(); ctx.arc(cx, cy, R, A0, A0 - SWEEP, true);
        ctx.strokeStyle = `rgba(${lineRGB},0.1)`; ctx.lineWidth = ARC_W; ctx.stroke();

        // Filled value arc
        ctx.beginPath(); ctx.arc(cx, cy, R, A0, ang, true);
        ctx.strokeStyle = arcColor(v, 0.95); ctx.lineWidth = ARC_W; ctx.stroke();

        // Needle
        const nx = cx + Math.cos(ang) * (R - ARC_W * 0.5);
        const ny = cy + Math.sin(ang) * (R - ARC_W * 0.5);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = accent || arcColor(v, 1); ctx.lineWidth = 2; ctx.stroke();

        // Hub
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = isPaper ? '#1a1916' : '#0a0a0e'; ctx.fill();
        ctx.strokeStyle = accent || '#888'; ctx.lineWidth = 1.5; ctx.stroke();

        // Score text
        ctx.fillStyle = `rgba(${lineRGB},0.95)`;
        ctx.font = '600 36px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.round(v * 100)), cx, cy + 6);
        ctx.fillStyle = `rgba(${lineRGB},0.55)`;
        ctx.font = '500 9px -apple-system, monospace';
        ctx.fillText((data?.state || 'CALIBRATING').toUpperCase(), cx, cy + 24);
      } catch (e) {
        console.error('CapacityGaugeLive draw err:', e);
      } finally {
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, [accent, accentHue, motion, paletteName]);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
