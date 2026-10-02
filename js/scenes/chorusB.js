// Chapter 10 — 月は赤 (chorus B, bars 76-83, 2:52.5-3:13.6): the climax. Three walls of water, each bigger than the
// last, and each takes more with it: the photographs of the earlier pages, then the camera, then this shore (the city
// on the horizon goes dark). Between them: the warm fall, a rain of photographs; the red moon seen from under the sea;
// the contact sheet of every picture drowned by a rising waterline; the red moon at the end of a long lens.
import { W, H, react, flash, barT, at, clamp, ease, hash, lerp, text, vtext, ink, K, A, FONT, caption, photo, GRAYC,
  folio, lyricV, enCaption, P16, line, rect, timecode, seaOn, cam, handheld, rumble, floatCard, project, lookMix,
  gauge, depthRuler, lightning } from './common.js';
import { LINES } from '../lyrics.js';
import { wobbleCircle } from '../draw.js';
import { swellJS, basis } from '../sea.js';
import { storm, spill, callout } from './chorusA.js';

const CB = LINES.slice(21, 31);
const nextT = (i) => (i + 1 < CB.length ? CB[i + 1].t : barT(84));
const charT = (L, i) => L.chars[Math.min(i, L.chars.length - 1)].t;
const HEAD = '十　月は赤';
const ASP = (n) => (window.IMAGES && window.IMAGES[n] ? window.IMAGES[n].h / window.IMAGES[n].w : 0.66);
const MEM = ['m_she_sea', 'm_iris', 'm_lips_pop', 'm_hand_shell', 'm_couple2', 'm_float_white', 'm_rower', 'm_redmoon',
  'm_dress_arms', 'm_curl2', 'm_hand_bubbles', 'm_lips_kiss', 'm_jelly_dark2', 'm_pool_pull', 'm_shinjuku', 'm_aquarium_child',
  'm_freediver2', 'm_walk_turq', 'm_bubble_ring', 'm_pool_plunge', 'm_sun_diver', 'm_aquarium_crowd', 'm_shibuya', 'm_ginza'];

function floating(C, name, x, z, w, yaw, glow = 0.35) {
  const k = floatCard(C.seaH, x, z, w, w * ASP(name), yaw, 0.05);
  return { img: name, c: k.c, u: k.u, v: k.v, alpha: 1, glow };
}
function hanging(name, c, w, yaw, pitch, roll, glow = 0.4) {
  const [, R, U] = basis({ yaw, pitch, roll });
  const h = w * ASP(name);
  return { img: name, c, u: R.map((v) => v * w), v: U.map((v) => v * h), alpha: 1, glow };
}
// photographs hanging in the water at fixed depths; the camera falls past them
function rainOfPictures(camY, seed, up = true) {
  const cards = [];
  const sp = 2.6;
  const i0 = Math.floor((-camY - 1) / sp) - (up ? 5 : 0);
  for (let i = Math.max(0, i0); i < i0 + 16 && cards.length < 6; i++) {
    const y = -1 - i * sp;
    if (Math.abs(y - camY) < 0.6) continue;
    const a = hash(i, seed) * Math.PI * 2, r = 1.4 + hash(i, seed + 1) * 2.8;
    cards.push(hanging(MEM[(i + seed) % MEM.length], [Math.cos(a) * r, y, Math.sin(a) * r], 0.8 + hash(i, seed + 2) * 0.7,
      hash(i, seed + 3) * 6.28, -1.5708 + (hash(i, seed + 4) - 0.5) * 1.2, (hash(i, seed + 5) - 0.5) * 0.8, 0.6));
  }
  return cards;
}
// the overflowing grid of 海, one more cell per 16th, laid out from the top right, past the edge of the frame
function overflow(I, t, t0, cell, alpha, per = 2, o = {}) {
  const n = Math.max(0, Math.floor(((t - t0) / P16) * per) + 1);
  const cols = Math.ceil(W / cell) + 2;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const x = W + cell * 0.6 - c * cell;
    const y = -cell * 0.25 + r * cell * 1.02 + (o.dy || 0);
    vtext(I, '海', x, y, cell * 0.96, { color: i === n - 1 ? ink(A) : ink(K, alpha), weight: 800, reveal: 1 });
  }
}
function redMoon(S, dir, r = 0.07) {
  S.moonDir = dir; S.moon = [r, 1.0, 1.9, 1]; S.moonCol = '#ff4a2e';
}

