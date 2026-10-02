// Chapter 8 — 彼岸へ (the odd-meter cycle, bars 53-67, 2:05.3-2:31.4)
// [5/8 5/8 5/8 6/8] x3 + [5/8 5/8 6/8]. Each cycle is one magazine page, printed in process colour; panel widths are
// the bar lengths (10:10:10:12), a 42-tick ruler under the panels carries the playhead across the page. Panels are
// modern photographs or windows onto the 3D sea (printed like photographs too). On the 6/8 bar the last panel opens
// to the whole page; it breathes where the band's high end drops out.
import { W, H, react, shake, flash, barT, clamp, ease, lerp, text, vtext, ink, K, A, FONT, photo, caption,
  folio, BARS, rect, line, seaOn, cam, handheld, lookMix, project } from './common.js';
import { meterGlyph } from '../draw.js';

// panels: { img, crop?, fx, fy } or { sea: set-up name }
const CYC = [
  { bars: [53, 54, 55, 56], title: ['彼岸へ', 'to the far shore'], look: 'calm', exposure: 1.35, moonDir: [0, 0.035, -1], moon: [0.05, 0.3, 1.6, 0],
    panels: [{ sea: 'path' }, { img: 'm_rower', crop: [0.3, 0.55, 0.42, 0.45] }, { sea: 'setting' }, { img: 'm_rowboat_blue', fx: 0.5, fy: 0.55 }],
    fig: 'the moon path; a fisherman, CC0; the moon setting; an empty boat, CC0' },
  { bars: [57, 58, 59, 60], title: ['彼女の中で', 'in her'], look: 'warm', exposure: 1.0, moonDir: [0.15, 0.75, -0.5], moon: [0.05, 0.6, 1.6, 0],
    panels: [{ img: 'm_she_sea', fx: 0.36, fy: 0.5 }, { img: 'm_walk_turq', fx: 0.55, fy: 0.5 }, { sea: 'womb' }, { img: 'm_dress_arms', fx: 0.5, fy: 0.4 }],
    fig: 'she stands in the sea; walking under it; the warm water from below; arms, a dress, CC0' },
  { bars: [61, 62, 63, 64], title: ['シー', 'the She / the sea'], look: 'night', exposure: 1.1, moonDir: [0, 0.12, -1], moon: [0.06, 0.7, 1.8, 1],
    panels: [{ img: 'm_lips_kiss', fx: 0.5, fy: 0.5 }, { sea: 'waterline' }, { img: 'm_couple2', fx: 0.5, fy: 0.4 }, { img: 'm_pool_pull', fx: 0.4, fy: 0.5 }],
    fig: 'a kiss, CC0; the waterline; underwater love; pulled under, CC0' },
  { bars: [65, 66, 67], title: ['溺れて', 'drowning'], look: 'deep', exposure: 1.2, moonDir: [0.1, 0.6, -0.6], moon: [0.06, 0.6, 1.6, 1],
    panels: [{ img: 'm_float_white', fx: 0.45, fy: 0.45 }, { sea: 'sinking' }, { img: 'm_curl2', fx: 0.5, fy: 0.45 }],
    fig: 'she floats; sinking; curled up, CC0' },
];
const PX0 = 40, PX1 = W - 150, PY0 = 150, PY1 = 870;

function seaCam(kind, t, lt, C) {
  switch (kind) {
    case 'path': return handheld(cam([0, C.seaBase(0, -lt * 9) + 0.55, -lt * 9], 0, 0.02, 0, 62), t, 0.6, 1);   // low along the moon path
    case 'setting': return handheld(cam([0, 2.4, 0], 0.04, 0.012, 0, 16), t, 0.2, 2);                          // the moon on the far horizon
    case 'womb': return handheld(cam([0, -3.2, 0], -0.1 + lt * 0.05, 1.2, lt * 0.2, 76), t, 0.8, 3);           // from below, warm
    case 'waterline': return handheld(cam([0, C.seaBase(0, 0) + 0.02, 0], 0.05, 0.02, 0.04, 66), t, 0.6, 4);    // half above, half below
    default: return handheld(cam([0, -2 - lt * 1.4, 0], 0.1, 1.15, lt * 0.15, 70), t, 0.7, 5);                 // sinking, face up
  }
}

