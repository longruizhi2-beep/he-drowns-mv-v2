// Chapter 2 — 客観と主観 (verse A, bars 16-23) + 海の中 interlude (bars 24-27)
import { W, H, react, shake, flash, barT, at, clamp, ease, hash, lerp, text, vtext, vruby, ink, K, A, B, FONT, photo,
  caption, GRAYC, folio, lyricV, lyricH, enCaption, P16, line, rect, meterTag, timecode,
  seaOn, cam, keyed, handheld, rumble, ride, look, lookMix, lookAt, screenToWater } from './common.js';
import { LINES } from '../lyrics.js';
import { cropMarks, hgrid, wobbleCircle, arrow, eyePath, regMark, tintRect } from '../draw.js';

const VA = LINES.slice(0, 8);
const nextT = (i) => (i + 1 < VA.length ? VA[i + 1].t : barT(24));
const charT = (L, i) => L.chars[Math.min(i, L.chars.length - 1)].t;
const QW = [0, 3, 6, 9];

// ---------------------------------------------------------------- 客観、主観、此岸、彼岸: four cameras on one sea
// view set-ups: objective (measured, from above), subjective (tilted, at the water, red), this shore (the lit
// coast), the far shore (from under the surface, teal)
// far = the same four set-ups seen from the other shore: turned round, and the one under water looks down
function quadView(k, t, seaH, far = false) {
  const turn = far ? Math.PI : 0;
  if (k === 0) return { cam: handheld(cam([0, 16, 5], turn, -1.32, 0, 46), t, 0.3, 1), grade: [1, 1, 1, 1] };
  if (k === 1) { const c = cam([1, 0.8, 0], 0.15 + turn, 0.03, far ? -0.28 : 0.28, 72); ride(c, seaH, 0.55, 1.4); return { cam: handheld(c, t, 1.4, 2), grade: [1.0, 0.32, 0.26, 1] }; }
  if (k === 2) return { cam: handheld(cam([0, 2.2, 0], -0.62 + turn, 0.012, 0, 38), t, 0.3, 3), grade: [1, 1, 1, 1] };
  return { cam: handheld(cam([0, -5, 0], 0.1, far ? -0.85 : 0.95, 0, 72), t, 0.5, 4), grade: [0.32, 0.92, 0.98, 1] };
}
export function quadrants(C, X, L, variant, o = {}) {
  const { P, I, F, S } = C;
  const t = X.t;
  seaOn(C, ['night'], { printed: true, light: false });
  S.sky[3] = 2.1; S.city = 1.4; S.cityAz = [-0.9, -0.3]; S.moonDir = [0.25, 0.32, -1]; S.moon = [0.06, 0.9, 1.8, 0];
  if (o.far) { S.city = 0; S.moonDir = [-0.25, 0.32, 1]; S.moon = [0.07, 0.9, 1.8, 1]; S.moonCol = '#ff4a2e'; }
  F.mode = 0;
  F.inkA = o.inkA || '#e8352e'; F.inkB = o.inkB || '#0b7f86';
  F.cell = 6;
  const wi = QW.filter((i) => t >= charT(L, i)).length - 1;
  let gx = W / 2, gy = H / 2;
  if (variant) {
    const shifts = [[0.5, 0.5], [0.62, 0.38], [0.36, 0.64], [0.7, 0.58], [0.44, 0.3]];
    const sft = shifts[Math.max(0, wi + 1)];
    gx = W * sft[0]; gy = H * sft[1];
  }
  const cells = [[0, 0, gx, gy], [gx, 0, W - gx, gy], [0, gy, gx, H - gy], [gx, gy, W - gx, H - gy]];
  const words = ['客観', '主観', '此岸', '彼岸'];
  const en = ['objective', 'subjective', 'this shore', 'the far shore'];
  const rot = variant ? Math.max(0, wi) : 0;
  const views = [];
  for (let q = 0; q < 4; q++) {
    const [x, y, w, h] = cells[q];
    const tw = charT(L, QW[q]);
    if (t < tw - 1e-4) { P.fillStyle = '#fff'; P.fillRect(x, y, w, h); continue; }
    const v = quadView((q + rot) % 4, t, C.seaH, o.far);
    v.cam.fov *= 1 - 0.05 * ease.out3(clamp((t - tw) / 1.2));
    views.push({ rect: [x, y, w, h], cam: v.cam, grade: v.grade });
    const img = (q + rot) % 4;
    const since = t - tw;
    if (img === 0) {
      hgrid(I, x + 30, y + 30, w - 60, h - 60, 8, 5, ink(K, 0.5), 1);
      caption(I, o.coords || ['35°18′N  139°29′E', 'Sagami Bay, 23:40', 'scale 1:1'], x + 40, y + h - 76, { size: 13 });
      line(I, x + w - 250, y + h - 44, x + w - 50, y + h - 44, 3, ink(K));
      text(I, '0          10 m', x + w - 250, y + h - 54, { font: `400 12px ${FONT.mono}`, color: ink(K) });
    }
    if (img === 1) wobbleCircle(I, x + w * 0.55, y + h * 0.5, w * 0.28, h * 0.32, 11 + q, clamp(since / 0.35), 3, ink(A));
    if (img === 3) text(I, '↑ the surface, from below', x + 30, y + 44, { font: `400 13px ${FONT.mono}`, color: ink(K) });
    const a = ease.out3(clamp(since / 0.12));
    const size = Math.min(w, h) * 0.27;
    const wx = x + w - size * 0.9, wy = y + h * 0.12;
    vtext(I, words[q], wx, wy, size, { color: ink(K), weight: 800, charScale: () => 1 + (1 - a) * 0.3 });
    vruby(I, ['きゃっかん', 'しゅかん', 'しがん', 'ひがん'][q], wx, wy, 2, size, { color: ink(K) });
    const lab = variant ? en[(q + 1) % 4] : en[q];
    text(I, lab, x + 32, y + 52, { font: `italic 400 30px ${FONT.serif}`, color: ink(K), alpha: a });
    if (variant) {
      line(I, x + 28, y + 42, x + 40 + lab.length * 14, y + 42, 2.5, ink(A));
      text(I, 'トル', x + 50 + lab.length * 14, y + 50, { font: `400 20px ${FONT.min}`, color: ink(A), alpha: a });
    }
  }
  S.views = views;
  if (views.length) S.cam = views[0].cam;
  line(I, gx, 0, gx, H, 2, ink(K));
  line(I, 0, gy, W, gy, 2, ink(K));
  regMark(I, gx, gy, 16, ink(K));
  enCaption(I, L, 40, H - 26, { size: 22 });
  folio(I, X, { side: 'right', head: o.head || '二　客観と主観' });
}

