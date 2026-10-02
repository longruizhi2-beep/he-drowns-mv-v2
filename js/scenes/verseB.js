// Chapter 9 — 彼岸 (verse B, bars 68-75, 2:31.4-2:52.5): the same words, from the far shore. Every page of verse A
// comes back turned round and printed in negative (the inks are the complements of the colours that should appear
// once the page is inverted): the cameras look the other way, the moon is red, the hand is mirrored, the boat is empty.
// On 海の中に行ってしまえば the negative ends: two black doors open onto the raw sea, where the storm is rising.
import { W, H, react, shake, flash, barT, clamp, ease, lerp, text, vtext, ink, K, A, B, FONT, photo,
  caption, GRAYC, folio, lyricV, lyricH, enCaption, line, rect, seaOn, cam, handheld, rumble, lookMix, lightning } from './common.js';
import { LINES } from '../lyrics.js';
import { quadrants } from './verseA.js';
import { wobbleCircle, arrow, eyePath, cropMarks, tintRect } from '../draw.js';

const VB = LINES.slice(13, 21);
const nextT = (i) => (i + 1 < VB.length ? VB[i + 1].t : barT(76));
const charT = (L, i) => L.chars[Math.min(i, L.chars.length - 1)].t;
// complements: these print as red / green / teal / blue after inversion
const NR = '#17cad1', NG = '#ff56a3', NT = '#f47f79', NB = '#e0a057';
function neg(F) { F.neg = 1; F.vig = 0.45; F.outside = '#f0efe9'; }
const HEAD = '九　彼岸';
const FAR = ['??°??′N  ??°??′E', 'the far shore, 02:31', 'unmapped'];