// ---------------------------------------------------------------- the three walls
// 1: the wall comes at the camera with the red moon behind it and the photographs on its face
function wall1(C, X, L) {
  const { I, F, S } = C;
  const t = X.t, t0 = L.t;
  const tAfu = charT(L, 2), tKare = charT(L, 5), tNomu = charT(L, 7);
  storm(C, X, [t0 + 0.02, tAfu, tKare, tNomu - 0.04], { rain: 1 });
  redMoon(S, [0.05, 0.13, -1], 0.075);
  S.city = 1.6; S.cityAz = [-0.6, 0.6];
  const u = clamp((t - t0) / (tNomu - t0));
  const zc = lerp(-60, -6.4, u) + Math.max(0, t - tNomu) * 33;
  const amp = lerp(4, 12, ease.in2(u));
  S.swell = [0, 0, amp, 9]; S.swell2 = [0, 1, zc, 0.85];
  const under = ease.out3(clamp((t - tNomu) / 0.8));
  const c = cam([0, 0, 0], under * 0.6, 0, under * 1.6, lerp(70, 90, ease.in2(u)) + under * 8);
  c.pos[1] = C.seaBase(0, 0) + 1.3 - under * 4.5;
  c.pitch = 0.05 + 0.5 * ease.in3(u) - under * 1.2;
  handheld(c, t, 1.4, 101);
  rumble(c, X, 1.4 + 0.8 * u + under * 0.6, t, 101);
  S.cam = c;
  S.under = [0.07, 1.8 + 3.5 * X.snareF, 1.8, 0.05];
  // the photographs of the earlier pages float ahead; the wall lifts them, then buries them
  const lay = [['m_she_sea', -3.5, -12], ['m_iris', 2.6, -16], ['m_lips_pop', -1.0, -21], ['m_hand_shell', 4.5, -26], ['m_couple2', -5.5, -30], ['m_float_white', 1.2, -9]];
  S.cards = lay.map(([n, x, z], i) => {
    const k = floating(C, n, x, z, 1.5, (hash(i, 3) - 0.5) * 0.8, 0.5);
    const buried = ease.in2(clamp((zc - z) / 6));
    k.c[1] -= buried * 7;
    return k;
  });
  overflow(I, t, t0, 150, 0.32 * (1 - under), 2, { dy: under * 1400 });
  lyricV(I, L, t, 150, 110, 92, { color: ink(K) });
  gauge(I, W - 90, 930, 330, 0, 14, under > 0.02 ? 15 : amp, { step: 1, lab: 2, label: '波高 / m', readout: under > 0.02 ? 'H > 14 m' : `H ${amp.toFixed(1)} m` });
  caption(I, ['fig.47 — the third time: the wall, the moon behind it', `${timecode(t)}   wind 31 m/s`], 70, H - 92, { size: 13 });
  flash(F, t, t0, 0.22, [1, 1, 1], 0.9);
  flash(F, t, tNomu, 0.16, [1, 0.6, 0.55], 0.8);
  F.zoomBlur = 0.03 * X.kick + (t > tNomu ? 0.14 * (1 - clamp((t - tNomu) / 0.6)) : 0);
}
// 2: seen from 40 m up, a swell crosses the sea; the camera dives into its crest as it passes below
function wall2(C, X, L) {
  const { I, F, S } = C;
  const t = X.t, t0 = L.t;
  const tAfu = charT(L, 2), tKare = charT(L, 5), tNomu = charT(L, 7);
  storm(C, X, [t0 + 0.02, tKare, tNomu], { rain: 0.9 });
  redMoon(S, [0.4, 0.45, -1], 0.06);
  const u = clamp((t - t0) / (tNomu - t0));
  const xc = lerp(-45, 0, u) + Math.max(0, t - tNomu) * 22;
  S.swell = [0, 0, 10, 8]; S.swell2 = [1, 0, xc, 0.75];
  const e = ease.in3(u);
  const crestY = C.seaBase(0, 0) + swellJS(0, 0, S);
  const yTop = 42;
  const after = Math.max(0, t - tNomu);
  const y = t < tNomu ? lerp(yTop, crestY + 0.8, e) : crestY + 0.8 - after * 9;
  const c = cam([0, y, 0], u * 2.2 + after * 2, -1.5707 + 0.25 * e, 0.2 * e, lerp(58, 100, e));
  handheld(c, t, 0.8, 103);
  rumble(c, X, 1 + 1.2 * e, t, 103);
  S.cam = c;
  S.under = [0.07, 1.8 + 3.5 * X.snareF, 1.8, 0.05];
  const lay = [['m_rower', -4, 3], ['m_redmoon', 5, -4], ['m_dress_arms', -7, -6], ['m_iris', 3.5, 6], ['m_curl2', 8, 2], ['m_she_sea', -2, -9]];
  S.cards = lay.map(([n, x, z], i) => floating(C, n, x, z, 2.2, hash(i, 9) * 3, 0.6));
  const alt = y - C.seaH(0, 0);
  text(I, `${alt >= 0 ? '+' : '−'}${Math.abs(alt).toFixed(1)} m`, 80, H - 96, { font: `900 64px ${FONT.goth}`, color: ink(alt >= 0 ? K : A) });
  text(I, '高度 — altitude, over the second wall', 84, H - 56, { font: `500 14px ${FONT.mono}`, color: ink(K) });
  I.save(); I.strokeStyle = ink(K, 0.8); I.lineWidth = 1;
  I.beginPath(); I.moveTo(W / 2 - 40, H / 2); I.lineTo(W / 2 + 40, H / 2); I.moveTo(W / 2, H / 2 - 40); I.lineTo(W / 2, H / 2 + 40); I.stroke();
  I.strokeRect(W / 2 - 300, H / 2 - 300, 600, 600); I.restore();
  spill(I, '溢', 1500, 470, 820, t, tAfu, ink(A, 0.85), { max: 4 });
  lyricV(I, L, t, 150, 110, 92, { color: ink(K) });
  flash(F, t, t0, 0.18, [1, 1, 1], 0.8);
  flash(F, t, tNomu + 0.05, 0.14, [1, 1, 1], 0.7);
  F.zoomBlur = 0.03 * X.kick + 0.1 * ease.in3(clamp((u - 0.7) / 0.3)) + (after > 0 ? 0.12 * (1 - clamp(after / 0.6)) : 0);
}
// 3: the wave comes from behind, lifts the camera, runs on towards the city on the horizon and puts its lights out
function wall3(C, X, L) {
  const { I, F, S } = C;
  const t = X.t, t0 = L.t;
  const tKare = charT(L, 5), tNomu = charT(L, 7);
  storm(C, X, [t0 + 0.02, tNomu, tNomu + 0.35], { rain: 1 });
  redMoon(S, [0.5, 0.22, -1], 0.065);
  S.moon[1] = 0.6;
  const V = 12;
  const zc = V * (tKare - t);               // > 0 behind the camera; reaches it on 彼, runs on towards the city
  S.swell = [0, 0, 11, 9]; S.swell2 = [0, -1, -zc, 0.8];
  const out = clamp((t - tNomu) / 0.25);
  const flick = t > tNomu ? (hash(Math.floor(t * 30), 7) > 0.4 + out * 0.6 ? 1 : 0.15) : 1;
  S.city = 2.2 * (1 - out) * flick + 0.0;
  S.cityAz = [-0.45, 0.45];
  const climb = clamp((t - t0) / (tKare - t0));
  const fallU = clamp((t - tNomu - 0.3) / 0.7);
  const c = cam([0, C.seaH(0, 0) + 1.2 - 9 * fallU * fallU, 0], 0, 0, 0, 66 + 14 * climb);
  c.pitch = -0.05 - 0.12 * climb - 0.5 * fallU;
  c.roll = 0.4 * fallU;
  handheld(c, t, 1.2, 105);
  rumble(c, X, 1.3 + climb, t, 105);
  S.cam = c;
  S.under = [0.07, 1.8 + 3.5 * X.snareF, 1.8, 0.05];
  // this shore, measured as it goes under
  const cityP = project(c, [0, 0.05, -1], true);
  if (cityP && out < 1) {
    I.save(); I.strokeStyle = ink(K); I.lineWidth = 1.2; I.strokeRect(cityP[0] - 340, cityP[1] - 60, 680, 90); I.restore();
    caption(I, ['此岸 — this shore: Tokyo, 38 km', out > 0 ? 'lights out' : 'the wave is running at it'], cityP[0] - 340, cityP[1] - 84, { size: 13, color: ink(out > 0 ? A : K) });
  }
  if (t >= tNomu) text(I, '消灯', W / 2, H * 0.36, { font: `800 220px ${FONT.min}`, color: ink(A), align: 'center', base: 'middle', alpha: (1 - clamp((t - tNomu - 0.8) / 0.4)) * ease.out3(clamp((t - tNomu) / 0.1)) });
  lyricV(I, L, t, 150, 110, 92, { color: ink(K) });
  text(I, `${(c.pos[1] - C.seaBase(0, 0)).toFixed(2)} m`, 80, H - 96, { font: `900 64px ${FONT.goth}`, color: ink(K) });
  text(I, '高度 — on the back of the third wall', 84, H - 56, { font: `500 14px ${FONT.mono}`, color: ink(K) });
  flash(F, t, t0, 0.18, [1, 1, 1], 0.7);
  flash(F, t, tNomu, 0.2, [1, 1, 1], 0.95);
  F.zoomBlur = 0.03 * X.kick + 0.1 * fallU * (1 - fallU) * 4;
}