// ---------------------------------------------------------------- scenes
export const verseA = [
  {
    name: 'v:kyakkan', t0: VA[0].t, t1: nextT(0),
    draw(C, X) { quadrants(C, X, VA[0], false); flash(C.F, X.t, VA[0].t, 0.2, [1, 1, 1], 0.8); react(C.F, X, 0.8); },
  },
  {
    name: 'v:hora1', t0: VA[1].t, t1: nextT(1),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, L = VA[1], lt = t - L.t;
      seaOn(C, ['calm'], { printed: true, light: false });
      F.mode = 4; F.duoInk = 2; F.duo = [0.4, 1, 0.05, 0.75]; F.inkA = '#e8352e'; F.inkB = '#0b7f86'; F.cell = 6.5;
      // the hand, holding a shell, in the water
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      const z = 1.04 + 0.06 * clamp(lt / 2.5);
      photo(P, 'm_hand_shell', 0, 0, W, H, { fx: 0.5, fy: 0.45, zoom: z, filter: GRAYC(1.3, 1.02) });
      const px = 860, py = 380; // the shell in the palm
      const tw = charT(L, 9);   // 世界: the shell becomes a window onto the whole sea
      if (t >= tw) {
        const r = 230 * ease.outBack(clamp((t - tw) / 0.35));
        P.save(); P.globalCompositeOperation = 'destination-out';
        P.beginPath(); P.arc(px, py, r, 0, Math.PI * 2); P.fill(); P.restore();
        const top = cam([0, 9, 0], 0, -Math.PI / 2 + 0.001, 0, 40);
      F.tone = [1.2, 0.55, 0.0, 0.7];
        S.cam = handheld(top, t, 0.3, 7);
        S.views = [{ rect: [px - 240, py - 240, 480, 480], cam: S.cam }];
        S.moonDir = [0.05, 0.96, -0.25]; S.sky[3] = 2.2;
        S.rip = [[0, 0, (t - tw) * 1.4, 0.25], [1.2, -0.8, Math.max(0, t - tw - 0.4) * 1.4, 0.18]];
        caption(I, ['fig.08 — the sea, 9 m above it, 23:41'], px + 250, py + 200, { size: 13 });
      }
      wobbleCircle(I, px, py, 260, 250, 5, clamp(lt / 0.45), 4, ink(A));
      if (lt > 0.2) arrow(I, px + 440, py - 300, px + 270, py - 170, 3, ink(A), 18);
      text(I, 'ほら', px + 450, py - 310, { font: `800 40px ${FONT.min}`, color: ink(A), alpha: clamp((lt - 0.2) / 0.2) });
      lyricV(I, L, t, 1660, 110, 98, { color: ink(K) });
      caption(I, ['fig.07 — a hand, a shell, the water', 'photograph, CC0'], 60, H - 70, { size: 13 });
      enCaption(I, L, W - 60, H - 40, { size: 24, align: 'right' });
      folio(I, X, { side: 'right', head: '二　客観と主観' });
      react(F, X, 1);
    },
  },
  {
    name: 'v:airashi', t0: VA[2].t, t1: nextT(2),
    draw(C, X) {
      const { P, I, F } = C;
      const t = X.t, L = VA[2], lt = t - L.t;
      F.mode = 0; F.inkA = '#e8352e'; F.inkB = '#00a95c'; F.cell = 6.5;
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      const tEye = charT(L, 6);
      // the mouth: a pop-art illustration, printed red
      const my = 560, mh = 440;
      const slide = (1 - ease.out5(clamp(lt / 0.4))) * 300;
      P.save(); P.beginPath(); P.rect(0, my, W, mh); P.clip();
      photo(P, 'm_lips_pop', -slide, my, W, mh, { fx: 0.5, fy: 0.5, zoom: 1.02 + 0.05 * clamp(lt / 2), filter: 'contrast(1.1)' });
      P.restore();
      // the eye: a green iris
      if (t >= tEye) {
        const e = ease.out5(clamp((t - tEye) / 0.3));
        const ey = 90, eh = 400;
        P.save(); P.beginPath(); P.rect(0, ey + eh * (1 - e) / 2, W, eh * e); P.clip();
        photo(P, 'm_iris', 0, ey, W, eh, { fx: 0.48, fy: 0.5, zoom: 1.0 + 0.08 * clamp((t - tEye) / 1.5), filter: GRAYC(1.4, 1.05) });
        tintRect(P, '#00a95c', 0, ey, W, eh);
        P.restore();
        rect(I, 0, ey - 2, W, 2, ink(K)); rect(I, 0, ey + eh, W, 2, ink(K));
        text(I, '目は緑', 60, ey + eh + 86, { font: `800 72px ${FONT.min}`, color: ink(B), alpha: e });
        text(I, 'fig.10 — iris, macro (CC0)', W - 60, ey + eh + 40, { font: `400 13px ${FONT.mono}`, color: ink(K), align: 'right' });
      }
      rect(I, 0, my - 2, W, 2, ink(K)); rect(I, 0, my + mh, W, 2, ink(K));
      lyricH(I, L, t, 60, 1052, 54, { color: ink(K), ruby: true });
      text(I, 'fig.09 — lips, pop illustration (CC0)', 60, my - 16, { font: `400 13px ${FONT.mono}`, color: ink(K) });
      for (let x = 30; x < W; x += 64) { rect(I, x, my + 12, 26, 14, ink(K, 0.9)); rect(I, x, my + mh - 26, 26, 14, ink(K, 0.9)); }
      enCaption(I, L, W - 60, 530, { size: 24, align: 'right' });
      folio(I, X, { side: 'right', head: '二　客観と主観' });
      react(F, X, 1);
    },
  },
  {
    name: 'v:hora2', t0: VA[3].t, t1: nextT(3),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, L = VA[3];
      const tOpen = charT(L, 7), tSugu = charT(L, 11), t1 = nextT(3);
      const open = ease.inout3(clamp((t - tOpen) / 0.45));
      const dive = ease.in3(clamp((t - tSugu) / (t1 - tSugu)));
      // the paper, with an eye that opens onto the real sea (raw, unprinted)
      seaOn(C, ['night'], { light: false, grain: 0.05 });
      S.moonDir = [0.08, 0.2, -1];
      F.mode = 0; F.inkA = '#e8352e'; F.inkB = '#00a95c'; F.cell = 6.5;
      const c = cam([0, lerp(1.2, -2.2, dive), 0], 0.06, lerp(0.04, -0.25, dive), 0, lerp(52, 80, dive));
      if (dive < 0.5) ride(c, C.seaH, lerp(1.2, -0.4, dive * 2), 0.6);
      S.cam = handheld(c, t, 0.6, 9);
      const cx = W * 0.44, cy = H * 0.5;
      const ew = 1300 * (1 + dive * 3), eh = 520 * (1 + dive * 3);
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      P.save(); P.globalCompositeOperation = 'destination-out';
      eyePath(P, cx, cy, ew, eh, Math.max(0.012, open)); P.fill(); P.restore();
      I.save(); I.strokeStyle = ink(K); I.lineWidth = 3; eyePath(I, cx, cy, ew, eh, Math.max(0.012, open)); I.stroke(); I.restore();
      if (dive < 0.3) {
        lyricV(I, L, t, 1720, 100, 88, { color: ink(K) });
        enCaption(I, L, 60, 90, { size: 24 });
      }
      folio(I, X, { side: 'right', head: '二　客観と主観' });
      F.xf = [1 + dive * 0.15, 0, 0, 0];
      react(F, X, 1);
    },
  },
  {
    name: 'v:kyakkan2', t0: VA[4].t, t1: nextT(4),
    draw(C, X) { quadrants(C, X, VA[4], true); flash(C.F, X.t, VA[4].t, 0.15, [0.9, 1, 0.95], 0.9); shake(C.F, X, 1.2, 4); react(C.F, X, 1.2); },
  },
  {
    name: 'v:kobune', t0: VA[5].t, t1: nextT(5),
    draw(C, X) {
      const { P, I, F } = C;
      const t = X.t, L = VA[5], lt = t - L.t;
      F.mode = 4; F.duoInk = 2; F.duo = [0.4, 1, 0.05, 0.7]; F.inkA = '#e8352e'; F.inkB = '#0b7f86'; F.cell = 5.5;
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      // a small boat on a vast white page
      const pw = 600, ph = 400;
      const bob = Math.sin(lt * 2.4) * 6 + X.kick * 4;
      const px = 300, py = 330 + bob;
      P.save(); P.globalCompositeOperation = 'multiply';
      P.font = `800 900px ${FONT.min}, serif`; P.fillStyle = '#b9ccd1'; P.textBaseline = 'middle';
      P.fillText('舟', 980, 560);
      P.restore();
      photo(P, 'm_rower', px, py, pw, ph, { fx: 0.55, fy: 0.62, zoom: 1.15 + lt * 0.02, filter: GRAYC(1.3) });
      rect(I, px - 1, py - 1, pw + 2, ph + 2, ink(K), 1);
      const bx = px + pw * 0.56, by = py + ph * 0.7;
      I.save(); I.strokeStyle = ink(A); I.lineWidth = 1.5;
      I.beginPath(); I.arc(bx, by, 22, 0, Math.PI * 2); I.moveTo(bx + 20, by - 8); I.lineTo(bx + 330, by - 200); I.lineTo(bx + 470, by - 200); I.stroke(); I.restore();
      const a = clamp((t - charT(L, 5)) / 0.15);
      text(I, '小舟', bx + 340, by - 212, { font: `800 44px ${FONT.min}`, color: ink(A), alpha: a });
      text(I, 'kobune — a small boat', bx + 340, by - 170, { font: `italic 400 22px ${FONT.serif}`, color: ink(K), alpha: a });
      lyricH(I, L, t, px, py + ph + 90, 40, { color: ink(K), weight: 400 });
      caption(I, ['fig.12 — a rower in the fog', 'photograph, CC0'], px, py - 30, { size: 13 });
      cropMarks(I, px, py, pw, ph, 18, 8, ink(K), 1);
      enCaption(I, L, W - 60, H - 40, { size: 24, align: 'right' });
      folio(I, X, { side: 'right', head: '二　客観と主観' });
      react(F, X, 0.5);
    },
  },
  {
    name: 'v:oborete', t0: VA[6].t, t1: nextT(6),
    draw(C, X) {
      const { P, I, F } = C;
      const t = X.t, L = VA[6];
      const lt = t - L.t, dur = nextT(6) - L.t;
      F.mode = 4; F.duoInk = 2; F.duo = [0.38, 1, 0.0, 0.72]; F.inkA = '#e8352e'; F.inkB = '#0b7f86'; F.cell = 6;
      F.wet = 0.1 + 0.55 * clamp(lt / dur);
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      photo(P, 'm_float_white', 0, 0, W, H, { fx: 0.45, fy: 0.42, zoom: 1.25 + 0.12 * clamp(lt / dur), filter: GRAYC(1.25, 1.1) });
      const cols = [
        { s: '溺れて', i: 0, x: 1760, size: 110, sink: true },
        { s: '忘れる', i: 3, x: 1600, size: 110, strike: true },
        { s: '愛', i: 6, x: 1330, size: 330, color: ink(A) },
        { s: 'と', i: 7, x: 1180, size: 90 },
        { s: '汚辱', i: 8, x: 1000, size: 230 },
        { s: 'のうちに', i: 10, x: 760, size: 70 },
      ];
      for (const c of cols) {
        const tc = charT(L, c.i);
        if (t < tc) continue;
        const d = t - tc;
        const a = ease.out3(clamp(d / 0.1));
        let y = 110;
        if (c.sink) y += ease.in2(clamp(d / 3.5)) * 520;
        const n = [...c.s].length;
        if (c.color) vtext(I, c.s, c.x, y, c.size, { color: c.color, weight: 800, reveal: n * a, seed: 3 });
        else vtext(P, c.s, c.x, y, c.size, { color: '#ffffff', weight: 800, reveal: n * a, jitter: c.s === '汚辱' ? X.snare * 14 : 0, seed: 3 });
        if (c.strike && d > 0.35) {
          const sp = clamp((d - 0.35) / 0.25);
          const len = n * c.size * 1.05;
          line(I, c.x, y - 10, c.x, y - 10 + (len + 20) * sp, 6, ink(A));
          vtext(I, 'トル', c.x - c.size * 0.9, y + len * sp - 70, 34, { color: ink(A), weight: 800, alpha: sp });
        }
      }
      caption(I, ['fig.13 — she floats, in white (CC0)'], 60, H - 70, { size: 13, color: ink(K) });
      enCaption(I, L, 60, 70, { size: 24 });
      folio(I, X, { side: 'right', head: '二　客観と主観' });
      shake(F, X, 0.8, 7);
      react(F, X, 1.1);
    },
  },
  {
    // the first time the page itself goes into the sea: the camera pulls back from the spread, it floats, it sinks
    name: 'v:umiNaka', t0: VA[7].t, t1: barT(24),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, L = VA[7], t0 = L.t, t1 = barT(24);
      const u = clamp((t - t0) / (t1 - t0));
      F.mode = 4; F.duoInk = 2; F.duo = [0.36, 1, 0.0, 0.7]; F.inkA = '#e8352e'; F.inkB = '#0b7f86'; F.cell = 6;
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      photo(P, 'm_float_white', 0, 0, W, H, { fx: 0.45, fy: 0.42, zoom: 1.37, filter: GRAYC(1.25, 1.1) });
      lyricV(P, L, t, W / 2 + 60, 180, 140, { color: '#ffffff', ruby: false });
      text(P, 'i am in the sea', W / 2 - 40, H - 90, { font: `italic 400 30px ${FONT.serif}`, color: '#ffffff', align: 'right' });
      // the 3D sea, with the printed page on it
      seaOn(C, ['night'], { light: false, grain: 0.05, vig: 0.45 });
      S.pageIn3D = true;
      S.moonDir = [0.1, 0.55, -0.8];
      const sink = ease.in2(clamp((u - 0.25) / 0.75));
      const pageY = C.seaH(0, 0) + 0.04 - sink * 3.2;
      const tiltA = sink * 0.35;
      S.cards = [{ page: true, c: [0, pageY, 0], u: [1.6, 0, 0], v: [0, Math.sin(tiltA) * 0.9, -Math.cos(tiltA) * 0.9], alpha: 1, glow: 1.6 * (1 - sink) }];
      const k = [
        [t0, cam([0, 1.75, 0.0], 0, -Math.PI / 2 + 0.001, 0, 58)],
        [t0 + (t1 - t0) * 0.4, cam([0, 2.6, 2.3], 0, -0.95, 0.04, 60)],
        [t1, cam([0.4, -2.2, 3.2], -0.05, -0.12, -0.06, 66)],
      ];
      S.cam = handheld(keyed(t, k), t, 0.5, 11);
      F.xf = [1, 0, 0, 0];
      react(F, X, 0.4);
    },
  },
  // ---------------------------------------------------------------- interlude: under water, rising
  {
    name: 'inter:deep', t0: barT(24), t1: barT(26),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, lt = t - barT(24), dur = barT(26) - barT(24);
      seaOn(C, ['night', 'deep'], { grain: 0.06, vig: 0.5 });
      S.moonDir = [0.1, 0.6, -0.8];
      // photographs sink slowly around us; the page we came with is still falling below
      const yc = -4 - lt * 0.4;
      S.cam = handheld(cam([0, yc, 0], 0.2 + lt * 0.05, 0.12 + 0.06 * Math.sin(lt * 0.4), 0.04, 70), t, 1, 13);
      S.cards = [
        { img: 'm_curl2', c: [-2.4, yc - 1.5 - lt * 0.15, -7], u: [1.6, 0, 0.5], v: [0, 1.6, 0], alpha: 1 },
        { img: 'm_dress_arms', c: [3.2, yc + 1.2 - lt * 0.25, -10], u: [1.4, 0, -0.4], v: [0.1, 1.65, 0], alpha: 1 },
        { img: 'm_float_white', c: [0.5, yc - 4 - lt * 0.5, -6], u: [1.6, 0, 0], v: [0, 0.3, -1.55], alpha: 1 },
      ];
      F.trail = 0.35; F.trailXf = [1.002, 0, 0, 0.0008]; F.trailMode = 0;
      F.zoomBlur = 0.012;
      const depth = 4 + lt * 0.4;
      text(I, 'DIVE LOG', 80, 110, { font: `500 15px ${FONT.mono}`, color: ink(K) });
      text(I, `depth   −${depth.toFixed(1)} m`, 80, 132, { font: `500 15px ${FONT.mono}`, color: ink(K) });
      text(I, `time    ${timecode(t)}`, 80, 154, { font: `500 15px ${FONT.mono}`, color: ink(K) });
      vtext(I, '耳の奥で海が鳴る', W - 140, 140, 44, { color: ink(K), weight: 400, reveal: 9 * clamp(lt / 2) });
      folio(I, X, { side: 'right', head: '三　海の中' });
      react(F, X, 0.3);
    },
  },
  {
    name: 'inter:strobe', t0: barT(26), t1: barT(27),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, lp = X.p.p;
      seaOn(C, ['night', 'deep'], { grain: 0.07 });
      // the drums arrive: the light shafts strobe on every hit; we start to rise
      S.under = [0.06, 0.6 + 3.5 * (X.kickF + X.snareF), 0.9, 0.06];
      const yc = -5 + lp * 1.5;
      const c = cam([0, yc, 0], 0.25 + lp * 0.4, 0.35 + lp * 0.3, 0, 72);
      rumble(c, X, 0.8, t, 15);
      S.cam = c;
      S.cards = [{ img: 'm_hand_bubbles', c: [0, yc + 3 - lp * 2, -5], u: [1.7, 0, 0], v: [0, 1.28, 0], alpha: 1, glow: X.snareF * 0.8 }];
      text(I, `−${(6 - lp * 1.5).toFixed(1)} m`, 80, H - 90, { font: `900 120px ${FONT.goth}`, color: ink(K) });
      meterTag(I, X, 80, 90);
      folio(I, X, { side: 'right', head: '三　海の中' });
      react(F, X, 1.2);
    },
  },
  {
    name: 'inter:rise', t0: barT(27), t1: barT(28),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, lp = X.p.p;
      seaOn(C, ['night'], { grain: 0.06 });
      lookMix(S, 'night', 'storm', ease.in2(lp));
      // rising faster and faster towards the moon's window; one 海 per 16th
      const r = ease.in3(lp);
      const surface = C.seaH(0, 0);
      const c = cam([0, lerp(-4.5, surface - 0.25, r), 0], 0.05, lerp(1.05, 0.25, r), 0, lerp(70, 84, r));
      rumble(c, X, 0.6 + lp, t, 17);
      S.cam = c;
      S.moonDir = [0.05, 0.9, -0.4];
      F.zoomBlur = 0.04 * r;
      const n = Math.floor(X.p.q) + 1;
      for (let i = 0; i < n; i++) {
        const cc = i % 8, rr = Math.floor(i / 8);
        vtext(I, '海', W - 150 - cc * 220, 60 + rr * 260, 200, { color: ink(i === n - 1 ? A : K), weight: 800, alpha: 0.85 });
      }
      meterTag(I, X, 80, 90);
      folio(I, X, { side: 'right', head: '四　溢れる' });
      react(F, X, 1.2);
    },
  },
];
