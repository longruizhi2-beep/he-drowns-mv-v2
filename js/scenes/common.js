// Shared helpers for all scenes: per-frame sync values, beat reactions, lyric typesetting, editorial furniture.
import { clamp, lerp, ease, hash, smooth } from '../util.js';
import { pos, hit, env, BARS, P16, DUR, k16, t16 } from '../timing.js';
import { IMG, img, photo, vtext, vruby, text, ink, K, A, B, FONT, JPFALL, line, meterGlyph, rect } from '../draw.js';
import { revealCount } from '../lyrics.js';
import { cam, clone, keyed, mixCam, lookAt, project, handheld, rumble, ride, floatCard, look, lookMix } from '../camera.js';
export { cam, clone, keyed, mixCam, lookAt, project, handheld, rumble, ride, floatCard, look, lookMix };

// turn on the 3D sea behind / instead of the page. raw = cinematic (no screen), otherwise printed like a photograph
export function seaOn(C, looks = [], o = {}) {
  const { S, F } = C;
  S.on = true;
  look(S, 'night', ...looks);
  F.backMode = o.printed ? 2 : 1;
  if (o.printed) { S.sky[3] = 1.6; F.tone = [1.15, 0.62, 0.0, 0.78]; } // a night render prints as solid ink: lift it
  if (o.light !== false) F.inkLight = 1;
  if (!o.printed) { F.grainAmt = o.grain ?? 0.055; F.vig = o.vig ?? 0.42; }
  return S;
}
// world point on the water plane under a screen point, for a camera looking straight down (yaw 0)
export function screenToWater(c, px, py, W = 1920, H = 1080) {
  const tf = Math.tan((c.fov * Math.PI) / 360);
  const qx = (px / W * 2 - 1) * (W / H), qy = 1 - (py / H) * 2;
  const hgt = c.pos[1];
  return [c.pos[0] + hgt * tf * qx, c.pos[2] - hgt * tf * qy];
}

export const W = 1920, H = 1080;

export function sync(t) {
  const p = pos(t);
  return {
    t, p,
    kick: hit('kick', t, 0.13), snare: hit('snare', t, 0.11), hat: hit('hat', t, 0.07), acc: hit('acc', t, 0.1),
    kickF: hit('kick', t, 0.06), snareF: hit('snare', t, 0.05),
    loud: env('loud', t), low: env('low', t), high: env('high', t), bright: env('bright', t), onset: env('onset', t),
  };
}
export const barT = (i) => BARS[Math.max(0, Math.min(BARS.length - 1, i))].t;
export const barEnd = (i) => BARS[Math.max(0, Math.min(BARS.length - 1, i))].end;
// time of 16th q (can be fractional) inside bar i
export const at = (i, q = 0) => barT(i) + q * P16;

// default musical reactions: kick = zoom punch, snare = plate misregistration, hats = grain sparkle
export function react(F, X, amt = 1) {
  const z = 1 + 0.014 * X.kick * amt;
  F.xf = [F.xf[0] * z, F.xf[1], F.xf[2], F.xf[3]];
  const m = X.snare * amt;
  F.offA = [F.offA[0] + m * 5, F.offA[1] - m * 2.5];
  F.offB = [F.offB[0] - m * 3.5, F.offB[1] + m * 2];
  F.offK = [F.offK[0] + m * 0.8, F.offK[1]];
  F.grainAmt += X.hat * 0.035 * amt;
}
export function shake(F, X, amt, seed = 0) {
  const s = amt * (X.snareF + X.kickF * 0.6);
  F.xf = [F.xf[0], F.xf[1] + (hash(Math.floor(X.t * 30), seed) - 0.5) * 0.01 * s, F.xf[2] + (hash(Math.floor(X.t * 30), seed, 1) - 0.5) * 0.012 * s, F.xf[3] + (hash(Math.floor(X.t * 30), seed, 2) - 0.5) * 0.012 * s];
}
export function flash(F, t, tEv, dur = 0.12, col = [1, 1, 1], amt = 1) {
  const d = t - tEv;
  if (d < 0 || d > dur) return;
  const a = amt * (1 - d / dur) ** 2;
  if (a > F.flash[3]) F.flash = [col[0], col[1], col[2], a];
}

// place an image so that its horizon (normalised y in the image) sits on screen line sy, covering the frame
export function horizon(ctx, name, hy, sy, o = {}) {
  const im = img(name);
  const iw = im.naturalWidth, ih = im.naturalHeight;
  const zoom = o.zoom ?? 1;
  let s = Math.max(W / iw, H / ih) * zoom;
  // make sure the frame stays covered with the horizon pinned
  s = Math.max(s, sy / (hy * ih), (H - sy) / ((1 - hy) * ih));
  const dw = iw * s, dh = ih * s;
  const x = (W - dw) / 2 + (o.dx ?? 0) * dw;
  const y = sy - hy * dh;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  if (o.flipY) { ctx.translate(0, sy * 2); ctx.scale(1, -1); }
  ctx.drawImage(im, x, y, dw, dh);
  ctx.restore();
}
export const GRAY = 'grayscale(1)';
export const GRAYC = (c = 1.15, b = 1) => `grayscale(1) contrast(${c}) brightness(${b})`;

