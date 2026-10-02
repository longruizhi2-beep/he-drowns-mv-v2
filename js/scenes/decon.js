// Chapter 7 — 変拍子 (the meter change, bars 42-52, 1:48.2-2:05.3)
//   bar 42  3/8  the stab tears the page open: under it, the raw sea under the red moon
//   43-46   5/8  drone build: five horizontal strips = five eighth notes, five cameras on one sea; the eighth being
//                played is the strip that is developed, the others are still paper
//   47-50   5/8  drums: hard cuts on the 4+3+3 accents, one word per cut, modern photographs and the raw 3D sea
//   51      2/4  fill: four flips of the storm
//   52      5/8  page turn into the cycle
import { W, H, react, shake, flash, barT, at, clamp, ease, hash, lerp, text, ink, K, A, B, FONT, photo, caption, GRAYC,
  folio, P16, line, rect, seaOn, cam, handheld, rumble, lookMix, lightning } from './common.js';
import { tintRect, meterGlyph, tornPath } from '../draw.js';

const DELA = (s) => `400 ${s}px ${FONT.dela}, ${FONT.goth}, sans-serif`;
const HEAD = '七　五拍子';

// slam a big string (scale-in)
function slam(ctx, s, x, y, size, t, t0, color, o = {}) {
  if (t < t0) return;
  const d = t - t0;
  const sc = lerp(o.from ?? 2.4, 1, ease.outExpo(clamp(d / (o.dur ?? 0.22))));
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc); if (o.rot) ctx.rotate(o.rot);
  ctx.font = DELA(size); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha *= clamp(d / 0.04);
  ctx.fillText(s, 0, 0);
  ctx.restore();
}
// the red-moon sea that the meter-change chapter is set on
function redSea(C, X, o = {}) {
  const { S } = C;
  seaOn(C, ['red'], { printed: o.printed, light: o.light ?? true, grain: 0.06, vig: 0.45 });
  lookMix(S, 'night', 'storm', o.storm ?? 0.4);
  S.moonCol = '#ff4a2e'; S.moon = [0.075, 1.0, 2.0, 1];
  S.moonDir = [0.0, 0.07, -1];
  S.sky[1] = 0.35; S.skyFog = 0.4;
  return S;
}
const moonCam = (C, t, fov, seed) => handheld(cam([0, 3.2, 0], 0, 0.04, 0, fov), t, 0.25, seed);

// ------------------------------------------------------------------ 5/8 cuts (bars 47-50): word, picture, inks
const CUTS = [ // style: 'red' / 'ink' = slammed in ink (or light, over the sea), 'knock' = knocked out of the photograph
  { img: 'm_iris', crop: [0.18, 0.3, 0.64, 0.4], word: '目', style: 'red', inkB: '#00a95c', tint: '#00a95c' },
  { img: 'm_rower', crop: [0.26, 0.58, 0.48, 0.4], word: '彼', style: 'ink', zoom: 1.0 },
  { img: 'm_she_sea', crop: [0.5, 0.12, 0.42, 0.65], word: '女', style: 'red', tint: '#0b7f86' },
  { img: 'm_hand_shell', crop: [0.3, 0.1, 0.55, 0.6], word: '手', style: 'knock' },
  { sea: 'moon', word: '月', style: 'red' },
  { img: 'm_float_white', crop: [0.15, 0.25, 0.7, 0.5], word: '溺', style: 'knock', tint: '#0b7f86' },
  { sea: 'wave', word: '海', style: 'ink' },
  { img: 'm_rowboat_blue', crop: [0.25, 0.3, 0.55, 0.5], word: '舟', style: 'ink' },
  { img: 'm_lips_pop', crop: [0.1, 0.1, 0.8, 0.8], word: '口', style: 'ink', tint: '#e8352e' },
  { img: 'm_jelly_dark2', crop: [0.25, 0.0, 0.6, 0.8], word: '毒', style: 'knock', inkA: '#ff48b0', tint: '#ff48b0' },
  { img: 'm_aquarium_child', crop: [0.25, 0.15, 0.6, 0.85], word: '夢', style: 'knock', inkB: '#00a95c', tint: '#00a95c' },
  { img: 'm_bubble_ring', crop: [0.2, 0.15, 0.6, 0.7], word: '息', style: 'red', tint: '#0b7f86' },
];
const DRONE_WORD = { 43: '五拍子', 44: '彼女', 45: '海', 46: '母' };

