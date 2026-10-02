// Chapter 1 — 此岸 / this shore (band intro, bars 4-11) and the table of contents (breakdown, bars 12-15)
// Cuts on every group of the 3-3-3-3-4 figure alternate between camera angles on the 3D sea and modern
// photographs, all printed in the same two inks, all with the horizon pinned to one line that doubles as the
// rhythm ruler. Bars 8-9: five strips = five cameras, widths 3:3:3:3:4. Bars 10-11: the storm starts to rise.
import { W, H, react, shake, flash, barT, at, clamp, ease, hash, lerp, text, vtext, ink, K, A, B, FONT, photo, caption,
  horizon, GRAYC, folio, BARS, P16, line, rect, seaOn, cam, handheld, rumble, ride, look, lookMix } from './common.js';
import { cropMarks, meterGlyph } from '../draw.js';

const HY = 560; // the shared horizon line on screen
const B4 = 4, B12 = 12;
// horizon pitch: a camera at height h, fov f, puts the horizon on screen row HY when pitch = atan((HY-540)/540 * tan(f/2))
const pitchFor = (fov) => Math.atan(((HY - 540) / 540) * Math.tan((fov * Math.PI) / 360));
// the cut list: 3D camera set-ups and photographs (with their horizon heights)
const CUTS = [
  { sea: { pos: [0, 0.9, 0], yaw: 0.0, fov: 62 }, lab: 'sea — wave level, 0.9 m' },
  { img: 'm_pier_storm', hy: 0.42, lab: 'pier, storm' },
  { sea: { pos: [0, 2.6, 0], yaw: -0.5, fov: 48 }, lab: 'sea — the far coast' },
  { img: 'm_rower', hy: 0.56, lab: 'a rower in the fog' },
  { sea: { pos: [0, 1.6, 0], yaw: 0.12, fov: 56 }, lab: 'sea — the moon path' },
  { img: 'm_wave_spray', hy: 0.36, lab: 'wave, spray' },
  { sea: { pos: [0, 5.5, 0], yaw: 0.3, fov: 70 }, lab: 'sea — 5.5 m above' },
  { img: 'm_she_sea', hy: 0.36, lab: 'she stands in the sea' },
  { sea: { pos: [0, 0.45, 0], yaw: -0.2, fov: 75 }, lab: 'sea — 0.45 m' },
  { img: 'm_tokyo_skyline', hy: 0.6, lab: 'this shore: Tokyo' },
  { img: 'm_moon_sea', hy: 0.6, lab: 'moon over the sea' },
];
const TREAT = [
  { mode: 4, duoInk: 2, duo: [0.42, 1, 0.05, 0.75] },
  { mode: 2, monoInk: 0 },
  { mode: 4, duoInk: 1, duo: [0.45, 1, 0.1, 0.8] },
  { mode: 2, monoInk: 2 },
  { mode: 4, duoInk: 2, duo: [0.3, 0.9, 0.0, 0.6] },
];

function horizonRuler(I, X, y, col) {
  const k = X.p.k, b = X.p.b;
  if (!b) return;
  const span = 32, x0 = 60, x1 = W - 60, kStart = b.k;
  I.save(); I.fillStyle = col;
  for (let j = 0; j <= span; j++) {
    const kk = kStart + j;
    const bi = BARS.findIndex((bb) => bb.k <= kk && kk < bb.k + bb.len);
    const bb = BARS[bi];
    const q = kk - bb.k;
    const isBar = q === 0, isGroup = bb.gstart.includes(q);
    const h = isBar ? 26 : isGroup ? 14 : 5;
    const xx = lerp(x0, x1, j / span);
    I.globalAlpha = kk <= k + 1e-6 ? 1 : 0.45;
    I.fillRect(Math.round(xx), y - h, isBar ? 2 : 1, h);
    if (isBar) text(I, `${bi + 1}`, xx + 5, y - 14, { font: `500 12px ${FONT.mono}`, color: col });
  }
  I.globalAlpha = 1;
  const px = lerp(x0, x1, (k - kStart) / span);
  I.beginPath(); I.moveTo(px, y + 4); I.lineTo(px - 6, y + 14); I.lineTo(px + 6, y + 14); I.closePath(); I.fill();
  I.restore();
  line(I, 0, y + 0.5, W, y + 0.5, 1, col);
}

function seaCut(C, X, cut, since, storm) {
  const { S } = C;
  const c = cam(cut.pos, cut.yaw, pitchFor(cut.fov), 0, cut.fov);
  c.pos[2] = -since * 2.2;                       // a slow dolly forward through each cut
  c.fov *= 1 + 0.04 * ease.out3(clamp(since / 0.5));
  handheld(c, X.t, 0.5, 5);
  if (storm) rumble(c, X, storm, X.t, 5);
  S.cam = c;
  if (cut.pos[1] < 1.2) ride(c, C.seaH, cut.pos[1], 0.8);
}

