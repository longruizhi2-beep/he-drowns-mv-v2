// 2D drawing toolkit for the two layers.
//   P (photo/proof layer): normal colours, white = paper. Screened by the press.
//   I (ink layer): 'lighter' compositing; red = key ink, green = spot A, blue = spot B. Printed solid.
import { clamp, lerp, hash, rng, noise1, TAU } from './util.js';

export const K = [255, 0, 0], A = [0, 255, 0], B = [0, 0, 255];
export const ink = (ch, a = 1) => `rgba(${ch[0]},${ch[1]},${ch[2]},${a})`;
export const FONT = {
  min: 'Shippori', goth: 'ZenKaku', dela: 'Dela', serif: 'Garamond', mono: 'Plex', bodoni: 'Bodoni',
};
export const JPFALL = ', Shippori, Dela, "Noto Serif JP", "Yu Gothic", serif';
const withFall = (f) => (f.includes(',') ? f : f + JPFALL);
export function font(ctx, fam, size, weight = 400, style = '') {
  ctx.font = `${style} ${weight} ${size}px ${fam}${JPFALL}`;
}

// ---------------------------------------------------------------- images
export const IMG = {};
export function img(name) {
  const im = IMG[name];
  if (!im) throw new Error('image not loaded: ' + name);
  return im;
}
// Draw an image to cover a rect. opts: fx, fy focal point (0..1 of source), zoom (>=1), crop [sx,sy,sw,sh] normalised,
// rot, alpha, flipX, flipY, filter, contain
export function photo(ctx, name, x, y, w, h, o = {}) {
  const im = img(name);
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  let [sx, sy, sw, sh] = o.crop ? [o.crop[0] * iw, o.crop[1] * ih, o.crop[2] * iw, o.crop[3] * ih] : [0, 0, iw, ih];
  const fx = o.fx ?? 0.5, fy = o.fy ?? 0.5, zoom = o.zoom ?? 1;
  const ra = w / h, sa = sw / sh;
  let cw, ch;
  if (o.contain ? sa > ra : sa < ra) { cw = sw; ch = sw / ra; } else { ch = sh; cw = sh * ra; }
  if (o.contain) { // letterbox inside the rect
    const s = Math.min(w / sw, h / sh);
    const dw = sw * s, dh = sh * s;
    drawPart(ctx, im, sx, sy, sw, sh, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, o);
    return;
  }
  cw /= zoom; ch /= zoom;
  const cx = clamp(sx + fx * sw - cw / 2, sx, sx + sw - cw);
  const cy = clamp(sy + fy * sh - ch / 2, sy, sy + sh - ch);
  drawPart(ctx, im, cx, cy, cw, ch, x, y, w, h, o);
}
function drawPart(ctx, im, sx, sy, sw, sh, x, y, w, h, o) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  if (o.op) ctx.globalCompositeOperation = o.op;
  if (o.rot || o.flipX || o.flipY) {
    ctx.translate(x + w / 2, y + h / 2);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
    ctx.drawImage(im, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  } else ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}