// ---------------------------------------------------------------- the falls
function fall(C, X, L, t1, red) {
  const { I, F, S } = C;
  const t = X.t, t0 = L.t, lt = t - t0, dur = t1 - t0;
  const tOchi = charT(L, 9);
  seaOn(C, ['storm', 'warm'], { light: true, grain: 0.06, vig: 0.55 });
  if (red) { S.waterScat = '#7a1a10'; S.lightCol = '#ff5a3c'; S.waterDeep = '#120201'; }
  S.sky[3] = 1.45; S.skyFog = 0.35;
  S.under = [0.045, 1.5 + 3.2 * X.snareF, 1.3, 0.025];
  redMoon(S, [0.2, 0.85, -0.45], 0.07);
  S.lightning = lightning(X, [t0 + 0.6, t0 + 1.9], 0.8, S);
  S.grade = red ? [1.15, 0.85, 0.8] : [1.1, 0.9, 0.78];
  const f = ease.inout2(clamp(lt / dur));
  const y = lerp(-2.5, red ? -30 : -22, f);
  const flip = ease.inout3(clamp((t - tOchi) / 0.5));
  const c = cam([0, y, 0], 0.3 + lt * 0.25, lerp(1.25, -1.3, flip), lt * (red ? 0.7 : 0.4) + flip * 0.6, lerp(82, 66, flip));
  handheld(c, t, 1.4, red ? 107 : 106);
  rumble(c, X, 0.4, t, red ? 107 : 106);
  S.cam = c;
  S.cards = rainOfPictures(y, red ? 11 : 5, flip < 0.5);
  text(I, red ? '37.0℃' : '36.5℃', 90, 270, { font: `900 220px ${FONT.goth}`, color: ink(red ? A : K), alpha: ease.out3(clamp(lt / 0.12)) });
  text(I, red ? 'a fever: the sea is warmer than he is' : 'body temperature = the warm sea', 98, 322, { font: `italic 400 26px ${FONT.serif}`, color: ink(K) });
  depthRuler(I, -y, W - 70);
  lyricV(I, L, t, W - 330, 120 + ease.out3(clamp(lt / 0.6)) * 30, 84, { color: ink(K) });
  enCaption(I, L, 96, 380, { size: 26 });
  F.trail = 0.32; F.trailXf = [1.003, 0, 0, 0.0015]; F.trailMode = 0;
  F.zoomBlur = 0.015;
}