export const shore = [{
  name: 'shore', t0: barT(B4), t1: barT(B12),
  draw(C, X) {
    const { P, I, F, S } = C;
    const t = X.t, bi = X.p.bi, gi = X.p.gi;
    const n = (bi - B4) * 5 + gi;
    const b = X.p.b;
    const gT = barT(bi) + b.gstart[gi] * P16;
    const since = t - gT;
    const storm = clamp((bi - 9 + X.p.p) / 2);       // bars 10-11: the storm gathers
    seaOn(C, [], { printed: true, light: false });
    lookMix(S, 'night', 'storm', storm * 0.8);
    S.sky[3] = 1.7;                                  // printed scenes need a brighter negative
    S.moonDir = [0.2, 0.16, -1];
    S.city = 0.7; S.cityAz = [-0.9, -0.3];
    Object.assign(F, TREAT[n % TREAT.length]);
    F.inkA = '#e8352e'; F.inkB = '#0b7f86'; F.cell = 6.5;
    if (bi <= 5 || bi >= 10) {
      const cut = CUTS[n % CUTS.length];
      if (cut.sea) seaCut(C, X, cut.sea, since, storm * 1.4);
      else {
        S.cam = cam([0, 2, 0], 0, 0, 0, 60);
        P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
        horizon(P, cut.img, cut.hy, HY, { zoom: 1.06 + 0.03 * ease.out3(clamp(since / 0.5)), filter: GRAYC(1.25), dx: (hash(n, 3) - 0.5) * 0.04 });
      }
      caption(I, [`fig.${String(n + 9).padStart(2, '0')} — ${cut.lab}`], 70, H - 70, { size: 13 });
      if (bi >= 10) F.wet = 0.12 + 0.3 * storm;
    } else if (bi <= 7) {
      // split: left half cuts between sea and photographs on the accents, right half holds her in the sea
      const cut = CUTS[n % CUTS.length];
      if (cut.sea) { seaCut(C, X, cut.sea, since, 0); S.views = [{ rect: [0, 0, W / 2, H], cam: S.cam }]; }
      else {
        S.cam = cam([0, 2, 0], 0, 0, 0, 60);
        P.save(); P.beginPath(); P.rect(0, 0, W / 2, H); P.clip();
        P.fillStyle = '#fff'; P.fillRect(0, 0, W / 2, H);
        horizon(P, cut.img, cut.hy, HY, { zoom: 1.12, filter: GRAYC(1.25), dx: -0.2 });
        P.restore();
      }
      P.fillStyle = '#fff'; P.fillRect(W / 2, 0, W / 2, H);
      P.save(); P.beginPath(); P.rect(W / 2, 0, W / 2, H); P.clip();
      horizon(P, 'm_she_sea', 0.36, HY, { zoom: 1.5 + 0.06 * X.p.p, filter: GRAYC(1.1, 1.05), dx: 0.18 });
      P.restore();
      line(I, W * 0.5, 0, W * 0.5, H, 1, ink(K));
      caption(I, [`fig.${String(n + 9).padStart(2, '0')} — ${cut.lab}`], 70, H - 70, { size: 13 });
      caption(I, ['fig.02 — she stands in the sea (CC0)'], W * 0.5 + 24, H - 70, { size: 13 });
    } else {
      // five strips, widths in proportion to the 3-3-3-3-4 grouping: five cameras on the same sea
      const views = [];
      let x = 0;
      b.groups.forEach((g, i) => {
        const w = (g / b.len) * W;
        const c = cam([0, [0.6, 2.4, 0.3, 6, 1.4][i], 0], [-0.6, -0.2, 0.15, 0.4, 0.8][i] + (bi - 8) * 0.3, 0, 0, [70, 50, 80, 64, 44][i]);
        c.pitch = i === 3 ? -0.5 : pitchFor(c.fov);
        handheld(c, t, 0.6, i);
        if (i === gi) c.fov *= 0.92;
        views.push({ rect: [x, 0, w, H], cam: c });
        if (i) line(I, x, 0, x, H, 1.5, ink(K));
        text(I, `${g}/16`, x + 14, 92, { font: `500 14px ${FONT.mono}`, color: ink(i === gi ? A : K) });
        if (i !== gi) { P.fillStyle = 'rgba(255,255,255,0.45)'; P.fillRect(x, 0, w, H); }
        x += w;
      });
      S.views = views;
      S.cam = views[gi].cam;
      F.mode = 4; F.duoInk = 2; F.duo = [0.4, 1, 0.05, 0.75];
    }
    // the giant 此岸 jumps sides on every downbeat and starts to sink in the last two bars
    const side = (bi - B4) % 2 === 0 ? 1 : 0;
    const kx = side ? W - 230 : 230;
    const sink = bi >= 10 ? ease.in2(clamp(((bi - 10) + X.p.p) / 2)) * 620 : 0;
    const pop = 1 + 0.08 * (1 - ease.out3(clamp((t - barT(bi)) / 0.25)));
    vtext(I, '此岸', kx, -60 + sink, 400, { color: ink(A), weight: 800, gap: -0.04, charScale: () => pop });
    text(I, 'THIS SHORE', side ? W - 26 : 26, 120 + sink, { font: `500 13px ${FONT.mono}`, color: ink(K), rot: Math.PI / 2, tracking: 4 });
    horizonRuler(I, X, HY, ink(K));
    text(I, '此岸 this shore', 70, HY - 36, { font: `400 16px ${FONT.min}`, color: ink(K) });
    text(I, 'far shore 彼岸', W - 70, HY + 42, { font: `400 16px ${FONT.min}`, color: ink(K), align: 'right' });
    meterGlyph(I, '4/4', 110, 190, 64, ink(K));
    text(I, '♩=91', 80, 280, { font: `500 15px ${FONT.mono}`, color: ink(K) });
    folio(I, X, { head: 'He drowns in the She — 此岸' });
    flash(F, t, gT, 0.07, [1, 1, 1], gi === 0 ? 0.55 : 0.18);
    if (bi === B4) flash(F, t, barT(B4), 0.25, [1, 1, 1], 1);
    shake(F, X, 0.4 + storm * 1.2, 2);
    react(F, X, 1);
  },
}, {
  name: 'toc', t0: barT(B12), t1: barT(16),
  draw(C, X) {
    const { P, I, F } = C;
    const t = X.t, bi = X.p.bi;
    const lp = (t - barT(B12)) / (barT(16) - barT(B12));
    F.mode = 4; F.duoInk = 2; F.duo = [0.35, 1, 0.0, 0.7];
    F.inkA = '#e8352e'; F.inkB = '#0b7f86';
    F.cell = 6;
    const z = 1 + 0.06 * lp + 0.12 * ease.in3(clamp((t - at(15, 12)) / (4 * P16)));
    F.xf = [z, 0, -0.02 * lp, 0];
    P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
    // left page: she stands in the white sea
    P.save(); P.beginPath(); P.rect(0, 0, W / 2, H); P.clip();
    photo(P, 'm_she_sea', 0, 0, W / 2, H, { fx: 0.66, fy: 0.55, zoom: 1.0 + 0.12 * lp, filter: GRAYC(1.1, 1.0) });
    P.restore();
    const g = P.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    P.fillStyle = g; P.fillRect(W / 2 - 60, 0, 120, H);
    caption(I, ['fig.02 — she stands in the sea', 'photograph, CC0 (rawpixel)'], 60, H - 64, { size: 13, color: ink(K) });
    const entries = [
      ['一', '此岸', '五'], ['二', '客観と主観', '十七'], ['三', '海の中', '二十五'], ['四', '溢れる', '二十九'],
      ['五', '月は赤', '三十二'], ['六', '溺れる', '三十四'], ['七', '五拍子', '四十三'], ['八', '彼岸へ', '五十四'],
      ['九', '彼岸', '六十九'], ['十', '月は赤', '七十七'], ['十一', '海は、', '八十五'], ['十二', '奥付', '八十九'],
    ];
    const rx = W - 150;
    vtext(I, '目次', rx, 110, 64, { color: ink(K), weight: 800 });
    text(I, 'CONTENTS', rx + 44, 110, { font: `500 12px ${FONT.mono}`, color: ink(K), rot: Math.PI / 2, tracking: 4 });
    entries.forEach(([num, title, page], i) => {
      const te = at(B12 + Math.floor(i / 3), 8 + (i % 3) * 2);
      if (t < te) return;
      const a = ease.out3(clamp((t - te) / 0.14));
      const x = rx - 120 - i * 62;
      vtext(I, num, x, 120, 30, { color: ink(A), weight: 800, alpha: a });
      vtext(I, title, x, 180, 34, { color: ink(K), weight: 400, reveal: [...title].length * a });
      const hTitle = [...title].length * 34 * 1.05;
      I.save(); I.globalAlpha = a; I.fillStyle = ink(K);
      for (let y = 180 + hTitle + 16; y < 820; y += 14) I.fillRect(x - 1, y, 2, 2);
      I.restore();
      vtext(I, page, x, 832, 30, { color: ink(K), weight: 800, alpha: a });
    });
    const bq = X.p.q;
    if (bq < 3) { const y = lerp(80, H - 80, ease.out3(bq / 3)); line(I, W / 2 + 40, y, W - 60, y, 1, ink(A)); }
    cropMarks(I, W / 2 + 40, 60, W / 2 - 100, H - 120, 20, 8, ink(K), 1);
    folio(I, X, { side: 'right', head: '目次 — contents' });
    text(I, String(bi + 1).padStart(3, '0'), 60, 1040, { font: `500 15px ${FONT.mono}`, color: ink(K) });
    flash(F, t, barT(B12), 0.2, [1, 1, 1], 0.7);
    react(F, X, 0.6);
  },
}];