// ------------------------------------------------------------------ lyric typesetting
// vertical lyric: x = column centre, y = top. Draws ruby for kanji runs. Returns height.
export function lyricV(I, L, t, x, y, size, o = {}) {
  const n = o.reveal ?? revealCount(L, t);
  const gap = o.gap ?? 0.06;
  const step = size * (1 + gap);
  const col = o.color || ink(K);
  let cy = y;
  let idx = 0;
  I.save();
  if (o.alpha !== undefined) I.globalAlpha *= o.alpha;
  for (const ch of L.chars) {
    const vis = clamp(n - idx);
    const isP = '、。'.includes(ch.c);
    if (vis > 0) {
      const pop = o.pop === false ? 1 : 1 + (1 - ease.out3(vis)) * 0.35;
      vtext(I, ch.c, x + (o.jx ? (hash(idx, o.seed || 0) - 0.5) * o.jx : 0), cy, size, {
        color: col, weight: o.weight ?? 800, fam: o.fam, gap, reveal: 1,
        charScale: () => pop,
      });
      if (ch.read && o.ruby !== false && vis >= 1) vruby(I, ch.read, x, cy, ch.runLen, size, { color: o.rubyColor || col, gap });
    }
    cy += isP ? step * 0.55 : step;
    idx++;
  }
  I.restore();
  return cy - y;
}
export function lyricHeight(L, size, gap = 0.06) {
  let h = 0;
  for (const ch of L.chars) h += '、。'.includes(ch.c) ? size * (1 + gap) * 0.55 : size * (1 + gap);
  return h;
}
// horizontal lyric with ruby above; x = left, y = baseline
export function lyricH(I, L, t, x, y, size, o = {}) {
  const n = o.reveal ?? revealCount(L, t);
  I.save();
  I.font = `${o.weight ?? 800} ${size}px ${o.fam || FONT.min}${JPFALL}`;
  I.textBaseline = 'alphabetic';
  I.textAlign = 'left';
  if (o.alpha !== undefined) I.globalAlpha *= o.alpha;
  let cx = x, idx = 0;
  const track = (o.track ?? 0.02) * size;
  for (const ch of L.chars) {
    const w = I.measureText(ch.c).width;
    const vis = clamp(n - idx);
    if (vis > 0) {
      I.save();
      I.globalAlpha *= vis;
      const pop = 1 + (1 - ease.out3(vis)) * 0.3;
      I.translate(cx + w / 2, y - size * 0.35);
      I.scale(pop, pop);
      I.fillStyle = o.color || ink(K);
      I.fillText(ch.c, -w / 2, size * 0.35);
      I.restore();
      if (ch.read && o.ruby !== false && vis >= 1) {
        const rs = size * 0.34;
        I.save();
        I.font = `500 ${rs}px ${FONT.min}${JPFALL}`;
        I.fillStyle = o.rubyColor || o.color || ink(K);
        I.textAlign = 'center';
        const runW = w * ch.runLen + track * (ch.runLen - 1);
        I.fillText(ch.read, cx + runW / 2, y - size * 0.98);
        I.restore();
      }
    }
    cx += w + track;
    idx++;
  }
  I.restore();
  return cx - x;
}