// ---------------------------------------------------------------- the moon
// from under the sea: looking straight up at the red moon through the surface
function moonBelow(C, X, L, t1) {
  const { I, F, S } = C;
  const t = X.t, t0 = L.t, lt = t - t0, dur = t1 - t0;
  seaOn(C, ['red'], { light: true, grain: 0.06, vig: 0.6 });
  lookMix(S, 'night', 'storm', 0.6);
  redMoon(S, [0.04, 1, 0.12], 0.09);
  S.waterScat = '#6a1d12'; S.waterDeep = '#070101'; S.lightCol = '#ff6a4a';
  S.under = [0.05, 2.2 + 3 * X.snareF, 0.8, 0.04];
  S.sky[1] = 0.25; S.sky[3] = 1.3;
  const c = cam([0, -2.6 - lt * 0.6, 0], lt * 0.4, 1.52, 0, lerp(52, 40, ease.out2(clamp(lt / dur))));
  handheld(c, t, 0.6, 109);
  rumble(c, X, 0.35, t, 109);
  S.cam = c;
  lyricV(I, L, t, 330, 200, 150, { color: ink(K), ruby: false });
  const tDot = charT(L, 3);
  if (t >= tDot) {
    const d = t - tDot;
    I.save(); I.fillStyle = ink(A); I.beginPath(); I.arc(330 + 60, 200 + 150 * 3.3, 16 + 6 * Math.exp(-d * 6), 0, Math.PI * 2); I.fill(); I.restore();
  }
  caption(I, ['fig.48 — the moon, from under the sea', 'refracted through the surface (Snell’s window, 97°)'], W - 520, H - 92, { size: 13 });
  enCaption(I, L, W - 60, 70, { size: 26, align: 'right' });
  flash(F, t, t0, 0.14, [0.9, 0.12, 0.06], 0.9);
}
// the red moon at the end of a long lens, rising out of the sea
function moonLens(C, X, L, t1) {
  const { I, F, S } = C;
  const t = X.t, t0 = L.t, lt = t - t0, dur = t1 - t0;
  seaOn(C, ['red'], { light: true, grain: 0.06, vig: 0.5 });
  lookMix(S, 'night', 'storm', 0.5);
  S.moonCol = '#ff4a2e';
  S.sky = [0.0, 0.25, 0.0025, 1.35];
  S.moonDir = [0.0, lerp(0.02, 0.045, lt / dur), -1];
  S.moon = [0.075, 1.0, 2.1, 1];
  S.rain = 0.3;
  const c = cam([0, 3.0, 0], 0, 0.03, 0, lerp(10.5, 8.5, ease.out2(clamp(lt / dur))));
  handheld(c, t, 0.15, 111);
  rumble(c, X, 0.12, t, 111);
  S.cam = c;
  lyricV(I, L, t, 300, 160, 170, { color: ink(K), ruby: false });
  const m = project(c, S.moonDir, true);
  const tAka = charT(L, 2);
  if (m && t >= tAka) {
    const r = (Math.tan(S.moon[0]) / Math.tan((c.fov * Math.PI) / 360)) * 540;
    wobbleCircle(I, m[0], m[1], r * 1.08, r * 1.06, 53, clamp((t - tAka) / 0.3), 4, ink(A));
  }
  caption(I, ['fig.49 — the moon is red.', 'total lunar eclipse; 1/250 s, 1200 mm'], W - 470, 92, { size: 13 });
  enCaption(I, L, W - 60, H - 60, { size: 26, align: 'right' });
  flash(F, t, t0, 0.14, [0.9, 0.12, 0.06], 0.9);
}
// 海は、海は(、海は): the camera bobs through the waterline, each 海は lands on the other side of it
function echoes(C, X, L, t1, n) {
  const { I, F, S } = C;
  const t = X.t, t0 = L.t, lt = t - t0, dur = t1 - t0;
  seaOn(C, ['red'], { light: true, grain: 0.06, vig: 0.55 });
  lookMix(S, 'night', 'storm', n === 3 ? 0.4 : 0.7);
  redMoon(S, [-0.35, 0.28, -1], 0.075);
  S.sky[1] = 0.3; S.sky[3] = 1.25; S.skyFog = 0.4;
  S.waterScat = '#6a1d12'; S.waterDeep = '#070101'; S.lightCol = '#ff6a4a';
  S.under = [0.06, 1.0, 0.5, 0.06];
  const idx = n === 3 ? [0, 3, 6] : [0, 3];
  const k = idx.filter((i) => t >= charT(L, i)).length - 1;
  const sink = n === 3 ? ease.in2(clamp((lt - dur * 0.5) / (dur * 0.5))) * 4 : 0;
  const side = k % 2 === 0 ? 1 : -1;          // above, below, above...
  const c = cam([0, C.seaBase(0, 0) + side * 0.35 - sink + Math.sin(lt * 6) * 0.08, 0], -0.15, 0.08 + 0.4 * (sink / 4), 0.06 * side, 58);
  handheld(c, t, 0.7, 113);
  rumble(c, X, 0.5, t, 113);
  S.cam = c;
  for (let r = 0; r <= k; r++) {
    const tr = charT(L, idx[r]);
    const a = ease.out3(clamp((t - tr) / 0.12));
    const size = 170 + r * 90;
    vtext(I, '海は', W / 2 + 380 - r * 340, 170 + r * 20, size, { color: ink(r === k ? K : K, 1 - r * 0.25), weight: 800, alpha: a });
  }
  if (n === 3) F.cell = 6 + 30 * ease.in2(clamp(lt / dur));
  enCaption(I, L, 80, H - 70, { size: 30 });
}