export const decon = [
  {
    name: 'decon:stab', t0: barT(42), t1: barT(43),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, lt = t - barT(42);
      // the stab tears the page; underneath, the sea is raw and the moon is red
      redSea(C, X, { light: false, storm: 0.8 });
      S.lightning = lightning(X, [barT(42) + 0.01], 1, S);
      const c = moonCam(C, t, 34, 61);
      rumble(c, X, 1.6, t, 61);
      S.cam = c;
      F.mode = 0; F.inkA = '#e8352e'; F.cell = 7;
      const tear = ease.outExpo(clamp(lt / 0.2));
      P.fillStyle = '#ffffff';
      P.save(); tornPath(P, 0, W, lerp(H * 0.5, H * 0.2, tear), 60, 7, false, 2000); P.fill(); P.restore();
      P.save(); tornPath(P, 0, W, lerp(H * 0.5, H * 0.82, tear), 60, 8, true, 2000); P.fill(); P.restore();
      meterGlyph(I, '3/8', 150, H * 0.1 + 20, 64, ink(K));
      text(I, '変拍子', W - 90, H * 0.1, { font: `800 40px ${FONT.min}`, color: ink(K), align: 'right' });
      text(I, 'meter change — 1:48.21', W - 90, H * 0.1 + 36, { font: `500 14px ${FONT.mono}`, color: ink(K), align: 'right' });
      text(I, '3 + 3 + 3 + 3 + 4  →  6', 150, H * 0.93, { font: `500 18px ${FONT.mono}`, color: ink(K) });
      flash(F, t, barT(42), 0.16, [1, 1, 1], 1);
      F.xf = [1 + 0.06 * (1 - ease.out3(clamp(lt / 0.4))), 0, 0, 0];
      shake(F, X, 2, 31);
      react(F, X, 1.4);
    },
  },
  {
    // five strips = five eighths. The strip being played is developed (the raw sea); the others are still paper.
    name: 'decon:drone', t0: barT(43), t1: barT(47),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, bi = X.p.bi, q = X.p.q;
      const build = (t - barT(43)) / (barT(47) - barT(43));
      redSea(C, X, { light: true, storm: 0.3 + 0.6 * build });
      S.sky[3] = 1.6 + 0.4 * build;
      S.lightning = lightning(X, [], 0.6 + build, S);
      S.rain = 0.4 * build;
      S.under = [0.06, 1.0 + 2 * X.snareF, 1.0, 0.04];
      const active = Math.min(4, Math.floor(q / 2));
      const sh = H / 5;
      const lt = t - barT(43);
      const cams = [
        handheld(cam([0, 3.2, 0], 0.02 * Math.sin(lt * 0.3), 0.045, 0, 22 - 4 * build), t, 0.3, 1),                    // the moon, long lens
        handheld(cam([0, C.seaBase(0, -lt * 2) + 0.7, -lt * 2], 0.4, 0.02, 0.1, 64), t, 1, 2),                           // wave level
        handheld(cam([0, C.seaBase(0, 0) - 3, 0], 0.1, 0.62, 0, 70), t, 0.8, 3),                                         // below: the moon through the surface
        handheld(cam([lt * 0.8, 16, -lt * 1.5], lt * 0.1, -1.45, 0, 55), t, 0.6, 4),                                     // above
        handheld(cam([0, -6, 0], 1.2 + lt * 0.05, -0.05, 0, 60), t, 0.8, 5),                                             // the deep, sideways
      ];
      const views = cams.map((c, i) => {
        rumble(c, X, 0.4 + build * 1.2, t, 70 + i);
        if (i === active) c.fov *= 1 - 0.06 * (1 - X.p.gp);
        return { rect: [0, i * sh, W, sh], cam: c };
      });
      S.views = views;
      S.cam = cams[active];
      S.cards = [{ img: 'm_she_sea', c: [2.2, -6.5, -5], u: [1.1, 0, -0.8], v: [0, 0.98, 0], alpha: 1, glow: 0.5 }];
      // undeveloped strips: a dark screen laid over the sea
      for (let i = 0; i < 5; i++) {
        if (i === active) continue;
        P.fillStyle = `rgba(12,12,14,${0.62 - 0.32 * build})`;
        P.fillRect(0, i * sh, W, sh);
      }
      F.mode = 0; F.inkA = '#e8352e'; F.inkB = '#0b7f86'; F.cell = 6.5;
      for (let i = 1; i < 5; i++) line(I, 0, i * sh, W, i * sh, 2, ink(K));
      for (let i = 0; i < 5; i++) text(I, `${i + 1}/8`, 30, i * sh + 34, { font: `500 15px ${FONT.mono}`, color: ink(i === active ? A : K) });
      const b = X.p.b;
      for (const gs of b.gstart) rect(I, 0, (gs / 2) * sh, 12, sh, ink(A));
      meterGlyph(I, '5/8', W - 150, H / 2, 150, ink(K));
      text(I, DRONE_WORD[bi] || '', W - 150, H / 2 + 230, { font: `800 52px ${FONT.min}`, color: ink(A), align: 'center' });
      caption(I, ['fig.25 — one sea, five eighth notes', '1 the moon / 2 the waves / 3 below / 4 above / 5 the deep'], 90, H - 60, { size: 13 });
      flash(F, t, barT(bi) + b.gstart[X.p.gi] * P16, 0.08, [1, 1, 1], 0.25 + 0.3 * build);
      react(F, X, 1 + build * 0.5);
    },
  },
  {
    name: 'decon:five', t0: barT(47), t1: barT(51),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, bi = X.p.bi, gi = X.p.gi;
      const n = (bi - 47) * 3 + gi;
      const cut = CUTS[n % CUTS.length];
      const b = X.p.b;
      const gT = barT(bi) + b.gstart[gi] * P16;
      const since = t - gT;
      const big = 760;
      const wx = n % 2 ? W * 0.72 : W * 0.3;
      if (cut.sea) {
        // the sea itself breaks through the paper: raw, the word in light
        redSea(C, X, { light: true, storm: cut.sea === 'wave' ? 1 : 0.4 });
        S.lightning = lightning(X, [gT + 0.01], 1, S);
        let c;
        if (cut.sea === 'moon') c = moonCam(C, t, lerp(18, 15, clamp(since / 0.6)), 80);
        else {
          S.wave = [1.9, 2.8, 0.11, 1.0];
          S.swell = [0, 0, 6, 6]; S.swell2 = [0, 1, lerp(-30, -6, clamp(since / 0.6)), 0.8];
          c = cam([0, C.seaBase(0, 0) + 0.8, 0], 0.1, 0.18, 0.12, 78);
        }
        rumble(c, X, 1.2, t, 80 + n);
        S.cam = c;
        slam(I, cut.word, wx, H / 2 + 20, big, t, gT, ink(cut.style === 'red' ? A : K), { from: 1.7, dur: 0.18 });
      } else {
        F.mode = 0; F.inkA = cut.inkA || '#e8352e'; F.inkB = cut.inkB || '#0b7f86'; F.cell = 7;
        P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
        photo(P, cut.img, 0, 0, W, H, { crop: cut.crop, zoom: 1.0 + 0.12 * ease.out3(clamp(since / 0.5)), filter: GRAYC(1.55, 1.0) });
        if (cut.tint) tintRect(P, cut.tint, 0, 0, W, H);
        if (cut.style === 'knock') {
          P.save(); P.font = DELA(big); P.fillStyle = '#ffffff'; P.textAlign = 'center'; P.textBaseline = 'middle';
          const sc = lerp(1.6, 1, ease.outExpo(clamp(since / 0.18)));
          P.translate(wx, H / 2 + 20); P.scale(sc, sc); P.fillText(cut.word, 0, 0); P.restore();
        } else slam(I, cut.word, wx, H / 2 + 20, big, t, gT, ink(cut.style === 'red' ? A : K), { from: 1.7, dur: 0.18 });
      }
      // meter strip: 4+3+3
      let x = 60;
      b.groups.forEach((g, i) => {
        rect(I, x, 60, g * 44 - 6, 16, i === gi ? ink(A) : ink(K, 0.5));
        x += g * 44;
      });
      meterGlyph(I, '5/8', x + 50, 68, 34, ink(K));
      text(I, `${String(n + 1).padStart(2, '0')}/12`, W - 60, 76, { font: `500 15px ${FONT.mono}`, color: ink(K), align: 'right' });
      caption(I, [cut.sea ? `fig.${26 + n} — the sea, ${cut.sea === 'moon' ? 'the red moon, 400 mm' : 'a wave breaking, 0.8 m'}` : `fig.${26 + n} — photograph, CC0`], 60, H - 50, { size: 13 });
      flash(F, t, gT, 0.06, [1, 1, 1], gi === 0 ? 0.7 : 0.35);
      shake(F, X, 1.6, 37);
      react(F, X, 1.5);
    },
  },
  {
    // four flips of the storm, one per eighth; a 海 slams down on each
    name: 'decon:fill', t0: barT(51), t1: barT(52),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, gi = X.p.gi;
      seaOn(C, ['storm'], { light: true, grain: 0.08, vig: 0.5 });
      S.sky[3] = 1.4; S.skyFog = 0.35; S.rain = 1;
      S.lightning = lightning(X, [at(51, 0) + 0.01, at(51, 4) + 0.01], 1, S);
      const sets = [[0, 1.2, 0, 0.0, 0.1, 0.2, 80], [0, 9, 3, 0.8, -0.9, -0.3, 60], [0, -2.5, 0, -0.5, 0.8, 0.5, 76], [0, 0.4, 0, 2.6, 0.02, -0.25, 90]];
      const [x, y, z, yaw, pitch, roll, fov] = sets[gi];
      const c = cam([x, (y > 0 && y < 2 ? C.seaBase(x, z) : 0) + y, z], yaw, pitch, roll, fov);
      rumble(c, X, 2, t, 90 + gi);
      S.cam = c;
      F.neg = gi % 2;
      const pos = [[0.25, 0.3], [0.7, 0.65], [0.35, 0.72], [0.62, 0.3]];
      for (let i = 0; i <= gi; i++) slam(I, '海', W * pos[i][0], H * pos[i][1], 420, t, at(51, i * 2), ink(i === gi ? A : K), { from: 1.8, dur: 0.12 });
      meterGlyph(I, '2/4', 120, 110, 60, ink(K));
      flash(F, t, at(51, gi * 2), 0.07, [1, 1, 1], 0.8);
      shake(F, X, 2.2, 39);
      react(F, X, 1.6);
    },
  },
  {
    // the page turns: the sea slides away left, the cycle's empty panels are drawn on the page coming in
    name: 'decon:turn', t0: barT(52), t1: barT(53),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, lp = X.p.p;
      seaOn(C, ['storm'], { light: false, grain: 0.06, vig: 0.4 });
      S.sky[3] = 1.4; S.skyFog = 0.35; S.rain = 0.7;
      const c = cam([0, C.seaBase(0, 0) + 1.2, 0], -0.6 * ease.inout3(clamp(lp / 0.55)), 0.06, 0.05, 72);
      rumble(c, X, 1, t, 95);
      S.cam = c;
      F.mode = 0; F.inkA = '#e8352e'; F.cell = 7;
      const slide = ease.inout3(clamp(lp / 0.55));
      const px = W * (1 - slide);
      P.fillStyle = '#fff'; P.fillRect(px, 0, W - px + 2, H);
      if (px > 2) line(I, px, 0, px, H, 2, ink(K));
      const widths = [10, 10, 10, 12];
      let x = px + 40;
      const total = W - 80;
      widths.forEach((w, i) => {
        const pw = (w / 42) * total;
        const d = clamp((lp - 0.45 - i * 0.1) / 0.2);
        if (d > 0) {
          rect(I, x + 6, 150, (pw - 12) * d, 2, ink(K)); rect(I, x + 6, 870, (pw - 12) * d, 2, ink(K));
          text(I, i < 3 ? '5/8' : '6/8', x + 10, 130, { font: `500 18px ${FONT.mono}`, color: ink(K), alpha: d });
        }
        x += pw;
      });
      text(I, '10 + 10 + 10 + 12 = 42', px + W - 60, 1010, { font: `500 18px ${FONT.mono}`, color: ink(K), align: 'right', alpha: clamp((lp - 0.6) / 0.2) });
      const fx = lerp(W + 200, W * 0.5, ease.out5(clamp((lp - 0.3) / 0.35)));
      I.save(); I.font = DELA(190); I.fillStyle = ink(A); I.textAlign = 'center'; I.textBaseline = 'middle';
      I.fillText('5+5+5+6', fx, H * 0.52); I.restore();
      text(I, '8分音符で数える — count in eighths', fx, H * 0.52 + 150, { font: `400 26px ${FONT.min}`, color: ink(K), align: 'center' });
      meterGlyph(I, '5/8', px + 90, 1000, 40, ink(K));
      folio(I, X, { side: 'right', head: HEAD });
      react(F, X, 0.8);
    },
  },
];
