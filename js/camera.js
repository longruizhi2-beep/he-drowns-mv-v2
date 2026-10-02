// Camera rig + sea looks for the 3D scenes. Everything is a pure function of song time.
import { clamp, lerp, ease, noise1, hash } from './util.js';
import { basis } from './sea.js';

export const cam = (pos, yaw = 0, pitch = 0, roll = 0, fov = 60) => ({ pos: [...pos], yaw, pitch, roll, fov });
export const clone = (c) => ({ pos: [...c.pos], yaw: c.yaw, pitch: c.pitch, roll: c.roll, fov: c.fov });
export function mixCam(a, b, u) {
  return {
    pos: a.pos.map((v, i) => lerp(v, b.pos[i], u)),
    yaw: lerp(a.yaw, b.yaw, u), pitch: lerp(a.pitch, b.pitch, u), roll: lerp(a.roll, b.roll, u), fov: lerp(a.fov, b.fov, u),
  };
}
// keyframes: [[time, cam, easing?], ...] — easing applies to the segment that starts at that key
export function keyed(t, keys) {
  if (t <= keys[0][0]) return clone(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a, e] = keys[i], [tb, b] = keys[i + 1];
    if (t < tb) return mixCam(a, b, (e || ease.inout3)(clamp((t - ta) / (tb - ta))));
  }
  return clone(keys[keys.length - 1][1]);
}
export function lookAt(c, target) {
  const dx = target[0] - c.pos[0], dy = target[1] - c.pos[1], dz = target[2] - c.pos[2];
  c.yaw = Math.atan2(dx, -dz);
  c.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return c;
}
// screen position (1920x1080 px, y down) of a world point (or a direction, isDir) seen by camera c; null if behind
export function project(c, p, isDir = false) {
  const [F, R, U] = basis(c);
  const d = isDir ? p : [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]];
  const z = d[0] * F[0] + d[1] * F[1] + d[2] * F[2];
  if (z <= 1e-4) return null;
  const tf = Math.tan((c.fov * Math.PI) / 360);
  const x = (d[0] * R[0] + d[1] * R[1] + d[2] * R[2]) / (z * tf), y = (d[0] * U[0] + d[1] * U[1] + d[2] * U[2]) / (z * tf);
  return [960 + x * 540, 540 - y * 540, z];
}
// slow drift of a hand-held camera
export function handheld(c, t, amp = 1, seed = 0) {
  const n = (k, f) => noise1(t * f, seed * 13 + k) - 0.5;
  c.yaw += n(1, 0.33) * 0.034 * amp;
  c.pitch += n(2, 0.41) * 0.026 * amp;
  c.roll += n(3, 0.29) * 0.032 * amp;
  c.pos[0] += n(4, 0.23) * 0.25 * amp;
  c.pos[1] += n(5, 0.37) * 0.12 * amp;
  return c;
}
// the guitar wall: continuous high-frequency shake proportional to loudness, plus kick / snare jolts
export function rumble(c, X, amt, t, seed = 0) {
  const L = Math.pow(X.loud, 1.4) * amt;
  const f = (k, fr) => (noise1(t * fr, seed * 7 + k) - 0.5) * 2;
  c.yaw += f(1, 16) * 0.011 * L + f(2, 5) * 0.012 * L;
  c.pitch += f(3, 18) * 0.009 * L - X.kickF * 0.022 * amt;
  c.roll += f(4, 12) * 0.02 * L + X.snareF * 0.035 * amt * (hash(Math.floor(t * 3.3), seed) > 0.5 ? 1 : -1);
  c.pos[1] += f(5, 8) * 0.1 * L;
  c.pos[0] += f(6, 7) * 0.08 * L;
  c.fov += X.kickF * 2.5 * amt;
  return c;
}
// float on the sea: height from the same height field the GPU renders, tilt from its slope
export function ride(c, seaH, lift = 0.6, tilt = 1) {
  const x = c.pos[0], z = c.pos[2], e = 0.9;
  const h = seaH(x, z);
  const hx = seaH(x + e, z) - seaH(x - e, z), hz = seaH(x, z + e) - seaH(x, z - e);
  c.pos[1] = h + lift;
  c.roll += Math.atan2(hx, 2 * e) * 0.6 * tilt;
  c.pitch += Math.atan2(-hz, 2 * e) * 0.35 * tilt;
  return h;
}
// a card floating on the surface: centre on the waves, tilted with them
export function floatCard(seaH, x, z, w, h, yawA = 0, lift = 0.06) {
  const e = 0.6;
  const y = seaH(x, z) + lift;
  const sx = (seaH(x + e, z) - seaH(x - e, z)) / (2 * e), sz = (seaH(x, z + e) - seaH(x, z - e)) / (2 * e);
  const ca = Math.cos(yawA), sa = Math.sin(yawA);
  // width along (ca, sa), image-up along (sa, -ca) (away from a camera looking down -z); both follow the slope
  const u = [ca * w, (sx * ca + sz * sa) * w, sa * w];
  const v = [sa * h, (sx * sa - sz * ca) * h, -ca * h];
  return { c: [x, y, z], u, v };
}

// ------------------------------------------------------------------ sea looks
export const LOOK = {
  calm: { wave: [0.22, 4.0, 0.16, 0.25], sky: [0.9, 0.3, 0.003, 1.0], moon: [0.045, 0.55, 1.35, 0], moonCol: '#ffe7d6' },
  night: { wave: [0.5, 4.0, 0.16, 0.5], sky: [0.7, 0.55, 0.004, 1.0] },
  swell: { wave: [0.85, 3.6, 0.14, 0.8], sky: [0.3, 0.8, 0.005, 1.0] },
  storm: { wave: [1.55, 3.0, 0.12, 1.0], sky: [0.0, 0.96, 0.007, 1.05], moon: [0.05, 0.22, 0.7, 0], moonCol: '#ffd9c4' },
  red: { moonCol: '#ff4a2e', moon: [0.075, 1.0, 1.75, 1] },
  warm: { waterScat: '#b4502f', lightCol: '#ffb38a', waterDeep: '#1c0703' },
  deep: { under: [0.07, 0.6, 0.9, 0.06], waterScat: '#1f6470' },
  abyss: { under: [0.11, 0.25, 0.5, 0.14], waterScat: '#123c45', waterDeep: '#000304' },
};
const isArr = Array.isArray;
export function look(S, ...names) {
  for (const n of names) {
    const L = LOOK[n];
    for (const k in L) S[k] = isArr(L[k]) ? [...L[k]] : L[k];
  }
  return S;
}
// blend numeric arrays of two looks (colours stay those of b)
export function lookMix(S, a, b, u) {
  look(S, a);
  const B = LOOK[b];
  for (const k in B) {
    if (isArr(B[k]) && isArr(S[k])) S[k] = S[k].map((v, i) => lerp(v, B[k][i], u));
    else if (u > 0.5) S[k] = B[k];
  }
  return S;
}