function drawCycle(C, X, ci) {
  const { P, I, F, S } = C;
  const t = X.t, cy = CYC[ci];
  const bars = cy.bars.map((i) => BARS[i]);
  const total = bars.reduce((s, b) => s + b.len, 0);
  const tStart = bars[0].t;
  const cur = cy.bars.indexOf(X.p.bi);
  // the sea under this page
  seaOn(C, [], { printed: true, light: false });
  S.sky[3] = cy.exposure; S.skyFog = 0.5;
  if (cy.look === 'warm') { S.waterScat = '#b4502f'; S.lightCol = '#ffb38a'; S.waterDeep = '#1c0703'; S.under = [0.04, 1.6, 1.0, 0.02]; }
  else if (cy.look === 'deep') { lookMix(S, 'night', 'swell', 0.6); S.under = [0.07, 0.6, 0.9, 0.06]; }
  else lookMix(S, 'night', cy.look === 'calm' ? 'calm' : 'swell', 0.7);
  S.moonDir = cy.moonDir; S.moon = cy.moon; if (ci >= 2) S.moonCol = '#ff6a4a';
  F.mode = 1; F.cell = 6.5; F.inkK = '#1d1b1c'; F.tone = [1.18, 0.86, 0.02, 0.97];
  // the page slides in at the start of each cycle
  const slide = 1 - ease.out5(clamp((t - tStart) / 0.3));
  const ox = slide * W * 0.35;
  P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
  // the 6/8 panel opens to the whole page (from 0.15 s into the bar), and breathes at 0.5 s
  const last = bars[bars.length - 1];
  const open = t >= last.t ? ease.inout3(clamp((t - last.t - 0.12) / 0.38)) : 0;
  const views = [];
  let x = PX0;
  const tw = PX1 - PX0;
  bars.forEach((b, i) => {
    const pw = (b.len / total) * tw;
    const pan = cy.panels[i];
    let x0 = x + 5 + ox, w = pw - 10, y0 = PY0, h = PY1 - PY0;
    const isLast = i === bars.length - 1;
    if (isLast && open > 0) { x0 = lerp(x0, 0, open); y0 = lerp(y0, 0, open); w = lerp(w, W, open); h = lerp(h, H, open); }
    if (t >= b.t) {
      const d = t - b.t;
      const dev = ease.out3(clamp(d / 0.35));
      const active = i === cur;
      if (pan.sea) {
        P.save(); P.globalCompositeOperation = 'destination-out'; P.fillStyle = '#000'; P.fillRect(x0, y0, w, h); P.restore();
        const c = seaCam(pan.sea, t, t - tStart, C);
        c.fov *= 1 + (active ? 0.03 * (1 - X.p.gq / X.p.glen) : 0);
        views.push({ rect: [x0, y0, w, h], cam: c });
      } else {
        P.save(); P.beginPath(); P.rect(x0, y0, w, h); P.clip();
        const gp = active ? X.p.gq / X.p.glen : 1;
        const z = 1.06 + 0.06 * ease.out3(clamp(d / 3)) + (active ? 0.02 * (1 - gp) : 0);
        photo(P, pan.img, x0, y0, w, h, { crop: pan.crop, fx: pan.fx, fy: pan.fy, zoom: z });
        P.restore();
      }
      // undeveloped / no-longer-played panels are washed back towards the paper
      const wash = (1 - dev) * 0.9 + (active ? 0 : 0.28 * (1 - open * (isLast ? 1 : 0)));
      if (wash > 0) { P.fillStyle = `rgba(255,255,255,${wash})`; P.fillRect(x0, y0, w, h); }
      // the 6/8 bar breathes: the band's high end drops out ~0.45 s in
      if (b.meter === '6/8' && active) {
        const br = clamp(1 - Math.abs(d - 0.5) / 0.14);
        if (br > 0) { P.fillStyle = `rgba(255,255,255,${br * 0.85})`; P.fillRect(x0, y0, w, h); }
      }
      if (open < 0.98 || !isLast) rect(I, x0, y0, w, h, ink(K), active ? 3 : 1);
    } else {
      I.save(); I.setLineDash([6, 8]); I.strokeStyle = ink(K, 0.6); I.lineWidth = 1; I.strokeRect(x0, y0, w, h); I.restore();
    }
    const on = i === cur;
    if (open < 0.5) {
      meterGlyph(I, b.meter, x + 5 + ox + 30, PY0 - 58, 40, on ? ink(A) : ink(K));
      text(I, `bar ${cy.bars[i] + 1}`, x + 5 + ox + 64, PY0 - 44, { font: `500 14px ${FONT.mono}`, color: ink(on ? A : K) });
    }
    x += pw;
  });
  S.views = views;
  if (views.length) S.cam = views[views.length - 1].cam;
  else S.on = false;
  // the 42-tick ruler (32 for the truncated last cycle)
  const ry = lerp(PY1 + 60, H - 40, open);
  const k0 = bars[0].k;
  for (let j = 0; j <= total; j++) {
    const xx = PX0 + (j / total) * tw + ox;
    const kk = k0 + j;
    const bb = bars.find((b) => kk >= b.k && kk < b.k + b.len) || bars[bars.length - 1];
    const q = kk - bb.k;
    const isBar = q === 0 || j === total;
    const h = isBar ? 30 : bb.gstart.includes(q) ? 18 : 8;
    rect(I, Math.round(xx), ry - h, isBar ? 3 : 1.5, h, kk <= X.p.k ? ink(K) : ink(K, 0.35));
  }
  const px = PX0 + ((X.p.k - k0) / total) * tw + ox;
  I.save(); I.fillStyle = ink(A); I.beginPath(); I.moveTo(px, ry + 6); I.lineTo(px - 9, ry + 20); I.lineTo(px + 9, ry + 20); I.closePath(); I.fill(); I.restore();
  if (open < 0.5) line(I, px, PY0 - 12, px, PY1 + 12, 1, ink(A));
  if (open < 0.5) {
    text(I, bars.map((b) => b.len).join(' + ') + ' = ' + total, PX1 + ox, ry + 48, { font: `500 16px ${FONT.mono}`, color: ink(K), align: 'right' });
    text(I, `cycle ${ci + 1} / 4`, PX0 + ox, ry + 48, { font: `500 16px ${FONT.mono}`, color: ink(K) });
    caption(I, [`fig.${40 + ci} — ${cy.fig}`], PX0 + 300 + ox, ry + 48, { size: 13 });
  }
  // page title
  vtext(I, cy.title[0], W - 70, PY0 + 10, 52 + open * 60, { color: open > 0.5 ? ink(A) : ink(K), weight: 800 });
  text(I, cy.title[1], PX0 + ox, 64, { font: `italic 400 30px ${FONT.serif}`, color: ink(K) });
  folio(I, X, { side: 'right', head: '八　彼岸へ', y: 1058 });
  const b = X.p.b;
  flash(F, t, b.t, 0.1, [1, 1, 1], 0.35);
  flash(F, t, tStart, 0.2, [1, 1, 1], 0.8);
  shake(F, X, 0.5, 60 + ci);
  react(F, X, 1);
}

export const cycle = CYC.map((cy, ci) => ({
  name: 'cycle' + (ci + 1), t0: barT(cy.bars[0]), t1: BARS[cy.bars[cy.bars.length - 1]].end,
  draw(C, X) { drawCycle(C, X, ci); },
}));
