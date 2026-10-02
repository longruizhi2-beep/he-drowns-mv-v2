// Chapter 6 — 溺れる (the shoegaze wall, bars 33-41, 1:25.8-1:48.2). The guitar wall is the sea.
//   bar 33   in the surf, at the waterline: every kick pushes the camera under, a swell rolls over it every two beats
//   bar 34   from 26 m up, a spiral dive into the storm, onto the photographs that float on it; into the green eye
//   bar 35   the frame splits along a vertical waterline that jumps on every beat: above | below
//   bar 36   four strips, four cameras, each drowning at its own pace; the strip of the beat is the widest
//   blink    (1:36.43, the band thins) a printed eye closes
//   37-40    plunging through a well of photographs; 海 is taken apart in light: 海 = 氵 + 毎, and 毎 ⊃ 母
//   bar 41   (2/4) collapse into a point; silence before the stab
// Miyoshi's line types itself out on the right the whole time; on the last 16th of each bar a page flashes by.
import { W, H, react, flash, barT, at, clamp, ease, hash, lerp, text, vtext, ink, K, A, FONT, caption, GRAYC,
  folio, P16, line, rect, meterTag, timecode, photo, seaOn, cam, handheld, rumble, floatCard, lightning } from './common.js';
import { storm } from './chorusA.js';
import { eyePath } from '../draw.js';
import { env } from '../timing.js';
import { basis } from '../sea.js';

const T0 = barT(33), T1 = barT(42);
const BLINK0 = 96.43, BLINK1 = 96.985;
const KANJI = 97.0;
const DARK = 107.92;
const HEAD = '六　溺れる';
const ASP = (n) => (window.IMAGES && window.IMAGES[n] ? window.IMAGES[n].h / window.IMAGES[n].w : 0.66);

// the photographs of the earlier pages, now in the water
const MEM = ['m_she_sea', 'm_hand_shell', 'm_lips_kiss', 'm_iris', 'm_rower', 'm_float_white', 'm_couple2', 'm_redmoon',
  'm_dress_arms', 'm_curl2', 'm_hand_bubbles', 'm_lips_pop', 'm_jelly_dark2', 'm_pool_pull', 'm_shinjuku', 'm_aquarium_child',
  'm_freediver2', 'm_walk_turq', 'm_bubble_ring', 'm_pool_plunge', 'm_sun_diver', 'm_aquarium_crowd', 'm_shibuya', 'm_ginza'];
const FLASHES = ['m_iris', 'm_lips_pop', 'm_she_sea', 'm_hand_shell', 'm_redmoon', 'm_float_white', 'm_couple2', 'm_rower'];

// a photograph lying on the water at (x, z), tossed by the waves
function floating(C, name, x, z, w, yaw, glow = 0.3) {
  const k = floatCard(C.seaH, x, z, w, w * ASP(name), yaw, 0.05);
  return { img: name, c: k.c, u: k.u, v: k.v, alpha: 1, glow };
}
// a photograph hanging in the water, oriented like a camera would be (it faces along yaw / pitch)
function hanging(name, c, w, yaw, pitch, roll, glow = 0.3) {
  const [, R, U] = basis({ yaw, pitch, roll });
  const h = w * ASP(name);
  return { img: name, c, u: R.map((v) => v * w), v: U.map((v) => v * h), alpha: 1, glow };
}