// ------------------------------------------------------------------ editorial furniture
export function folio(I, X, o = {}) {
  const n = X.p.bi + 1;
  const col = o.color || ink(K);
  const y = o.y ?? 1040;
  const left = o.side !== 'right';
  const fx = left ? 60 : W - 60;
  text(I, String(n).padStart(3, '0'), fx, y, { font: `500 15px ${FONT.mono}`, color: col, align: left ? 'left' : 'right' });
  if (o.head) text(I, o.head, left ? fx + 52 : fx - 52, y, { font: `400 13px ${FONT.mono}`, color: col, align: left ? 'left' : 'right', tracking: 1.5 });
}
export function meterTag(I, X, x, y, o = {}) {
  const col = o.color || ink(K);
  const m = X.p.meter;
  text(I, '♩=91', x, y, { font: `500 15px ${FONT.mono}`, color: col });
  if (m && m !== 'free') meterGlyph(I, m, x + 76, y - 6, o.size ?? 26, col);
}
// rhythm ruler: 16th ticks of the current + next bars, accents lit, playhead
export function ruler(I, X, x, y, w, o = {}) {
  const col = o.color || ink(K);
  const span = o.span ?? 32;           // 16ths shown
  const k = X.p.k;
  const k0 = Math.floor(k) - (o.lead ?? 8);
  I.save();
  I.fillStyle = col; I.strokeStyle = col;
  for (let j = k0; j < k0 + span; j++) {
    const xx = x + ((j - k0) / span) * w;
    const bi = BARS.findIndex((b) => b.k === j);
    const isBar = bi >= 0;
    const h = isBar ? 22 : j % 2 === 0 ? 9 : 5;
    I.globalAlpha = j <= k ? 1 : 0.4;
    I.fillRect(Math.round(xx), y - h, isBar ? 2 : 1, h);
    if (isBar) {
      I.font = `500 11px ${FONT.mono}`;
      I.fillText(BARS[bi].meter, xx + 4, y - 12);
    }
  }
  I.globalAlpha = 1;
  const px = x + ((k - k0) / span) * w;
  I.fillRect(px - 1, y + 4, 3, 6);
  I.restore();
}
export function caption(I, lines, x, y, o = {}) {
  const size = o.size ?? 14;
  const lh = size * (o.lh ?? 1.45);
  const col = o.color || ink(K);
  lines.forEach((s, i) => text(I, s, x, y + i * lh, { font: o.font || `400 ${size}px ${FONT.mono}`, color: col, align: o.align, alpha: o.alpha }));
}
export function enCaption(I, L, x, y, o = {}) {
  if (!L) return;
  text(I, L.en, x, y, { font: `italic 400 ${o.size ?? 26}px ${FONT.serif}`, color: o.color || ink(K), align: o.align || 'left', alpha: o.alpha });
}
// a vertical measuring gauge (wave height / altitude): value v0 at y0 .. v1 at y1, a red column up to the value
export function gauge(I, x, y0, y1, v0, v1, value, o = {}) {
  const col = o.color || ink(K), colA = o.accent || ink(A);
  const step = o.step ?? 1, every = Math.round((o.lab ?? 2) / step);
  const n = Math.round((v1 - v0) / step);
  line(I, x, y0, x, y1, 1.5, col);
  for (let i = 0; i <= n; i++) {
    const v = v0 + i * step, y = lerp(y0, y1, i / n);
    const major = i % every === 0;
    line(I, x - (major ? 22 : 10), y, x, y, major ? 2 : 1, col);
    if (major) text(I, o.fmt ? o.fmt(v) : String(v), x - 30, y + 5, { font: `500 14px ${FONT.mono}`, color: col, align: 'right' });
  }
  const vy = lerp(y0, y1, clamp((value - v0) / (v1 - v0)));
  rect(I, x - 3, Math.min(vy, y0), 6, Math.abs(y0 - vy), colA);
  I.save(); I.fillStyle = colA; I.beginPath(); I.moveTo(x + 6, vy); I.lineTo(x + 24, vy - 10); I.lineTo(x + 24, vy + 10); I.closePath(); I.fill(); I.restore();
  if (o.label) text(I, o.label, x + 24, y1 - 26, { font: `500 13px ${FONT.mono}`, color: col, align: 'right' });
  if (o.readout) text(I, o.readout, x - 34, vy - 16, { font: `500 20px ${FONT.mono}`, color: colA, align: 'right' });
}
// a depth ruler scrolling past a fixed red index (metres below the surface)
export function depthRuler(I, depth, x, o = {}) {
  const col = o.color || ink(K), colA = o.accent || ink(A), px = o.px ?? 42, cy = o.y ?? H / 2;
  for (let m = Math.floor(depth) - 14; m < depth + 14; m++) {
    const yy = cy + (m - depth) * px;
    if (yy < 40 || yy > H - 40) continue;
    const major = m % 5 === 0;
    line(I, x - (major ? 40 : 18), yy, x, yy, major ? 2 : 1, col);
    if (major) text(I, m <= 0 ? `+${-m}` : `−${m}`, x - 50, yy + 5, { font: `500 15px ${FONT.mono}`, color: col, align: 'right' });
  }
  rect(I, x, cy - 2, 50, 4, colA);
  text(I, `${depth >= 0 ? '−' : '+'}${Math.abs(depth).toFixed(1)} m`, x + 48, cy - 12, { font: `500 16px ${FONT.mono}`, color: colA, align: 'right' });
}
// lightning: strikes at given times (a flicker that decays over half a second) plus the strong snares
// (with S: also aims the flash at a part of the sky that changes from strike to strike)
export function lightning(X, strikes = [], amt = 1, S = null) {
  let l = Math.pow(X.snareF, 2) * 0.8, key = Math.floor(X.t * 4);
  for (const ts of strikes) {
    const d = X.t - ts;
    const v = d >= 0 && d < 0.5 ? (1 - d / 0.5) ** 2 * 1.15 * (0.65 + 0.35 * Math.cos(d * 70)) : 0;
    if (v > l) { l = v; key = ts; }
  }
  if (S) { const az = (hash(key, 7) - 0.5) * 2.4; S.boltDir = [Math.sin(az), 0.22 + hash(key, 8) * 0.45, -Math.cos(az)]; }
  return l * amt;
}
export function timecode(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}
export { clamp, lerp, ease, hash, smooth, BARS, P16, DUR, k16, t16, IMG, img, photo, vtext, vruby, text, ink, K, A, B, FONT, JPFALL, line, rect };
