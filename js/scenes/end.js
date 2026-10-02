// Chapters 11-12 — coda (bars 84-87), outro / 奥付 (bars 88-92), tail (bar 93)
// coda: the guitars are still roaring; the camera rises out of the abyss through every photograph, printed so coarsely
//       that the halftone dots become bubbles, and breaks the surface on the last beat.
// outro: the storm is over. The cover again, backwards: each piano note drops a ripple on a calm sea, the camera tilts
//       down from the horizon to straight above, and the paper closes over the water; the colophon, one line per note.
// tail: the finished page lies on the sea, the camera pulls away, the page goes under. The moon, last.
import { W, H, react, flash, barT, clamp, ease, hash, lerp, text, vtext, ink, K, A, B, FONT, caption,
  folio, line, rect, timecode, DUR, seaOn, cam, keyed, handheld, rumble, lookMix, screenToWater } from './common.js';
import { dropPath, cropMarks, regMark } from '../draw.js';
import { basis } from '../sea.js';

const CODA = barT(84), OUTRO = barT(88), TAIL = barT(93);
// piano onsets in the outro (measured)
const NOTES = [204.146, 204.663, 205.157, 205.652, 206.145, 206.805, 207.3, 207.794, 208.288, 209.442, 209.942, 210.45, 210.931,
  211.418, 212.577, 213.069, 213.566, 214.058, 214.555, 215.202];
const ASP = (n) => (window.IMAGES && window.IMAGES[n] ? window.IMAGES[n].h / window.IMAGES[n].w : 0.66);
const MEM = ['m_float_white', 'm_she_sea', 'm_hand_shell', 'm_iris', 'm_lips_kiss', 'm_rower', 'm_couple2', 'm_curl2', 'm_dress_arms',
  'm_redmoon', 'm_hand_bubbles', 'm_walk_turq', 'm_freediver2', 'm_pool_pull', 'm_aquarium_child', 'm_rowboat_blue'];
function hanging(name, c, w, yaw, pitch, roll, glow = 0.5) {
  const [, R, U] = basis({ yaw, pitch, roll });
  const h = w * ASP(name);
  return { img: name, c, u: R.map((v) => v * w), v: U.map((v) => v * h), alpha: 1, glow };
}

// ------------------------------------------------------------------ coda: up out of the abyss
const coda = {
  name: 'coda', t0: CODA, t1: OUTRO,
  draw(C, X) {
    const { I, F, S } = C;
    const t = X.t, lp = (t - CODA) / (OUTRO - CODA);
    seaOn(C, ['night', 'deep'], { printed: true, light: true });
    lookMix(S, 'night', 'swell', 1 - lp);
    S.moonDir = [0.1, 0.8, -0.5]; S.moon = [0.07, 0.9, 1.8, 1 - lp]; S.moonCol = lp < 0.5 ? '#ff6a4a' : '#ffd2b8';
    S.under = [0.05 - 0.02 * lp, 1.6 + 3 * X.snareF, 1.4, 0.02];
    S.sky[3] = lerp(1.6, 2.4, lp);
    // rising, faster and faster, through the photographs (they sink past us now)
    const y = lerp(-42, -0.6, ease.in2(lp));
    const c = cam([0, y, 0], lp * 2.4, lerp(1.35, 1.1, lp), lp * 0.8, lerp(70, 84, lp));
    handheld(c, t, 1, 131);
    rumble(c, X, 0.6, t, 131);
    S.cam = c;
    const cards = [];
    const sp = 3.2;
    const i0 = Math.floor((-y) / sp) - 6;
    for (let i = Math.max(0, i0); i < i0 + 10 && cards.length < 6; i++) {
      const yy = -1.5 - i * sp;
      if (yy < y + 0.6) continue;              // only those above the lens: we look up at them
      const a = hash(i, 31) * Math.PI * 2, r = 1.6 + hash(i, 32) * 2.6;
      cards.push(hanging(MEM[i % MEM.length], [Math.cos(a) * r, yy, Math.sin(a) * r], 0.9 + hash(i, 33) * 0.6,
        hash(i, 34) * 6.28, -1.5708 + (hash(i, 35) - 0.5) * 1.0, (hash(i, 36) - 0.5) * 0.6, 0.55));
    }
    S.cards = cards;
    // the print gets coarser until its dots are bubbles
    F.mode = 4; F.duoInk = 2; F.duo = [0.32, 1, 0.0, 0.7]; F.inkA = '#e8352e'; F.inkB = '#0b7f86';
    F.cell = lerp(7, 46, ease.in2(lp));
    F.tone = [1.15, 0.62, 0.0, 0.78];
    F.wet = 0.15 + 0.4 * lp;
    // bubbles leaving the page, as light
    const n = Math.floor(50 + lp * 140);
    I.save();
    for (let i = 0; i < n; i++) {
      const speed = 70 + hash(i, 1) * 240;
      const age = (t - CODA) * (0.7 + lp) + hash(i, 2) * 12;
      const by = H + 40 - ((age * speed) % (H + 120));
      const bx = hash(i, 3) * W + Math.sin(age * 2 + i) * 14;
      const r = (3 + hash(i, 4) * 9) * (0.5 + lp * 1.5);
      I.strokeStyle = ink(i % 5 === 0 ? A : K, 0.8); I.lineWidth = 1.5;
      I.beginPath(); I.arc(bx, by, r, 0, Math.PI * 2); I.stroke();
    }
    I.restore();
    vtext(I, '海は、', W / 2 + 70, 240, 170, { color: ink(K), weight: 800, alpha: 1 - clamp((lp - 0.7) / 0.25) });
    text(I, 'the sea is —', W / 2 - 40, 900, { font: `italic 400 30px ${FONT.serif}`, color: ink(K), align: 'right', alpha: 1 - lp });
    text(I, `−${Math.max(0, -y).toFixed(1)} m`, 80, H - 96, { font: `900 64px ${FONT.goth}`, color: ink(K) });
    text(I, '浮上 — rising', 84, H - 56, { font: `500 14px ${FONT.mono}`, color: ink(K) });
    folio(I, X, { side: 'right', head: '十一　海は、' });
    flash(F, t, OUTRO - 0.12, 0.12, [1, 1, 1], 0.6);
    react(F, X, 1.1);
  },
};