// ---------------------------------------------------------------- glyph analysis (for 海 = 氵 + 毎, 毎 ⊃ 母)
const G = {};
function glyph(ch, size = 600) {
  const key = ch + size;
  if (G[key]) return G[key];
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(size * 1.4);
  const x = c.getContext('2d');
  x.font = `800 ${size}px Shippori, serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#fff';
  x.fillText(ch, c.width / 2, c.height / 2);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const colInk = new Float32Array(c.width), rowInk = new Float32Array(c.height);
  let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
    const v = d[(j * c.width + i) * 4 + 3];
    if (v > 60) { colInk[i] += 1; rowInk[j] += 1; if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  }
  const g = { c, bb: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], colInk, rowInk, size };
  G[key] = g;
  return g;
}
// split column of 海 between 氵 and 毎 (emptiest column in the left half)
function splitCol(g) {
  const [x0, , w] = g.bb;
  let best = x0 + w * 0.3, bv = 1e9;
  for (let i = Math.floor(x0 + w * 0.22); i < x0 + w * 0.45; i++) if (g.colInk[i] < bv) { bv = g.colInk[i]; best = i; }
  return best;
}
// split row of 毎 between 𠂉 and 母 (emptiest row in the upper part)
function splitRow(g) {
  const [, y0, , h] = g.bb;
  let best = y0 + h * 0.25, bv = 1e9;
  for (let j = Math.floor(y0 + h * 0.12); j < y0 + h * 0.4; j++) if (g.rowInk[j] < bv) { bv = g.rowInk[j]; best = j; }
  return best;
}
// draw glyph canvas region src=[sx,sy,sw,sh] (in glyph canvas px) into dst rect, tinted (tinted copies are cached)
function tinted(g, color) {
  g.tint = g.tint || {};
  if (!g.tint[color]) {
    const c = document.createElement('canvas');
    c.width = g.c.width; c.height = g.c.height;
    const x = c.getContext('2d');
    x.drawImage(g.c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    g.tint[color] = c;
  }
  return g.tint[color];
}
function blit(ctx, g, src, dst, color, alpha = 1) {
  if (alpha <= 0 || src[2] < 1 || src[3] < 1) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(tinted(g, color), src[0], src[1], src[2], src[3], dst[0], dst[1], dst[2], dst[3]);
  ctx.restore();
}

// build the glyph analyses and tinted copies before playback (the first use would otherwise stall a frame)
export function prewarmWall() {
  for (const ch of ['海', '氵', '毎', '母']) { const g = glyph(ch); tinted(g, ink(K)); tinted(g, ink(A)); }
}

// ---------------------------------------------------------------- stream of consciousness
const STREAM = '海よ、僕らの使ふ文字では、お前の中に母がゐる。そして母よ、仏蘭西人の言葉では、あなたの中に海がある。' +
  '　——三好達治「郷愁」　羊水。三十六度五分。耳の奥で心臓が波を打つ。忘れる。忘れる。わすれる。';
function stream(I, t, alpha = 1) {
  const all = [...STREAM];
  const nch = clamp(Math.floor(((t - T0) / P16) * 0.9), 0, all.length);
  const per = 17, size = 38;
  for (let ci = 0; ci * per < nch; ci++) {
    const x = W - 96 - ci * size * 1.5;
    if (x < W * 0.6) break;
    vtext(I, all.slice(ci * per, Math.min(nch, (ci + 1) * per)).join(''), x, 96, size, { color: ink(ci % 5 === 4 ? A : K, alpha), weight: 400, gap: 0.08 });
  }
}

// ---------------------------------------------------------------- the surf (bar 33, and the left half of bar 35)
function surfCam(C, X, t, seed, yaw = 0) {
  const lt = t - T0;
  const c = cam([0, C.seaBase(0, 0) + 0.5 - X.kick * 1.15, 0], yaw + 0.15 * Math.sin(lt * 0.9), 0.06, 0.25 * Math.sin(lt * 1.7), 82);
  handheld(c, t, 1.6, seed);
  rumble(c, X, 1.8, t, seed);
  return c;
}
function surfSea(C, X, t, t0) {
  const { S } = C;
  storm(C, X, [t0 + 0.01, t0 + 8 * P16], { rain: 1 });
  S.wave = [2.0, 2.8, 0.11, 1.0];
  S.moonDir = [0.3, 0.12, -1]; S.moon = [0.05, 0.6, 1.0, 0];
  S.city = 1.2; S.cityAz = [-1.2, -0.3];
  const per = 8 * P16, ph = ((t - t0) % per) / per;   // a swell rolls over the camera every two beats
  S.swell = [0, 0, 4.2, 5]; S.swell2 = [0, 1, lerp(-34, 14, ph), 0.75];
  S.under = [0.08, 1.8 + 3 * X.snareF, 1.8, 0.05];
  S.cards = [floating(C, 'm_she_sea', -2.2, -5, 1.1, 0.4), floating(C, 'm_hand_shell', 2.6, -8, 1.2, -0.6),
    floating(C, 'm_lips_kiss', 0.4, -12, 1.4, 0.2), floating(C, 'm_iris', -5, -15, 1.6, -0.3)];
}
// underwater, looking up at the storm through the surface
function belowCam(C, X, t, seed) {
  const lt = t - T0;
  const c = cam([0.5, C.seaBase(0.5, -1) - 3.2 + Math.sin(lt * 2) * 0.4, -1], 0.3 + lt * 0.2, 0.95, lt * 0.5, 74);
  handheld(c, t, 1.2, seed);
  rumble(c, X, 1, t, seed);
  return c;
}
function aerialCam(C, X, t, seed) {
  const lt = t - T0;
  const c = cam([Math.sin(lt * 0.5) * 3, 13, -4], lt * 0.3, -1.2, 0.1, 60);
  handheld(c, t, 1, seed);
  rumble(c, X, 1.2, t, seed);
  return c;
}

// ---------------------------------------------------------------- the well of photographs (bars 37-41)
function wellDepth(t) {
  const d = Math.max(0, t - BLINK1);
  const c = Math.max(0, t - barT(41));
  return 8 + d * 6.5 + c * c * 14;
}
function well(camY) {
  const cards = [];
  const sp = 2.2;
  const i0 = Math.floor((-camY - 1) / sp);
  for (let i = i0; i < i0 + 14 && cards.length < 6; i++) {
    const y = -1 - i * sp;
    if (y > camY - 0.5) continue;           // already above the lens
    const a = hash(i, 11) * Math.PI * 2, r = 1.5 + hash(i, 12) * 3;
    cards.push(hanging(MEM[i % MEM.length], [Math.cos(a) * r, y, Math.sin(a) * r], 0.9 + hash(i, 13) * 0.8,
      hash(i, 14) * 6.28, -1.5708 + (hash(i, 15) - 0.5) * 1.1, (hash(i, 16) - 0.5) * 0.7, 0.75));
  }
  return cards;
}

// 海 = 氵 + 毎 ; 毎 ⊃ 母 — drawn in light at (cx, cy)
function kanji(I, t, cx, cy, S, collapse) {
  const kt = t - KANJI;
  const gU = glyph('海'), gS = glyph('氵'), gM = glyph('毎'), gB = glyph('母');
  const [ux, uy, uw, uh] = gU.bb;
  const split = splitCol(gU);
  const toScr = (px, py) => [cx + (px - gU.c.width / 2) * S, cy + (py - gU.c.height / 2) * S];
  const [lx0, ly0] = toScr(ux, uy), [sx1] = toScr(split, uy), [rx1, ry1] = toScr(ux + uw, uy + uh);
  const leftR = [lx0, ly0, sx1 - lx0, ry1 - ly0];
  const rightR = [sx1, ly0, rx1 - sx1, ry1 - ly0];
  const inA = ease.out3(clamp(kt / 0.15));
  const sep = ease.inout3(clamp((t - barT(38)) / 0.8));   // 氵 leaves
  const lift = ease.inout3(clamp((t - barT(39)) / 0.9));  // 𠂉 lifts off 毎 -> 母
  const red = clamp((t - barT(40)) / 0.4);
  const col = ink(K), fade = 1 - collapse;
  if (sep <= 0) {
    blit(I, gU, [ux, uy, uw, uh], [lx0, ly0, rx1 - lx0, ry1 - ly0], col, inA * fade);
    return;
  }
  // 氵 drifts left and dissolves into three rising drops
  const [sx, sy, sw, sh] = gS.bb;
  const off = sep * 260 * S;
  blit(I, gS, [sx, sy, sw, sh], [leftR[0] - off, leftR[1] + leftR[3] * 0.02, leftR[2], leftR[3] * 0.96], col, (1 - sep * 0.85) * fade);
  for (let d = 0; d < 3; d++) {
    const age = Math.max(0, t - barT(38) - 0.5 - d * 0.35);
    if (age <= 0) continue;
    const bx = leftR[0] - off + leftR[2] * (0.35 + d * 0.12), by = leftR[1] + leftR[3] * (0.2 + d * 0.3) - age * 160;
    I.save(); I.strokeStyle = ink(K, 0.9 * fade); I.lineWidth = 3;
    I.beginPath(); I.arc(bx + Math.sin(age * 3 + d) * 12, by, (14 + d * 3) * S, 0, Math.PI * 2); I.stroke(); I.restore();
  }
  // 毎 widens into its own square, then its top (𠂉) lifts away revealing 母
  const [mx, my, mw, mh] = gM.bb;
  const full = [cx - mw * S * 0.5 + 60 * S, ly0, mw * S, rightR[3]];
  const R = [lerp(rightR[0], full[0], sep), rightR[1], lerp(rightR[2], full[2], sep), rightR[3]];
  const srow = splitRow(gM);
  const topFrac = (srow - my) / mh;
  blit(I, gM, [mx, my, mw, srow - my], [R[0], R[1] - lift * 240 * S, R[2], R[3] * topFrac], col, (1 - lift) * fade);
  blit(I, gM, [mx, srow, mw, my + mh - srow], [R[0], R[1] + R[3] * topFrac, R[2], R[3] * (1 - topFrac)], col, (1 - lift) * fade);
  if (lift > 0) {
    const [bx, by, bw, bh] = gB.bb;
    const tgt = [R[0], R[1] + R[3] * topFrac * (1 - lift), R[2], R[3] * (1 - topFrac * (1 - lift))];
    blit(I, gB, [bx, by, bw, bh], tgt, col, lift * (1 - red) * fade);
    if (red > 0) blit(I, gB, [bx, by, bw, bh], tgt, ink(A), red);
  }
}

export const wall = [{
  name: 'wall', t0: T0, t1: T1,
  draw(C, X) {
    const { P, I, F, S } = C;
    const t = X.t, bi = X.p.bi, gi = X.p.gi;
    const loud = env('loud', t);
    if (t < BLINK0) {
      // ================================================================ above / at / under the surface
      if (bi === 33) {
        surfSea(C, X, t, barT(33));
        S.cam = surfCam(C, X, t, 41);
        F.zoomBlur = 0.04 * X.kick;
        text(I, `${(S.cam.pos[1] - C.seaH(S.cam.pos[0], S.cam.pos[2])).toFixed(2)} m`, 80, H - 96, { font: `900 64px ${FONT.goth}`, color: ink(K) });
        text(I, '水面からの高さ — height above the water', 84, H - 56, { font: `500 14px ${FONT.mono}`, color: ink(K) });
      } else if (bi === 34) {
        // the dive: from 26 m, spiralling down onto the photographs on the water, into the eye
        const u = clamp((t - barT(34)) / (barT(35) - barT(34)));
        storm(C, X, [barT(34) + 0.01, at(34, 8)], { rain: 0.9 });
        S.wave = [1.7, 2.9, 0.12, 1.0];
        S.moonDir = [0.3, 0.5, -1]; S.moon = [0.05, 0.7, 1.2, 0];
        S.under = [0.08, 1.8 + 3 * X.snareF, 1.8, 0.05];
        const e = ease.in3(u);
        const c = cam([Math.sin(u * 3) * 1.5 * (1 - e), lerp(26, -1.2, e), 0.4 + Math.cos(u * 3) * 1.5 * (1 - e)], u * 1.8, lerp(-1.5707, -1.32, e), 0, lerp(56, 96, e));
        handheld(c, t, 0.8, 43);
        rumble(c, X, 1 + e, t, 43);
        S.cam = c;
        const lay = [['m_iris', 0, 0.4, 1.5, 0.1], ['m_she_sea', -5.2, -3.0, 3.0, -0.2], ['m_lips_pop', 4.8, 3.4, 2.7, 0.35],
          ['m_rower', 5.6, -4.4, 2.6, 0.1], ['m_hand_shell', -4.6, 4.6, 2.6, -0.4], ['m_float_white', 0.6, -7.6, 2.8, 0.2]];
        S.cards = lay.map(([n, x, z, w, yaw]) => floating(C, n, x, z, w, yaw, 0.6));
        const alt = c.pos[1] - C.seaH(c.pos[0], c.pos[2]);
        // top-down viewfinder
        I.save(); I.strokeStyle = ink(K, 0.8); I.lineWidth = 1;
        I.beginPath(); I.moveTo(W / 2 - 40, H / 2); I.lineTo(W / 2 + 40, H / 2); I.moveTo(W / 2, H / 2 - 40); I.lineTo(W / 2, H / 2 + 40); I.stroke();
        I.strokeRect(W / 2 - 260, H / 2 - 260, 520, 520); I.restore();
        text(I, `${alt >= 0 ? '+' : '−'}${Math.abs(alt).toFixed(1)} m`, 80, H - 96, { font: `900 64px ${FONT.goth}`, color: ink(alt >= 0 ? K : A) });
        text(I, '高度 — altitude / fig.24 — the pages, afloat in the storm', 84, H - 56, { font: `500 14px ${FONT.mono}`, color: ink(K) });
        F.zoomBlur = 0.03 * X.kick + 0.12 * ease.in3(clamp((u - 0.85) / 0.15));
      } else {
        // the frame splits: bar 35 along a jumping vertical waterline, bar 36 into four strips
        surfSea(C, X, t, barT(bi));
        const views = [];
        if (bi === 35) {
          const xs = [0.5, 0.36, 0.64, 0.5];
          const prev = xs[(gi + 3) % 4], cur = xs[gi];
          const gx = W * lerp(prev, cur, ease.out5(clamp((t - (barT(35) + gi * 4 * P16)) / 0.09)));
          views.push({ rect: [0, 0, gx, H], cam: surfCam(C, X, t, 45, -0.2) });
          views.push({ rect: [gx, 0, W - gx, H], cam: belowCam(C, X, t, 46) });
          line(I, gx, 0, gx, H, 2, ink(K));
          text(I, '此岸 — above', gx - 24, 70, { font: `500 14px ${FONT.mono}`, color: ink(K), align: 'right' });
          text(I, 'below — 彼岸', gx + 24, 70, { font: `500 14px ${FONT.mono}`, color: ink(K) });
        } else {
          const cams = [surfCam(C, X, t, 47, 0.3), belowCam(C, X, t, 48), aerialCam(C, X, t, 49), surfCam(C, X, t + 0.37, 50, -0.5)];
          const wts = [1, 1, 1, 1].map((v, i) => (i === Math.min(gi, 3) ? 2.2 : 1));
          const sum = wts.reduce((a, b) => a + b, 0);
          let x = 0;
          cams.forEach((cc, i) => {
            const w = (wts[i] / sum) * W;
            if (i === gi) cc.fov *= 1 - 0.12 * X.kick;
            views.push({ rect: [x, 0, w, H], cam: cc });
            if (i) line(I, x, 0, x, H, 2, ink(K));
            text(I, ['surface', 'below', 'above', 'surface'][i], x + 16, 70, { font: `500 14px ${FONT.mono}`, color: ink(i === gi ? A : K) });
            x += w;
          });
        }
        S.views = views;
        S.cam = views[0].cam;
        F.zoomBlur = 0.03 * X.kick;
      }
      stream(I, t);
      F.trail = 0.18; F.trailXf = [1.004, 0, 0, 0]; F.trailMode = 2;
      // a page flashes by on the last 16th of every bar
      const b = X.p.b;
      if (b && X.p.q >= b.len - 1 && t < BLINK0 - 0.2) {
        P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
        photo(P, FLASHES[(bi - 33) % FLASHES.length], 0, 0, W, H, { filter: GRAYC(1.4) });
        F.neg = 1; F.mode = 2; F.monoInk = 0; F.cell = 7; F.trail = 0; F.zoomBlur = 0;
      }
    } else if (t < BLINK1) {
      // ================================================================ the blink: a printed eye closes
      const e = 1 - ease.inout3(clamp((t - BLINK0) / 0.32));
      P.fillStyle = '#1d1b1c'; P.fillRect(0, 0, W, H);
      if (e > 0.01) {
        P.save(); eyePath(P, W / 2, H / 2, 1500, 560, e); P.clip();
        photo(P, 'm_iris', 0, H / 2 - 600, W, 1200, { fx: 0.5, fy: 0.5, zoom: 1.1, filter: GRAYC(1.3, 1.05) });
        P.restore();
      }
      F.mode = 4; F.duoInk = 2; F.duo = [0.4, 1, 0.05, 0.75]; F.inkB = '#00a95c'; F.cell = 6; F.inkLight = 1;
      text(I, '1:36.43 — the band thins; the eye closes', 80, H - 60, { font: `500 14px ${FONT.mono}`, color: ink(K), alpha: e });
    } else {
      // ================================================================ the well of photographs; 海 ⊃ 母
      seaOn(C, ['storm', 'deep'], { light: true, grain: 0.07, vig: 0.55 });
      S.lightning = lightning(X, [KANJI + 0.02], 1.2, S);
      S.under = [0.05, 1.3 + 3.5 * X.snareF, 1.5, 0.012];
      const collapse = ease.in3(clamp((t - barT(41)) / (DARK - barT(41))));
      const camY = -wellDepth(t);
      const d = t - BLINK1;
      const c = cam([0, camY, 0], d * 0.22, -1.38, d * 0.12, 72 + collapse * 30);
      handheld(c, t, 0.8, 51);
      rumble(c, X, 0.7, t, 51);
      S.cam = c;
      S.cards = well(camY);
      F.zoomBlur = 0.018 + 0.03 * X.kick + 0.32 * collapse;
      F.trail = 0.3; F.trailXf = [1.006, 0, 0, 0]; F.trailMode = 2;
      const sc = 1.0 * (1 - collapse * 0.97);
      kanji(I, t, W / 2, H * 0.47, sc, 0);
      stream(I, t, 0.55 * (1 - collapse));
      const ann = (s, tt, x, y, o = {}) => { if (t >= tt) text(I, s, x, y, { font: o.font || `400 30px ${FONT.min}`, color: o.color || ink(K), alpha: ease.out3(clamp((t - tt) / 0.2)) * (1 - collapse) }); };
      ann('海 ＝ 氵 ＋ 毎', barT(38) + 0.3, 90, 150, { font: `800 44px ${FONT.min}` });
      ann('毎 ⊃ 母', barT(39) + 0.5, 90, 215, { font: `800 44px ${FONT.min}` });
      ann('お前の中に母がゐる。', barT(39) + 1.0, 90, 272);
      ann('la mer  ⊂  la mère', barT(40) + 0.2, 90, 340, { font: `italic 400 44px ${FONT.serif}`, color: ink(A) });
      ann('He drowns in the She.', barT(40) + 1.2, 90, 396, { font: `italic 400 32px ${FONT.serif}` });
      text(I, `−${(-camY).toFixed(1)} m`, 80, H - 96, { font: `900 64px ${FONT.goth}`, color: ink(K), alpha: 1 - collapse });
      text(I, `水深 depth / 水温 ${(36.5 - Math.min(20, -camY * 0.1)).toFixed(1)}℃ / ${timecode(t)}`, 84, H - 56, { font: `500 14px ${FONT.mono}`, color: ink(K), alpha: 1 - collapse });
      if (t >= DARK) F.flash = [0.02, 0.02, 0.03, 1];
    }
    if (t >= BLINK1 - 0.02 && t < BLINK1 + 0.12) flash(F, t, BLINK1, 0.12, [1, 1, 1], 0.6);
    meterTag(I, X, 80, 90);
    folio(I, X, { side: 'right', head: HEAD });
    react(F, X, 0.9 + loud * 0.3);
  },
}];
