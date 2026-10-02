// Chapters 4-5 — 溢れる / 月は赤 (chorus A, bars 28-31) + the 3/8 turn (bar 32)
// The paper is gone. The camera breaks the surface into the storm; a wall of water rises in front of this shore (the
// city lights on the horizon) and swallows the camera together with the page that says 彼. The fall through warm
// water (36.5℃); a second wave lifts the camera up its face, whips round at the crest and drops it. The red moon at
// the end of a long lens; sinking with it; the 3/8 bar, held under water. Type is light now, not ink.
import { W, H, react, flash, barT, at, clamp, ease, lerp, text, ink, K, A, FONT, caption,
  folio, lyricV, enCaption, P16, line, timecode, seaOn, cam, handheld, rumble, floatCard, project,
  lookMix, gauge, depthRuler, lightning } from './common.js';
import { LINES } from '../lyrics.js';
import { meterGlyph, wobbleCircle } from '../draw.js';
import { swellJS } from '../sea.js';

const CA = LINES.slice(8, 13); // afure, atatakai, afure, tsuki, umiwa
const nextT = (i) => (i + 1 < CA.length ? CA[i + 1].t : barT(32));
const charT = (L, i) => L.chars[Math.min(i, L.chars.length - 1)].t;
const HEAD4 = '四　溢れる', HEAD5 = '五　月は赤';

// the storm, raw (unprinted), type as light
export function storm(C, X, strikes, o = {}) {
  const { S, F } = C;
  seaOn(C, ['storm'], { light: true, grain: o.grain ?? 0.075, vig: o.vig ?? 0.5 });
  S.sky[3] = 1.3; S.skyFog = 0.35;
  S.rain = o.rain ?? 0.8;
  S.lightning = lightning(X, strikes, 1, S);
  F.ca = 2 + 8 * X.snareF;
  return S;
}
// a giant glyph with outline echoes spilling below it, one more per 16th (the character overflows)
export function spill(I, ch, x, y, size, t, t0, color, o = {}) {
  if (t < t0) return;
  const n = Math.min(o.max ?? 4, Math.floor((t - t0) / P16));
  const f = `800 ${size}px ${FONT.min}`;
  for (let e = n; e >= 1; e--) text(I, ch, x, y + e * (o.step ?? size * 0.16), { font: f, color, align: 'center', base: 'middle', stroke: 2, alpha: 0.6 * 0.7 ** e });
  text(I, ch, x, y, { font: f, color, align: 'center', base: 'middle', alpha: ease.out3(clamp((t - t0) / 0.08)) });
}
// an editorial callout from a point in the 3D world to a label; it follows the camera
export function callout(I, c, p, dx, dy, lines, o = {}) {
  const s = project(c, p);
  if (!s || s[0] < -100 || s[0] > W + 100 || s[1] < -100 || s[1] > H + 100) return;
  const col = o.color || ink(K);
  const [x, y] = s, r = o.r ?? 7, side = dx >= 0 ? 1 : -1;
  I.save(); I.strokeStyle = col; I.lineWidth = 1.2; I.globalAlpha *= o.alpha ?? 1;
  I.beginPath(); I.arc(x, y, r, 0, Math.PI * 2); I.stroke();
  const a = Math.atan2(dy, dx);
  I.beginPath(); I.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); I.lineTo(x + dx, y + dy); I.lineTo(x + dx + side * 110, y + dy); I.stroke();
  I.restore();
  caption(I, lines, side > 0 ? x + dx + 4 : x + dx - 110, y + dy - 10 - (lines.length - 1) * 19, { size: 13, color: col, alpha: o.alpha });
}

