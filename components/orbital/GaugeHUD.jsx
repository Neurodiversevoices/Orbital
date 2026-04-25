// GaugeHUD — four bento tiles around the gauge.
// Used: web app Today screen only. NOT used on iOS portrait (414px too narrow).
import React from 'react';

export function GaugeHUD({ data, accent }) {
  const [readingIdx, setReadingIdx] = React.useState(0);
  const [ts, setTs] = React.useState(new Date().toISOString().slice(11, 19));

  const readings = data?.factorWeights?.length
    ? data.factorWeights.slice(0, 4).map(w => `${w.delta < 0 ? 'down' : 'up'} on ${w.name}`)
    : ['calibrating', 'reading inputs', 'aggregating', 'composing'];

  React.useEffect(() => {
    const id = setInterval(() => {
      setReadingIdx(x => (x + 1) % readings.length);
      setTs(new Date().toISOString().slice(11, 19));
    }, 4500);
    return () => clearInterval(id);
  }, [readings.length]);

  const tile = {
    position: 'absolute',
    background: 'rgba(255,255,255,0.025)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '10px 12px',
    fontFamily: 'ui-monospace, monospace',
    color: 'rgba(255,255,255,0.55)',
    pointerEvents: 'none',
  };

  const liveAccent = accent || '#F2B134';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ ...tile, top: 14, left: 14, fontSize: 9.5, letterSpacing: '0.06em', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 140 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>ORB-X1</span>
          <span style={{ color: liveAccent, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: liveAccent, boxShadow: `0 0 8px ${liveAccent}` }} />
            LIVE
          </span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)' }}>{ts} UTC</div>
        <div style={{ color: 'rgba(255,255,255,0.4)' }}>conf {data?.confidence ? Math.round(data.confidence * 100) + '%' : '—'}</div>
      </div>

      <div style={{ ...tile, top: 14, right: 14, fontSize: 9.5, letterSpacing: '0.06em', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 130, textAlign: 'right' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)' }}>4 INPUTS</div>
        <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>aggregating</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>cal · inb · dpw · slp</div>
      </div>

      <div style={{ ...tile, bottom: 14, left: 14, fontSize: 9.5, letterSpacing: '0.06em', display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 280 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>READING</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{String(readingIdx + 1).padStart(2, '0')}/{String(readings.length).padStart(2, '0')}</span>
        </div>
        <div key={readingIdx} style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'serif', fontSize: 17, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {readings[readingIdx]}
        </div>
      </div>

      <div style={{ ...tile, bottom: 14, right: 14, fontSize: 9.5, letterSpacing: '0.06em', textAlign: 'right' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)' }}>CALIBRATED</div>
        <div style={{ color: 'rgba(255,255,255,0.95)', fontVariantNumeric: 'tabular-nums' }}>{ts} UTC</div>
      </div>

      <style>{`
        @keyframes oc-fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
