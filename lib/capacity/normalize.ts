import type { SignalDaily } from './types';

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

const mad = (xs: number[], med: number): number =>
  median(xs.map((x) => Math.abs(x - med)));

/** 30-day rolling median + MAD normalization. Imputes 0 z-score for missing days. */
export function normalize(values: Array<number | null>, windowDays = 30): SignalDaily[] {
  const today = new Date();
  const raw: SignalDaily[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const v = values[i];
    raw.push({ day, key: '_', zValue: v, imputed: v == null });
  }
  const present = raw.filter((o) => !o.imputed && o.zValue != null).map((o) => o.zValue as number);
  const m = median(present);
  const a = mad(present, m) || 1;
  return raw.map((o) => ({
    ...o,
    zValue: o.imputed ? 0 : ((o.zValue as number) - m) / (1.4826 * a),
  }));
}