// ------------------------------------------------------------------ outro: the cover, backwards
const DROPS = [[0.36, 0.42, 120], [0.62, 0.3, 90], [0.735, 0.585, 130], [0.2, 0.7, 100], [0.5, 0.76, 80], [0.86, 0.26, 70], [0.12, 0.25, 85]];
const TOP = cam([0, 7.2, 0], 0, -Math.PI / 2 + 0.0005, 0, 58);
const CUT = 209.442;   // the tenth note, after the outro's first rest: cut from the horizon to straight above
const OKEYS = [
  [OUTRO, cam([0, 1.3, 0], 0, 0.02, 0, 56)],
  [CUT, cam([0, 2.0, 0.5], 0, -0.03, 0, 50), ease.inout2],
];
const COLOPHON = [
  ['奥付', 0], ['He drowns in the She', 1], ['Blume popo', 2], ['作詞・作曲　横田檀', 3], ['収録　『海と毒薬』', 4],
  ['♩＝91　4/4 → 3/8 → 5/8 → 6/8 → 4/4', 5], ['全94小節　16分音符 1,348', 6],
  ['写真　rawpixel / Openverse ほか — CC0', 8], ['海　WebGL2 ray-marching, real-time', 9],
  ['活字　Shippori Mincho B1 / Zen Kaku Gothic / EB Garamond / IBM Plex', 11],
  ['印刷　水　　製本　月', 13], ['2026年10月1日　第二版', 15],
];
function colophon(I, t, col, o = {}) {
  const bx = 1150, by = 170;
  const shown = NOTES.filter((n) => n <= t).length;
  COLOPHON.forEach(([s, row], i) => {
    if (i >= shown) return;
    const a = ease.out3(clamp((t - NOTES[i]) / 0.15)) * (o.alpha ?? 1);
    const y = by + row * 44 + (o.dy ? o.dy(i) : 0);
    const x = bx + (o.dx ? o.dx(i) : 0);
    if (i === 0) { text(I, s, x, y, { font: `800 44px ${FONT.min}`, color: col, alpha: a }); line(I, x, y + 18, x + 660 * a, y + 18, 2, col); }
    else if (i === 1) text(I, s, x, y + 20, { font: `italic 400 40px ${FONT.serif}`, color: col, alpha: a });
    else text(I, s, x, y + 14, { font: `400 21px ${FONT.min}`, color: col, alpha: a });
  });
  return shown;
}
function paperRadius(i, t) {
  // the drop windows: open on the outro's first notes, then close as the paper comes back
  const n = NOTES[i];
  if (t < n) return 0;
  const open = ease.outExpo(clamp((t - n) / 0.25));
  const close = 1 - ease.inout3(clamp((t - 212.2 - i * 0.18) / 2.2));
  return DROPS[i][2] * open * (0.25 + 0.75 * close) * (1 + 0.1 * clamp((t - n) / 3));
}
const outro = {
  name: 'outro', t0: OUTRO, t1: TAIL,
  draw(C, X) {
    const { P, I, F, S } = C;
    const t = X.t;
    const paperIn = ease.inout2(clamp((t - 211.6) / 1.4));
    seaOn(C, ['calm'], { light: paperIn < 0.5, grain: 0.05, vig: 0.4 });
    const above = t >= CUT;
    S.moonDir = above ? [0.16, 0.97, -0.2] : [0.12, 0.12, -1]; S.moon = [0.045, 0.55, 1.4, 0];
    S.wave = [0.18, 4.0, 0.16, 0.2];
    S.cam = handheld(above ? cam(TOP.pos, TOP.yaw, TOP.pitch, 0, TOP.fov) : keyed(t, OKEYS), t, 0.25, 141);
    if (above) flash(F, t, CUT, 0.15, [1, 1, 1], 0.5);
    // ripples: a drop on every note, under the windows of the paper
    const notes = NOTES.filter((n) => n <= t).slice(-8);
    S.rip = notes.map((n) => {
      const i = NOTES.indexOf(n) % DROPS.length;
      const xz = screenToWater(TOP, DROPS[i][0] * W, DROPS[i][1] * H);
      const age = t - n;
      return [xz[0], xz[1], age, 0.2 * Math.exp(-age * 0.25)];
    });
    // the paper comes back over the water, its drop windows closing
    if (paperIn > 0) {
      P.fillStyle = `rgba(255,255,255,${paperIn})`; P.fillRect(0, 0, W, H);
      P.save(); P.globalCompositeOperation = 'destination-out'; P.fillStyle = '#000'; P.beginPath();
      for (let i = 0; i < DROPS.length; i++) {
        const r = paperRadius(i, t);
        if (r > 0) dropPath(P, DROPS[i][0] * W, DROPS[i][1] * H, r, i * 5 + 3, 0.2, false);
      }
      P.fill(); P.restore();
      F.mode = 0; F.cell = 6;
      cropMarks(I, 60, 50, W - 120, H - 100, 26 * paperIn, 10, ink(K), 1);
      regMark(I, W / 2, 26, 11 * paperIn, ink(K)); regMark(I, W / 2, H - 26, 11 * paperIn, ink(K));
    }
    const shown = colophon(I, t, ink(K));
    if (shown > COLOPHON.length - 1) rect(I, 1130, 120, 700, 15 * 44 + 110, ink(K), 1.5);
    text(I, timecode(t), 96, 110, { font: `500 14px ${FONT.mono}`, color: ink(K) });
    folio(I, X, { side: 'right', head: '十二　奥付' });
    react(F, X, 0.3);
  },
};