// ---------------------------------------------------------------- the flood: every picture, drowned
function flood(C, X, L, t1) {
  const { P, I, F, S } = C;
  const t = X.t, t0 = L.t;
  const tNomu = charT(L, 7);
  storm(C, X, [t0 + 0.02, tNomu], { rain: 0.8 });
  redMoon(S, [0.1, 0.2, -1], 0.07);
  S.wave = [1.9, 2.8, 0.11, 1];
  F.mode = 0; F.inkA = '#e8352e'; F.inkB = '#0b7f86'; F.cell = 5.5;
  const cols = 6, rows = 4, gw = W / cols, gh = H / rows;
  const k = Math.floor((t - t0) / P16);
  // the waterline rises over the sheet from 飲
  const level = t < tNomu ? H + 10 : lerp(H + 10, -40, ease.inout2(clamp((t - tNomu) / (t1 - tNomu - 0.15))));
  const views = [];
  const seaCells = [7, 10, 15, 20, 2];
  P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const x = c * gw + 4, y = r * gh + 4, w = gw - 8, h = gh - 8;
    const si = seaCells.indexOf((i + Math.floor(k / 4)) % (cols * rows));
    if (si >= 0) {
      P.save(); P.globalCompositeOperation = 'destination-out'; P.fillStyle = '#000'; P.fillRect(x, y, w, h); P.restore();
      const cc = cam([si * 3 - 6, C.seaBase(si * 3 - 6, -si * 2) + [0.8, 3, 0.4, 9, 1.5][si], -si * 2], [0.3, -0.6, 2.4, 0.1, 1.2][si], [0.1, -0.1, 0.05, -1.2, 0.2][si], 0.15 * (si - 2), [70, 55, 85, 60, 40][si]);
      rumble(cc, X, 1.6, t, 120 + si);
      views.push({ rect: [x, y, w, h], cam: cc });
    } else {
      const name = MEM[(i * 7 + k * 5) % MEM.length];
      const on = hash(i, k) > 0.55;
      photo(P, name, x, y, w, h, { filter: on ? GRAYC(1.5) : GRAYC(0.8, 1.2) });
      if (on && (i + k) % 3 === 0) { P.save(); P.globalCompositeOperation = 'multiply'; P.fillStyle = (i + k) % 2 ? '#e8352e' : '#0b7f86'; P.fillRect(x, y, w, h); P.restore(); }
    }
    text(I, String(i + 1).padStart(2, '0'), c * gw + 12, r * gh + 26, { font: `500 13px ${FONT.mono}`, color: ink(K) });
  }
  for (let c = 1; c < cols; c++) line(I, c * gw, 0, c * gw, H, 1, ink(K));
  for (let r = 1; r < rows; r++) line(I, 0, r * gh, W, r * gh, 1, ink(K));
  // under the waterline the sheet is gone: the camera is in the water
  if (level < H) {
    P.save(); P.globalCompositeOperation = 'destination-out'; P.fillStyle = '#000';
    P.beginPath(); P.moveTo(0, H + 10);
    for (let x = 0; x <= W; x += 24) P.lineTo(x, level + Math.sin(x * 0.007 + t * 3) * 30 + (hash(Math.floor(x / 24), Math.floor(t * 12)) - 0.5) * 18);
    P.lineTo(W, H + 10); P.closePath(); P.fill(); P.restore();
  }
  S.views = level < H ? [] : views;
  const main = cam([0, C.seaBase(0, 0) - 0.1 + (H - level) / H * -3, 0], 0.2, 0.25, 0.1, 80);
  rumble(main, X, 1.6, t, 125);
  S.cam = main;
  S.under = [0.07, 1.8 + 3.5 * X.snareF, 1.8, 0.05];
  overflow(I, t, t0, 200, 0.4, 1.5);
  lyricV(I, L, t, 110, 120, 70, { color: ink(K) });
  F.inkLight = 1;
  flash(F, t, t0, 0.16, [1, 1, 1], 0.8);
}