// print whatever is under a rect in one ink: screen-composite the ink colour (1-(1-L)(1-ink))
export function tintRect(ctx, color, x, y, w, h, amt = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amt;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
// flat screened tint block on the proof layer (e.g. 30% key = '#b3b3b3')
export function tintBlock(ctx, color, x, y, w, h, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- type
const SMALL = 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ';
const PUNCT = '、。，．';
const ROTATE = 'ー〜～…‥―－-「」『』（）()［］[]【】〈〉《》';
export function isCJK(ch) { return /[　-鿿＀-￯]/.test(ch); }

// horizontal text with optional letter spacing; returns advance width
export function text(ctx, s, x, y, o = {}) {
  ctx.save();
  if (o.font) ctx.font = withFall(o.font);
  ctx.fillStyle = o.color || ink(K);
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.tracking) ctx.letterSpacing = o.tracking + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  if (o.stroke) { ctx.strokeStyle = o.color; ctx.lineWidth = o.stroke; ctx.strokeText(s, x, y); } else ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}
// vertical Japanese text. (x = column centre, y = top). o.reveal = number of chars shown (float -> last char fades)
// o.gap = extra spacing (fraction of size). Returns total height.
export function vtext(ctx, s, x, y, size, o = {}) {
  const chars = [...s];
  const step = size * (1 + (o.gap ?? 0.05));
  ctx.save();
  ctx.font = o.font || `${o.weight ?? 800} ${size}px ${o.fam || FONT.min}${JPFALL}`;
  ctx.fillStyle = o.color || ink(K);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rev = o.reveal ?? chars.length;
  let cy = y + size / 2;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const vis = clamp(rev - i);
    if (vis <= 0) break;
    ctx.save();
    ctx.globalAlpha *= o.fade === false ? (vis > 0 ? 1 : 0) : vis;
    let dx = 0, dy = 0;
    if (o.jitter) { dx = (hash(i, o.seed || 0, 1) - 0.5) * o.jitter; dy = (hash(i, o.seed || 0, 2) - 0.5) * o.jitter; }
    if (PUNCT.includes(c)) { dx += size * 0.55; dy -= size * 0.55; }
    else if (SMALL.includes(c)) { dx += size * 0.1; dy -= size * 0.1; }
    ctx.translate(x + dx, cy + dy);
    if (ROTATE.includes(c) || (!isCJK(c) && c !== ' ')) ctx.rotate(Math.PI / 2);
    if (o.charScale) { const sc = o.charScale(i, c); ctx.scale(sc, sc); }
    ctx.fillText(c, 0, size * 0.04);
    ctx.restore();
    cy += PUNCT.includes(c) ? step * 0.55 : step;
  }
  ctx.restore();
  return cy - y;
}
export function vheight(s, size, gap = 0.05) {
  let h = 0;
  for (const c of s) h += PUNCT.includes(c) ? size * (1 + gap) * 0.55 : size * (1 + gap);
  return h;
}
// ruby (furigana) for vertical text: reading drawn to the right of the base run
export function vruby(ctx, reading, x, y, baseLen, size, o = {}) {
  const rs = size * 0.36;
  const n = [...reading].length;
  const span = baseLen * size * (1 + (o.gap ?? 0.05));
  const step = Math.min(rs * 1.05, span / n);
  const top = y + (span - step * n) / 2;
  ctx.save();
  ctx.font = `500 ${rs}px ${FONT.min}${JPFALL}`;
  ctx.fillStyle = o.color || ink(K);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  [...reading].forEach((c, i) => {
    let dx = 0, dy = 0;
    if (SMALL.includes(c)) { dx = rs * 0.1; dy = -rs * 0.1; }
    ctx.fillText(c, x + size * 0.5 + rs * 0.62 + dx, top + step * (i + 0.5) + dy);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- editorial marks
export function line(ctx, x1, y1, x2, y2, lw = 1, color = ink(K)) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
export function rect(ctx, x, y, w, h, color = ink(K), lw = 0) {
  ctx.save();
  if (lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); } else { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}
export function cropMarks(ctx, x, y, w, h, len = 28, gap = 10, color = ink(K), lw = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
  const c = [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]];
  for (const [cx, cy, sx, sy] of c) {
    ctx.moveTo(cx + sx * gap, cy); ctx.lineTo(cx + sx * (gap + len), cy);
    ctx.moveTo(cx, cy + sy * gap); ctx.lineTo(cx, cy + sy * (gap + len));
    // Japanese-style double trim marks (トンボ)
    ctx.moveTo(cx + sx * gap, cy + sy * 9); ctx.lineTo(cx + sx * (gap + len), cy + sy * 9);
    ctx.moveTo(cx + sx * 9, cy + sy * gap); ctx.lineTo(cx + sx * 9, cy + sy * (gap + len));
  }
  ctx.stroke(); ctx.restore();
}
export function regMark(ctx, x, y, r = 14, color = ink(K), lw = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, TAU); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
  ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
// hand-drawn circle (proof-reading mark). p = draw progress 0..1
export function wobbleCircle(ctx, cx, cy, rx, ry, seed, p = 1, lw = 3, color = ink(A)) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  const turns = 1.12, n = 90, a0 = hash(seed, 1) * TAU;
  const steps = Math.max(2, Math.floor(n * p));
  for (let i = 0; i <= steps; i++) {
    const u = i / n;
    const a = a0 + u * TAU * turns;
    const wob = 1 + (noise1(u * 5, seed) - 0.5) * 0.14 + u * 0.06;
    const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke(); ctx.restore();
}
export function arrow(ctx, x1, y1, x2, y2, lw = 2, color = ink(K), head = 12) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.4) * head, y2 - Math.sin(a - 0.4) * head);
  ctx.lineTo(x2 - Math.cos(a + 0.4) * head, y2 - Math.sin(a + 0.4) * head); ctx.closePath(); ctx.fill(); ctx.restore();
}
export function hgrid(ctx, x, y, w, h, cols, rows, color = ink(K, 0.35), lw = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
  for (let i = 0; i <= cols; i++) { const xx = Math.round(x + (w * i) / cols) + 0.5; ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); }
  for (let j = 0; j <= rows; j++) { const yy = Math.round(y + (h * j) / rows) + 0.5; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
  ctx.stroke(); ctx.restore();
}
// genkō-yōshi style grid (Japanese manuscript squares) for vertical text
export function genko(ctx, x, y, cols, rows, cell, color = ink(A, 0.55), lw = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw;
  for (let c = 0; c < cols; c++) {
    const cx = x - c * cell * 1.25;
    ctx.strokeRect(cx - cell, y, cell, rows * cell);
    ctx.beginPath();
    for (let r = 1; r < rows; r++) { ctx.moveTo(cx - cell, y + r * cell); ctx.lineTo(cx, y + r * cell); }
    ctx.stroke();
  }
  ctx.restore();
}
// real EAN-13 bars
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN_P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
export function ean13(digits12) {
  const d = digits12.split('').map(Number);
  const sum = d.reduce((s, v, i) => s + v * (i % 2 ? 3 : 1), 0);
  d.push((10 - (sum % 10)) % 10);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (EAN_P[d[0]][i - 1] === 'L' ? EAN_L : EAN_G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += EAN_R[d[i]];
  bits += '101';
  return { bits, digits: d.join('') };
}
export function barcode(ctx, x, y, w, h, digits12, color = ink(K), reveal = 1) {
  const { bits, digits } = ean13(digits12);
  const m = w / (bits.length + 14);
  ctx.save(); ctx.fillStyle = color;
  const n = Math.floor(bits.length * reveal);
  for (let i = 0; i < n; i++) {
    if (bits[i] !== '1') continue;
    const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
    ctx.fillRect(x + (i + 7) * m, y, m + 0.2, h - (guard ? 0 : m * 5));
  }
  font(ctx, FONT.mono, m * 7, 500);
  ctx.textBaseline = 'alphabetic';
  if (reveal >= 1) {
    ctx.fillText(digits[0], x + m, y + h + m * 1);
    ctx.fillText(digits.slice(1, 7), x + 10 * m, y + h + m * 1);
    ctx.fillText(digits.slice(7), x + 56 * m, y + h + m * 1);
  }
  ctx.restore();
}
// time signature as stacked numerals
export function meterGlyph(ctx, meter, x, y, size, color = ink(K), fam = FONT.serif, weight = 600) {
  if (!meter || meter === 'free') return;
  const [a, b] = meter.split('/');
  ctx.save(); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px ${fam}, serif`;
  ctx.fillText(a, x, y - size * 0.4);
  ctx.fillText(b, x, y + size * 0.4);
  ctx.restore();
}
// irregular ink drop / splash outline
export function dropPath(ctx, cx, cy, r, seed, spikes = 0, fresh = true) {
  if (fresh) ctx.beginPath();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    let rr = r * (1 + (noise1(i / n * 6, seed) - 0.5) * 0.18);
    if (spikes) rr += r * spikes * Math.max(0, noise1(i / n * 23, seed + 3) - 0.62) * 2.2;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
// almond eye shape, open = 0..1
export function eyePath(ctx, cx, cy, w, h, open) {
  const hh = h * open;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.bezierCurveTo(cx - w * 0.2, cy - hh, cx + w * 0.2, cy - hh, cx + w / 2, cy);
  ctx.bezierCurveTo(cx + w * 0.2, cy + hh * 0.8, cx - w * 0.2, cy + hh * 0.8, cx - w / 2, cy);
  ctx.closePath();
}
export function tornPath(ctx, x0, x1, y, amp, seed, down = true, H = 2000) {
  ctx.beginPath();
  ctx.moveTo(x0, down ? y + H : y - H);
  const n = Math.max(8, Math.floor((x1 - x0) / 9));
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    const yy = y + (noise1(i * 0.37, seed) - 0.5) * amp + (hash(i, seed) - 0.5) * amp * 0.35;
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(x1, down ? y + H : y - H);
  ctx.closePath();
}
export function clipRect(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
export { rng };
