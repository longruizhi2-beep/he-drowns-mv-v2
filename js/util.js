// Small math / random / noise toolkit shared by every module.
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
export const fract = (x) => x - Math.floor(x);
export const TAU = Math.PI * 2;

export const ease = {
  in2: (t) => t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  inout2: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  out3: (t) => 1 - (1 - t) ** 3,
  in3: (t) => t * t * t,
  inout3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out5: (t) => 1 - (1 - t) ** 5,
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  outBack: (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
};

// deterministic hash -> [0,1)
export function hash(...n) {
  let h = 2166136261 >>> 0;
  for (const v of n) {
    let x = Math.floor(v * 1000003) | 0;
    h ^= x; h = Math.imul(h, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}
// seeded PRNG
export function rng(seed) {
  let a = Math.floor(seed * 7919 + 1013904223) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

// 1D value noise, smooth
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i, seed), b = hash(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
export function fbm1(x, seed = 0, oct = 3) {
  let s = 0, amp = 0.5, fr = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += amp * noise1(x * fr, seed + i * 17); n += amp; amp *= 0.5; fr *= 2; }
  return s / n;
}
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

// colours
export function hex(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// pulse helpers
export const decay = (dt, tau) => (dt < 0 ? 0 : Math.exp(-dt / tau));
export const tri = (x) => 1 - Math.abs(fract(x) * 2 - 1);