export const chorusA = [
  {
    // 海は溢れて彼を飲んだ: the wall comes in from the horizon, picks up the page and buries it, then the camera
    name: 'c:afure', t0: CA[0].t, t1: nextT(0),
    draw(C, X) {
      const { P, I, F, S } = C;
      const t = X.t, L = CA[0], t0 = L.t;
      const tAfu = charT(L, 2), tKare = charT(L, 5), tNomu = charT(L, 7);
      storm(C, X, [t0 + 0.02, tKare, tNomu - 0.04]);
      S.moonDir = [0.12, 0.15, -1];          // low, behind the wall: its crest is backlit
      S.moon = [0.05, 0.6, 1.0, 0];
      S.city = 1.6; S.cityAz = [-0.55, 0.5];  // this shore, dead ahead, behind the wall
      // the wall: a swell running at the camera, growing as it comes in (shoaling)
      const u = clamp((t - t0) / (tNomu - t0));
      const zc = lerp(-46, -5.6, u) + Math.max(0, t - tNomu) * 25.3;
      const amp = lerp(3.4, 8.8, ease.in2(u));
      S.swell = [0, 0, amp, 7.5]; S.swell2 = [0, 1, zc, 0.8];
      // the camera bursts out of the water, rides the small waves (not the swell), looks up as the wall comes,
      // and goes under on 飲, tumbling
      const burst = ease.out3(clamp((t - t0) / 0.3));
      const under = ease.out3(clamp((t - tNomu) / 0.85));
      const c = cam([0, 0, 0], under * 0.5, 0, under * 1.3, lerp(72, 86, ease.in2(u)) + under * 8);
      c.pos[1] = C.seaBase(0, 0) + lerp(-0.4, 0.9, burst) - under * 3.6;
      c.pitch = lerp(0.32, 0.03, burst) + 0.42 * ease.in3(u) - under * 1.05;
      handheld(c, t, 1.3, 21);
      rumble(c, X, 1.2 + 0.6 * u + under * 0.6, t, 21);
      S.cam = c;
      S.under = [0.07, 1.6 + 3 * X.snareF, 1.6, 0.05];
      // the page that says 彼 floats ahead; the wall lifts it, tilts it at us and buries it
      S.pageIn3D = true; S.overlayInk = true;
      const pz = -6.5, px = -1.6;
      const buried = ease.in2(clamp((zc - pz) / 6));
      const tilt = 0.55 + 0.6 * clamp(swellJS(px, pz, S) / 6) - buried * 1.2;   // the wall's slope stands it up
      const k = { c: [px, C.seaH(px, pz) + 0.35 - buried * 5, pz], u: [1.5, 0, 0.18], v: [0, Math.sin(tilt) * 0.84, -Math.cos(tilt) * 0.84] };
      S.cards = [{ page: true, c: k.c, u: k.u, v: k.v, alpha: 1, glow: 1.1 }];
      F.mode = 0; F.cell = 6; F.inkA = '#e8352e'; F.inkB = '#0b7f86';
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      P.fillStyle = '#1d1b1c';
      P.font = `500 34px ${FONT.mono}`;
      P.fillText('fig.19 — 彼 / him', 90, 110);
      P.fillText(timecode(t), 90, 1000);
      P.fillRect(90, 132, W - 180, 4);
      if (t >= tKare) {
        P.save(); P.globalAlpha = ease.out3(clamp((t - tKare) / 0.07));
        P.font = `800 820px ${FONT.min}, serif`; P.textAlign = 'center'; P.textBaseline = 'middle';
        P.fillText('彼', W / 2, H / 2 + 50); P.restore();
      }
      // light on the screen
      lyricV(I, L, t, 150, 110, 92, { color: ink(K) });
      spill(I, '溢', 1400, 500 + under * 1300, 940, t, tAfu, ink(A, 0.9));
      gauge(I, W - 90, 930, 330, 0, 12, under > 0.02 ? 13 : amp, { label: '波高 / m', readout: under > 0.02 ? 'H > 12 m' : `H ${amp.toFixed(1)} m` });
      if (under < 0.02) {
        callout(I, c, [k.c[0] - 1.2, k.c[1] + 0.5, k.c[2]], -120, -130, ['fig.19 — 彼', 'the page, afloat']);
        if (u > 0.15) callout(I, c, [-4, C.seaBase(-4, zc) + amp * 0.98, zc], -170, -90, ['the wall', `${(-zc).toFixed(0)} m away`]);
      }
      caption(I, ['fig.18 — this shore, from the water', `${timecode(t)}   wind 24 m/s`], 70, H - 92, { size: 13 });
      enCaption(I, L, W - 150, H - 60, { size: 24, align: 'right' });
      folio(I, X, { side: 'right', head: HEAD4 });
      flash(F, t, t0, 0.22, [1, 1, 1], 0.85);
      flash(F, t, tNomu, 0.14, [0.85, 0.95, 1], 0.7);
      F.zoomBlur = 0.025 * X.kick + (t > tNomu ? 0.11 * (1 - clamp((t - tNomu) / 0.6)) : 0);
      react(F, X, 1.3);
    },
  },
  {
    // 温かい海水の深くへ落ちた: falling face-up through warm water; on 落ちた the camera turns over
    name: 'c:atatakai', t0: CA[1].t, t1: nextT(1),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, L = CA[1], t0 = L.t, t1 = nextT(1), lt = t - t0, dur = t1 - t0;
      const tOchi = charT(L, 9);
      seaOn(C, ['storm', 'warm'], { light: true, grain: 0.06, vig: 0.55 });
      S.sky[3] = 1.45;
      S.under = [0.045, 1.4 + 2.8 * X.snareF, 1.0, 0.03];
      S.moonDir = [0.25, 0.8, -0.5];
      S.lightning = lightning(X, [t0 + 0.62, t0 + 1.95]) * 0.7;
      S.grade = [1.1, 0.9, 0.78];
      const fall = ease.inout2(clamp(lt / dur));
      const y = lerp(-2.4, -15, fall);
      const flip = ease.inout3(clamp((t - tOchi) / 0.5));
      const c = cam([0, y, 0], 0.3 + lt * 0.1, lerp(1.22, -1.25, flip), lt * 0.32 + flip * 0.6, lerp(80, 64, flip));
      handheld(c, t, 1.4, 23);
      rumble(c, X, 0.35, t, 23);
      S.cam = c;
      // the embrace stays above, receding; far below, someone curled up like a child in the womb
      const cy = lerp(-0.6, -4.2, lt / dur);
      S.cards = [
        { img: 'm_couple2', c: [0.9, cy, -1.6], u: [1.5, 0, 0.25], v: [0.17, 0, -1.0], alpha: 1, glow: 0.35 },
        { img: 'm_curl2', c: [-0.4, -22.5, -1.4], u: [1.26, 0, 0.4], v: [-0.4, 0, 1.26], alpha: 1, glow: 0.5 * flip },
      ];
      text(I, '36.5℃', 90, 270, { font: `900 220px ${FONT.goth}`, color: ink(K), alpha: ease.out3(clamp(lt / 0.12)) });
      text(I, 'body temperature = the warm sea', 98, 322, { font: `italic 400 26px ${FONT.serif}`, color: ink(K) });
      depthRuler(I, -y, W - 70);
      lyricV(I, L, t, W - 330, 120 + ease.out3(clamp(lt / 0.6)) * 30, 84, { color: ink(K) });
      if (flip > 0.35) callout(I, c, [-0.4, -22.5, -1.4], 150, 110, ['fig.21 — curled up', '36.5℃, photograph CC0']);
      else callout(I, c, [0.9, cy, -1.6], 160, 120, ['fig.20 — an embrace', 'left above us']);
      enCaption(I, L, 96, 380, { size: 26 });
      folio(I, X, { side: 'right', head: HEAD4 });
      F.trail = 0.32; F.trailXf = [1.003, 0, 0, 0.0015]; F.trailMode = 0;
      F.zoomBlur = 0.012;
      react(F, X, 0.9);
    },
  },
  {
    // 海は溢れて彼を飲んだ (2): a bigger wave lifts the camera up its face; at the crest a whip pan to look down the
    // drop; on 飲 the fall
    name: 'c:afure2', t0: CA[2].t, t1: nextT(2),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, L = CA[2], t0 = L.t;
      const tAfu = charT(L, 2), tKare = charT(L, 5), tNomu = charT(L, 7);
      storm(C, X, [t0 + 0.02, tKare + 0.05, tNomu]);
      S.moonDir = [-0.3, 0.2, 1];            // behind the camera at first (the face is lit), ahead after the whip
      S.moon = [0.05, 0.6, 1.1, 0];
      const V = 15.5, AMP = 9.5, WID = 11;
      const zc = (t - tKare) * V;            // the crest reaches the camera on 彼
      S.swell = [0, 0, AMP, WID]; S.swell2 = [0, 1, zc, 0.55];
      const climb = clamp((t - t0) / (tKare - t0));
      const whip = ease.inout3(clamp((t - tKare) / 0.26));
      const fallU = clamp((t - tNomu) / 0.62);
      let z = 0, y;
      if (t < tKare) y = C.seaH(0, 0) + 1.0;
      else if (t < tNomu) { z = (t - tKare) * V + 1.3 * whip; y = C.seaH(0, z) + 1.0; }
      else {
        z = (tNomu - tKare) * V + 1.3;
        const hN = C.seaBase(0, z) + swellJS(0, z, { swell: S.swell, swell2: [0, 1, (tNomu - tKare) * V, 0.55] });
        y = hN + 1.0 - 13 * fallU * fallU - Math.max(0, t - tNomu - 0.62) * 1.5;
      }
      const c = cam([0, y, z], whip * Math.PI + fallU * 0.3, 0, fallU * 1.7, 72 + 10 * climb + 12 * whip + 10 * fallU);
      c.pitch = (0.1 + 0.45 * ease.in2(climb)) * (1 - whip) - 0.75 * whip - 0.6 * fallU;
      handheld(c, t, 1.2, 25);
      rumble(c, X, 1.3 + 0.5 * whip, t, 25);
      S.cam = c;
      S.under = [0.07, 1.6 + 3 * X.snareF, 1.6, 0.05];
      // light: the altimeter, 彼 (falls with us), the lyric
      const alt = y - C.seaBase(0, z);
      text(I, '高度 — height above the sea', 80, H - 250, { font: `500 14px ${FONT.mono}`, color: ink(K) });
      text(I, `${alt >= 0 ? '+' : '−'}${Math.abs(alt).toFixed(2)} m`, 72, H - 120, { font: `900 136px ${FONT.goth}`, color: ink(alt >= 0 ? K : A) });
      spill(I, '溢', 1500, 470, 760, t, tAfu, ink(K, 0.5), { max: 3 });
      if (t >= tKare) {
        const fy = 1500 * fallU * fallU;
        for (let e = 3; e >= 0; e--) {
          const ey = 520 + fy - e * 90 * fallU;
          text(I, '彼', 1040, ey, { font: `800 700px ${FONT.min}`, color: ink(A), align: 'center', base: 'middle', stroke: e ? 2.5 : 0, alpha: e ? 0.6 * 0.7 ** e : ease.out3(clamp((t - tKare) / 0.06)) });
        }
      }
      lyricV(I, L, t, 150, 110, 92, { color: ink(K) });
      caption(I, ['fig.22 — the second wave, from its face', `${timecode(t)}   H ${AMP.toFixed(1)} m`], W - 470, 92, { size: 13 });
      enCaption(I, L, W - 60, H - 60, { size: 24, align: 'right' });
      folio(I, X, { side: 'right', head: HEAD4 });
      flash(F, t, t0, 0.18, [1, 1, 1], 0.8);
      flash(F, t, tNomu + 0.18, 0.12, [0.85, 0.95, 1], 0.6);
      F.zoomBlur = 0.03 * X.kick + 0.06 * whip * (1 - whip) * 4 + (t > tNomu ? 0.1 * (1 - clamp((t - tNomu - 0.2) / 0.6)) : 0);
      react(F, X, 1.3);
    },
  },
  {
    // 月は赤: the red moon, at the end of a long lens, rising behind the waves
    name: 'c:tsuki', t0: CA[3].t, t1: nextT(3),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, L = CA[3], t0 = L.t, lt = t - t0, dur = nextT(3) - t0;
      seaOn(C, ['red'], { light: true, grain: 0.06, vig: 0.5 });
      lookMix(S, 'night', 'storm', 0.55);
      S.moonCol = '#ff4a2e';
      S.sky = [0.0, 0.32, 0.0025, 1.35];
      S.moonDir = [0.0, 0.058, -1];
      S.moon = [0.075, 1.0, 2.0, 1];
      S.rain = 0.25;
      const c = cam([0, 0, 0], 0, 0.034, 0, lerp(16.5, 13.5, ease.out2(clamp(lt / dur))));
      c.pos[1] = 3.2;
      handheld(c, t, 0.2, 29);
      rumble(c, X, 0.15, t, 29);
      S.cam = c;
      lyricV(I, L, t, 330, 230, 150, { color: ink(K) });
      const m = project(c, S.moonDir, true);
      const tAka = charT(L, 2);
      if (m) {
        const r = (Math.tan(S.moon[0]) / Math.tan((c.fov * Math.PI) / 360)) * 540;
        if (t >= tAka) wobbleCircle(I, m[0], m[1], r * 1.2, r * 1.17, 41, clamp((t - tAka) / 0.35), 3, ink(A));
        caption(I, ['fig.23 — the moon is red', 'total lunar eclipse; 1/500 s, 600 mm'], m[0] + r * 1.25 + 30, m[1] - r * 0.7, { size: 13 });
      }
      enCaption(I, L, W - 60, H - 60, { size: 26, align: 'right' });
      folio(I, X, { side: 'right', head: HEAD5 });
      flash(F, t, t0, 0.14, [0.9, 0.12, 0.06], 0.9);
      react(F, X, 0.5);
    },
  },
  {
    // 海は: sinking with the red moon through the surface; the sentence is left unfinished
    name: 'c:umiwa', t0: CA[4].t, t1: barT(32),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, L = CA[4], t0 = L.t, t1 = barT(32), lt = t - t0, dur = t1 - t0;
      seaOn(C, ['storm', 'red'], { light: true, grain: 0.06, vig: 0.6 });
      S.wave = [1.0, 3.4, 0.14, 0.6];
      S.sky[1] = 0.3;
      S.moonDir = [-0.42, 0.34, -1];
      S.moon = [0.075, 1.0, 2.2, 1];
      S.waterScat = '#6a1d12'; S.waterDeep = '#070101'; S.lightCol = '#ff6a4a';
      S.under = [0.06, 0.8, 0.5, 0.06];
      const sink = ease.inout2(clamp(lt / dur));
      const c = cam([0, 0, 0], -0.2 - 0.1 * sink, lerp(0.12, 0.62, sink), 0.05 * sink, lerp(46, 70, sink));
      c.pos[1] = C.seaBase(0, 0) + lerp(0.5, -3.5, sink);
      handheld(c, t, 0.6, 31);
      S.cam = c;
      S.sky[3] = lerp(1.25, 0.65, clamp((lt - dur * 0.55) / (dur * 0.45)));
      lyricV(I, L, t, W / 2 + 330, 190, 230, { color: ink(K), ruby: false });
      const dash = ease.out3(clamp((lt - 0.9) / (dur - 0.9)));
      if (dash > 0) line(I, W / 2 + 330, 190 + 230 * 2.25, W / 2 + 330, 190 + 230 * 2.25 + dash * 330, 4, ink(K));
      enCaption(I, L, W / 2 + 190, H - 90, { size: 30, align: 'right' });
      folio(I, X, { side: 'right', head: HEAD5 });
      react(F, X, 0.5);
    },
  },
  {
    // the 3/8 bar, held under water: three eighth notes, counted
    name: 'turn', t0: barT(32), t1: barT(33),
    draw(C, X) {
      const { I, F, S } = C;
      const t = X.t, lt = t - barT(32);
      seaOn(C, ['abyss'], { light: true, grain: 0.07, vig: 0.65 });
      S.moonDir = [0.0, 0.32, -1];
      S.lightCol = '#ff6a4a'; S.waterScat = '#3a120c';
      S.sky[3] = 0.85;
      const c = cam([0, -8.5 - lt * 0.6, 0], 0.05, 0.3 + lt * 0.1, 0, 62 - lt * 4);
      handheld(c, t, 0.4, 33);
      S.cam = c;
      meterGlyph(I, '3/8', W / 2, H / 2 - 20, 86, ink(K));
      for (let i = 0; i < 3; i++) {
        const ti = at(32, i * 2);
        if (t < ti) continue;
        const a = ease.out3(clamp((t - ti) / 0.08));
        I.save(); I.globalAlpha = a; I.fillStyle = ink(i === 2 ? A : K);
        I.beginPath(); I.arc(W / 2 - 60 + i * 60, H / 2 + 110, 9, 0, Math.PI * 2); I.fill(); I.restore();
      }
      line(I, 0, H / 2 + 170, W * clamp(X.p.q / 6), H / 2 + 170, 1, ink(K));
      text(I, 'the sea —', W / 2, H / 2 + 230, { font: `italic 400 24px ${FONT.serif}`, color: ink(K), align: 'center', alpha: 0.6 });
      folio(I, X, { side: 'right', head: '— 3/8 —' });
    },
  },
];