export const chorusB = [
  { name: 'cb:afure', t0: CB[0].t, t1: nextT(0), draw(C, X) { wall1(C, X, CB[0]); fin(C, X, CB[0]); } },
  { name: 'cb:atatakai', t0: CB[1].t, t1: nextT(1), draw(C, X) { fall(C, X, CB[1], nextT(1), false); fin(C, X, null, 0.9); } },
  { name: 'cb:afure2', t0: CB[2].t, t1: nextT(2), draw(C, X) { wall2(C, X, CB[2]); fin(C, X, CB[2]); } },
  { name: 'cb:tsuki', t0: CB[3].t, t1: nextT(3), draw(C, X) { moonBelow(C, X, CB[3], nextT(3)); fin(C, X, null, 0.5); } },
  { name: 'cb:umiwa2', t0: CB[4].t, t1: nextT(4), draw(C, X) { echoes(C, X, CB[4], nextT(4), 2); fin(C, X, null, 0.8); } },
  { name: 'cb:afure3', t0: CB[5].t, t1: nextT(5), draw(C, X) { wall3(C, X, CB[5]); fin(C, X, CB[5]); } },
  { name: 'cb:atatakai2', t0: CB[6].t, t1: nextT(6), draw(C, X) { fall(C, X, CB[6], nextT(6), true); fin(C, X, null, 0.9); } },
  { name: 'cb:flood', t0: CB[7].t, t1: nextT(7), draw(C, X) { flood(C, X, CB[7], nextT(7)); fin(C, X, null, 1.5); } },
  { name: 'cb:tsuki2', t0: CB[8].t, t1: nextT(8), draw(C, X) { moonLens(C, X, CB[8], nextT(8)); fin(C, X, null, 0.5); } },
  { name: 'cb:umiwa3', t0: CB[9].t, t1: barT(84), draw(C, X) { echoes(C, X, CB[9], barT(84), 3); fin(C, X, null, 0.8); } },
];
// common ending of every chorus B page: English caption (walls), folio, reactions
function fin(C, X, L, amt = 1.4) {
  const { I, F } = C;
  if (L) enCaption(I, L, W - 150, H - 60, { size: 24, align: 'right' });
  folio(I, X, { side: 'right', head: HEAD });
  react(F, X, amt);
}