export const verseB = [
  {
    name: 'vb:kyakkan', t0: barT(68), t1: nextT(0),
    draw(C, X) {
      quadrants(C, X, VB[0], false, { far: true, inkA: NR, inkB: NT, head: HEAD, coords: FAR });
      neg(C.F);
      flash(C.F, X.t, barT(68), 0.3, [0, 0, 0], 1);
      react(C.F, X, 0.8);
    },
  },
  {
    // the hand again, mirrored; its shell opens onto the sea seen from below, the red moon overhead
    name: 'vb:hora1', t0: VB[1].t, t1: nextT(1),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, L = VB[1], lt = t - L.t;
      seaOn(C, ['night'], { printed: true, light: false });
      F.mode = 4; F.duoInk = 2; F.duo = [0.4, 1, 0.05, 0.75]; F.inkA = NR; F.inkB = NT; F.cell = 6.5; neg(F);
      F.tone = [1.2, 0.55, 0.0, 0.7];
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      photo(P, 'm_hand_shell', 0, 0, W, H, { fx: 0.5, fy: 0.45, zoom: 1.04 + 0.06 * clamp(lt / 2.5), filter: GRAYC(1.3, 1.02), flipX: true });
      const px = W - 860, py = 380;
      const tw = charT(L, 9);
      if (t >= tw) {
        const r = 230 * ease.outBack(clamp((t - tw) / 0.35));
        P.save(); P.globalCompositeOperation = 'destination-out'; P.fillStyle = '#000';
        P.beginPath(); P.arc(px, py, r, 0, Math.PI * 2); P.fill(); P.restore();
        S.moonDir = [0.08, 0.95, -0.2]; S.moon = [0.07, 0.9, 2.0, 1]; S.moonCol = '#ff4a2e';
        S.sky[3] = 1.9;
        const c = handheld(cam([0, -4, 0], 0.3 + lt * 0.15, Math.PI / 2 - 0.12, 0, 70), t, 0.4, 17);
        S.cam = c;
        S.views = [{ rect: [px - 240, py - 240, 480, 480], cam: c }];
        caption(I, ['fig.07′ — the world, from under it'], px - 480, py + 200, { size: 13 });
      }
      wobbleCircle(I, px, py, 260, 250, 15, clamp(lt / 0.45), 4, ink(A));
      if (lt > 0.2) arrow(I, px - 440, py - 300, px - 270, py - 170, 3, ink(A), 18);
      text(I, 'ほら', px - 450, py - 310, { font: `800 40px ${FONT.min}`, color: ink(A), alpha: clamp((lt - 0.2) / 0.2), align: 'right' });
      lyricV(I, L, t, 200, 110, 98, { color: ink(K) });
      caption(I, ['fig.07′ — the same hand, from the other side'], W - 520, H - 70, { size: 13 });
      enCaption(I, L, 60, H - 40, { size: 24 });
      folio(I, X, { side: 'left', head: HEAD, y: 1062 });
      react(F, X, 1);
    },
  },
  {
    // the face again, mirrored, and the strips trade places: the mouth above, the eye below
    name: 'vb:airashi', t0: VB[2].t, t1: nextT(2),
    draw(C, X) {
      const { P, I, F } = C;
      const t = X.t, L = VB[2], lt = t - L.t;
      F.mode = 0; F.inkA = NR; F.inkB = NG; F.cell = 6.5; neg(F);
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      const tEye = charT(L, 6);
      const my = 90, mh = 400;
      const slide = (1 - ease.out5(clamp(lt / 0.4))) * 300;
      P.save(); P.beginPath(); P.rect(0, my, W, mh); P.clip();
      photo(P, 'm_lips_pop', slide, my, W, mh, { fx: 0.5, fy: 0.5, zoom: 1.02 + 0.05 * clamp(lt / 2), filter: GRAYC(1.4, 1.1), flipX: true });
      tintRect(P, NR, 0, my, W, mh);
      P.restore();
      if (t >= tEye) {
        const e = ease.out5(clamp((t - tEye) / 0.3));
        const ey = 600, eh = 400;
        P.save(); P.beginPath(); P.rect(0, ey + eh * (1 - e) / 2, W, eh * e); P.clip();
        photo(P, 'm_iris', 0, ey, W, eh, { fx: 0.52, fy: 0.5, zoom: 1.0 + 0.08 * clamp((t - tEye) / 1.5), filter: GRAYC(1.4, 1.05), flipX: true });
        tintRect(P, NG, 0, ey, W, eh);
        P.restore();
        rect(I, 0, ey - 2, W, 2, ink(K)); rect(I, 0, ey + eh, W, 2, ink(K));
        text(I, '目は緑', W - 60, ey - 26, { font: `800 72px ${FONT.min}`, color: ink(B), alpha: e, align: 'right' });
      }
      rect(I, 0, my - 2, W, 2, ink(K)); rect(I, 0, my + mh, W, 2, ink(K));
      lyricH(I, L, t, 60, my + mh + 100, 54, { color: ink(K) });
      for (let x = 30; x < W; x += 64) { rect(I, x, my + 12, 26, 14, ink(K, 0.9)); rect(I, x, my + mh - 26, 26, 14, ink(K, 0.9)); }
      enCaption(I, L, W - 60, H - 30, { size: 24, align: 'right' });
      folio(I, X, { side: 'left', head: HEAD, y: 1062 });
      react(F, X, 1);
    },
  },
  {
    // the eye opens onto the red moon; on すぐに the lens pulls in until the moon fills it
    name: 'vb:hora2', t0: VB[3].t, t1: nextT(3),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, L = VB[3];
      const tOpen = charT(L, 7), tSugu = charT(L, 11), t1 = nextT(3);
      const open = ease.inout3(clamp((t - tOpen) / 0.45));
      const dive = ease.in3(clamp((t - tSugu) / (t1 - tSugu)));
      seaOn(C, ['red'], { printed: true, light: false });
      lookMix(S, 'night', 'swell', 0.4);
      S.moonCol = '#ff4a2e'; S.moon = [0.075, 1.0, 2.0, 1]; S.moonDir = [0, 0.07, -1]; S.sky[1] = 0.3; S.sky[3] = 1.7;
      S.cam = handheld(cam([0, 3, 0], 0, 0.05, 0, lerp(30, 7, dive)), t, 0.3, 19);
      F.mode = 0; F.inkA = NR; F.inkB = NG; F.cell = 6.5; neg(F);
      F.tone = [1.15, 0.62, 0.0, 0.78];
      const cx = W * 0.56, cy = H * 0.5;
      const ew = 1300 * (1 + dive * 3), eh = 520 * (1 + dive * 3);
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      P.save(); P.globalCompositeOperation = 'destination-out'; P.fillStyle = '#000';
      eyePath(P, cx, cy, ew, eh, Math.max(0.012, open)); P.fill(); P.restore();
      I.save(); I.strokeStyle = ink(K); I.lineWidth = 3; eyePath(I, cx, cy, ew, eh, Math.max(0.012, open)); I.stroke(); I.restore();
      if (dive < 0.3) {
        lyricV(I, L, t, 200, 100, 88, { color: ink(K) });
        enCaption(I, L, W - 60, 90, { size: 24, align: 'right' });
      }
      folio(I, X, { side: 'right', head: HEAD });
      F.xf = [1 + dive * 0.15, 0, 0, 0];
      react(F, X, 1);
    },
  },
  {
    name: 'vb:kyakkan2', t0: VB[4].t, t1: nextT(4),
    draw(C, X) {
      quadrants(C, X, VB[4], true, { far: true, inkA: NR, inkB: NT, head: HEAD, coords: FAR });
      neg(C.F);
      shake(C.F, X, 1.2, 44);
      react(C.F, X, 1.2);
    },
  },
  {
    // the boat again, mirrored on the page: empty now
    name: 'vb:kobune', t0: VB[5].t, t1: nextT(5),
    draw(C, X) {
      const { P, I, F } = C;
      const t = X.t, L = VB[5], lt = t - L.t;
      F.mode = 4; F.duoInk = 2; F.duo = [0.4, 1, 0.05, 0.7]; F.inkA = NR; F.inkB = NT; F.cell = 5.5; neg(F);
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      const pw = 600, ph = 400;
      const bob = Math.sin(lt * 2.4) * 6 + X.kick * 4;
      const px = W - 300 - pw, py = 330 + bob;
      P.save(); P.globalCompositeOperation = 'multiply';
      P.font = `800 900px ${FONT.min}, serif`; P.fillStyle = '#b9ccd1'; P.textBaseline = 'middle'; P.textAlign = 'right';
      P.fillText('舟', W - 980, 560);
      P.restore();
      photo(P, 'm_rowboat_blue', px, py, pw, ph, { fx: 0.48, fy: 0.55, zoom: 1.3 + lt * 0.02, filter: GRAYC(1.3), flipX: true });
      rect(I, px - 1, py - 1, pw + 2, ph + 2, ink(K), 1);
      const bx = px + pw * 0.48, by = py + ph * 0.6;
      I.save(); I.strokeStyle = ink(A); I.lineWidth = 1.5;
      I.beginPath(); I.arc(bx, by, 22, 0, Math.PI * 2); I.moveTo(bx - 20, by - 8); I.lineTo(bx - 330, by - 200); I.lineTo(bx - 470, by - 200); I.stroke(); I.restore();
      const a = clamp((t - charT(L, 5)) / 0.15);
      text(I, '小舟', bx - 340, by - 212, { font: `800 44px ${FONT.min}`, color: ink(A), alpha: a, align: 'right' });
      text(I, 'kobune — empty now', bx - 340, by - 170, { font: `italic 400 22px ${FONT.serif}`, color: ink(K), alpha: a, align: 'right' });
      lyricH(I, L, t, px, py + ph + 90, 40, { color: ink(K), weight: 400 });
      caption(I, ['fig.12′ — an empty rowboat', 'photograph, CC0'], px, py - 30, { size: 13 });
      cropMarks(I, px, py, pw, ph, 18, 8, ink(K), 1);
      enCaption(I, L, 60, H - 40, { size: 24 });
      folio(I, X, { side: 'left', head: HEAD, y: 1062 });
      react(F, X, 0.5);
    },
  },
  {
    name: 'vb:oborete', t0: VB[6].t, t1: nextT(6),
    draw(C, X) {
      const { P, I, F } = C;
      const t = X.t, L = VB[6], lt = t - L.t, dur = nextT(6) - L.t;
      F.mode = 4; F.duoInk = 2; F.duo = [0.38, 1, 0.0, 0.72]; F.inkA = NR; F.inkB = NT; F.cell = 6; neg(F);
      F.wet = 0.1 + 0.5 * clamp(lt / dur);
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      photo(P, 'm_freediver2', 0, 0, W, H, { fx: 0.5, fy: 0.45, zoom: 1.15 + 0.1 * clamp(lt / dur), filter: GRAYC(1.25, 1.05), flipX: true });
      const cols = [
        { s: '溺れて', i: 0, x: 160, size: 110, sink: true },
        { s: '忘れる', i: 3, x: 320, size: 110, strike: true },
        { s: '愛', i: 6, x: 590, size: 330, color: ink(A) },
        { s: 'と', i: 7, x: 740, size: 90 },
        { s: '汚辱', i: 8, x: 920, size: 230 },
        { s: 'のうちに', i: 10, x: 1160, size: 70 },
      ];
      for (const c of cols) {
        const tc = charT(L, c.i);
        if (t < tc) continue;
        const d = t - tc;
        const a = ease.out3(clamp(d / 0.1));
        let y = 110;
        if (c.sink) y += ease.in2(clamp(d / 3.5)) * 520;
        const n = [...c.s].length;
        if (c.color) vtext(I, c.s, c.x, y, c.size, { color: c.color, weight: 800, reveal: n * a });
        else vtext(P, c.s, c.x, y, c.size, { color: '#ffffff', weight: 800, reveal: n * a, jitter: c.s === '汚辱' ? X.snare * 14 : 0, seed: 5 });
        if (c.strike && d > 0.35) {
          const sp = clamp((d - 0.35) / 0.25);
          line(I, c.x, y - 10, c.x, y - 10 + (n * c.size * 1.05 + 20) * sp, 6, ink(A));
        }
      }
      caption(I, ['fig.13′ — a freediver, going down (CC0)'], W - 520, H - 60, { size: 13 });
      enCaption(I, L, W - 60, 70, { size: 24, align: 'right' });
      folio(I, X, { side: 'left', head: HEAD, y: 1062 });
      shake(F, X, 0.8, 47);
      react(F, X, 1.1);
    },
  },
  {
    // 海の中に行ってしまえば: the negative ends. Two black doors open onto the raw sea; the storm is coming up.
    name: 'vb:umiNaka2', t0: VB[7].t, t1: barT(76),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, L = VB[7], lt = t - L.t, dur = barT(76) - L.t;
      const open = ease.inout3(clamp((lt - 0.2) / (dur - 0.5)));
      seaOn(C, ['night'], { light: true, grain: 0.06, vig: 0.45 });
      lookMix(S, 'night', 'storm', ease.in2(clamp(lt / dur)));
      S.sky[3] = 1.3; S.skyFog = 0.35;
      S.rain = 0.9 * clamp(lt / dur);
      S.lightning = lightning(X, [L.t + dur * 0.55], 0.8, S);
      S.moonDir = [0.25, 0.18, -1]; S.city = 1.2; S.cityAz = [-0.6, 0.2];
      const c = cam([0, C.seaBase(0, 0) + lerp(2.5, 0.9, open), 0], 0, lerp(-0.1, 0.06, open), 0, lerp(50, 74, open));
      handheld(c, t, 0.8, 49);
      rumble(c, X, 0.4 + open, t, 49);
      S.cam = c;
      const gap = open * W * 0.5;
      P.fillStyle = '#141313';
      P.fillRect(-gap, 0, W / 2, H);
      P.fillRect(W / 2 + gap, 0, W / 2, H);
      if (gap > 2) { line(I, W / 2 - gap, 0, W / 2 - gap, H, 3, ink(K)); line(I, W / 2 + gap, 0, W / 2 + gap, H, 3, ink(K)); }
      F.mode = 0; F.cell = 6;
      lyricV(I, L, t, W / 2 + 50 - gap * 0.6, 140, 92, { color: ink(K) });
      enCaption(I, L, W / 2 - 40 - gap * 0.6, H - 60, { size: 26, align: 'right' });
      folio(I, X, { side: 'right', head: HEAD });
      react(F, X, 1);
    },
  },
];