// ------------------------------------------------------------------ tail: the page on the sea, going under
const tail = {
  name: 'tail', t0: TAIL, t1: DUR + 1,
  draw(C, X) {
    const { P, I, F, S } = C;
    const t = X.t, lp = clamp((t - TAIL) / (DUR - TAIL));
    seaOn(C, ['calm'], { grain: 0.05, vig: 0.5, light: true });
    S.moonDir = [0.3, 0.3, -1]; S.moon = [0.045, 0.55, 1.4, 0];
    S.wave = [0.08, 4.0, 0.16, 0.1];
    S.pageIn3D = true; S.overlayInk = true;
    // the finished page: white, a few closed drops, the colophon
    P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
    // where the windows were, water stains
    P.save(); P.fillStyle = 'rgba(150,165,172,0.28)'; P.beginPath();
    for (let i = 0; i < DROPS.length; i++) dropPath(P, DROPS[i][0] * W, DROPS[i][1] * H, DROPS[i][2] * 0.4, i * 5 + 3, 0.2, false);
    P.fill(); P.restore();
    colophon(P, 999, '#1d1b1c');
    P.save(); P.strokeStyle = '#1d1b1c'; P.lineWidth = 1.5; P.strokeRect(1130, 120, 700, 15 * 44 + 110); P.restore();
    F.mode = 0; F.cell = 6;
    // the page lies on the water; the camera pulls away into the night, the paper's light goes out
    const hw = 3.2, hh = 1.8;   // at 3.25 m the page fills the frame exactly, as the paper did at the end of the outro
    const y = C.seaH(0, 0) + 0.18;
    const fade = 1 - ease.in2(clamp((lp - 0.55) / 0.4));
    S.cards = [{ page: true, c: [0, y, 0], u: [hw, 0, 0], v: [0, 0, -hh], alpha: 1, glow: 1.3 * fade }];
    const c = cam([0, lerp(3.25, 46, ease.inout2(clamp(lp / 0.9))), 0.001], 0, -Math.PI / 2 + 0.0005, lp * 0.5, 58);
    S.cam = handheld(c, t, 0.15, 151);
    // the moon, last
    const mA = clamp((lp - 0.55) / 0.1) * (1 - clamp((lp - 0.93) / 0.05));
    if (mA > 0) { I.save(); I.globalAlpha = mA; I.fillStyle = ink(A); I.beginPath(); I.arc(W * 0.5, H * 0.24, 12, 0, Math.PI * 2); I.fill(); I.restore(); }
    S.sky[3] = 1.4 * (1 - clamp((lp - 0.9) / 0.08));
    if (lp > 0.975) F.flash = [0.03, 0.03, 0.035, clamp((lp - 0.975) / 0.02)];
    react(F, X, 0.4);
  },
};

export const end = [coda, outro, tail];
