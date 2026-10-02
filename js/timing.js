// Access to the analysis (data/analysis.js): the 91 BPM 16th grid, the variable-meter bar map,
// per-16th drum strengths and 100 Hz envelopes. Everything is a pure function of song time.
import { decay } from './util.js';

const A = window.ANALYSIS;
export const P16 = A.sixteenth;
export const T0 = A.t0;
export const BPM = A.bpm;
export const DUR = A.duration;
export const BARS = A.bars;
export const SECTIONS = A.sections;
export const K16 = A.k16;
export const N16 = A.n16;

for (const b of BARS) {
  b.end = b.t + b.len * P16;
  b.gstart = [];
  let s = 0;
  for (const g of b.groups) { b.gstart.push(s); s += g; }
}

const ENV = {};
for (const key of ['loud', 'low', 'mid', 'high', 'onset', 'bright']) {
  const bin = atob(A.env[key]);
  const arr = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i) / 255;
  ENV[key] = arr;
}
const RATE = A.env.rate;

export function env(key, t) {
  const a = ENV[key];
  const x = t * RATE;
  const i = Math.floor(x);
  if (i < 0) return a[0];
  if (i >= a.length - 1) return a[a.length - 1];
  const f = x - i;
  return a[i] * (1 - f) + a[i + 1] * f;
}
// smoothed envelope (box average over +-w seconds)
export function envAvg(key, t, w = 0.25) {
  let s = 0, n = 0;
  for (let d = -w; d <= w + 1e-9; d += 0.02) { s += env(key, t + d); n++; }
  return s / n;
}

export const k16 = (t) => (t - T0) / P16;
export const t16 = (k) => T0 + k * P16;

export function barIndex(t) {
  let lo = 0, hi = BARS.length - 1;
  if (t < BARS[0].t) return -1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (BARS[m].t <= t) lo = m; else hi = m - 1;
  }
  return lo;
}
export const bar = (i) => BARS[Math.max(0, Math.min(BARS.length - 1, i))];

// full musical position at time t
export function pos(t) {
  const bi = barIndex(t);
  if (bi < 0) {
    // pre-roll before the first bar: pretend a 4/4 bar ending at bar 0
    const b0 = BARS[0];
    const q = (t - (b0.t - 16 * P16)) / P16;
    return { bi: -1, b: null, q, p: q / 16, gi: 0, gq: q, gp: q / 16, glen: 16, meter: '4/4', sec: 'pre', k: k16(t) };
  }
  const b = BARS[bi];
  const q = (t - b.t) / P16;
  let gi = 0;
  for (let i = 0; i < b.gstart.length; i++) if (q >= b.gstart[i]) gi = i;
  const gq = q - b.gstart[gi];
  const glen = b.groups[gi];
  return { bi, b, q, p: q / b.len, gi, gq, gp: gq / glen, glen, meter: b.meter, sec: b.sec, k: k16(t) };
}

// decaying hit envelope for kick / snare / hat / acc (strength 0..1 per 16th)
export function hit(key, t, tau = 0.12, look = 10) {
  const arr = K16[key];
  const kk = Math.floor(k16(t) + 0.02);
  let v = 0;
  for (let j = kk; j > kk - look && j >= 0; j--) {
    const s = arr[j];
    if (!s) continue;
    v = Math.max(v, s * decay(t - t16(j), tau));
  }
  return v;
}
export const strength = (key, k) => (k >= 0 && k < N16 ? K16[key][k] : 0);

// most recent 16th (<= t) whose strength >= thr; returns its grid time or -1
export function lastHit(key, t, thr, look = 64) {
  const arr = K16[key];
  const kk = Math.floor(k16(t) + 0.02);
  for (let j = kk; j > kk - look && j >= 0; j--) if (arr[j] >= thr) return t16(j);
  return -1;
}
// count of strong hits between two times (for "cut on every accent" montages)
export function hitIndex(key, t, thr, from) {
  const arr = K16[key];
  const a = Math.ceil(k16(from) - 0.02), b = Math.floor(k16(t) + 0.02);
  let n = 0;
  for (let j = a; j <= b; j++) if (arr[j] >= thr) n++;
  return n;
}

export function section(name) { return SECTIONS.find((s) => s.name === name); }
export function barsOf(name) { return BARS.filter((b) => b.sec === name); }
