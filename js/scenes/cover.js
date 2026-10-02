// Chapter 0 — the cover over the sea (piano intro, bars 0-3, 0:00-0:10.96)
// The paper cover lies over a calm 3D night sea, seen from straight above. Each piano note burns an ink-drop hole
// through the paper; under each hole a ripple ring opens on the real water. At the reverse swell the holes eat the
// paper; the camera tilts up from the water to the horizon (moon, the lights of the far city). Type turns into light.
import { W, H, react, clamp, ease, hash, lerp, text, vtext, ink, K, A, B, FONT, caption, timecode,
  seaOn, keyed, cam, handheld, screenToWater } from './common.js';
import { cropMarks, regMark, dropPath, line } from '../draw.js';

export const NOTES = [0.444, 0.927, 1.435, 1.928, 2.425, 3.560, 4.062, 4.546, 6.199, 6.698, 7.211, 7.699, 8.871, 9.371, 9.853];
const GHOST = [3.064, 3.221, 4.725, 8.185, 8.384, 10.024];
const DROPS = [ // [x, y, r] fractions of the frame; 0-2 = 氵
  [0.405, 0.255, 92], [0.36, 0.43, 84], [0.315, 0.68, 104],
  [0.62, 0.3, 66], [0.735, 0.585, 126], [0.54, 0.76, 58], [0.865, 0.245, 52], [0.175, 0.83, 78],
];
const SWELL0 = 5.18, DEV = 5.683, BAR3 = 8.32, BAND = 10.958;
const TOP = cam([0, 7.2, 0], 0, -Math.PI / 2 + 0.0005, 0, 58);
const CAMKEYS = [
  [0, TOP],
  [SWELL0, cam([0, 6.4, 0], 0, -Math.PI / 2 + 0.0005, 0, 58)],
  [DEV, cam([0, 6.0, -0.4], 0, -1.42, 0, 60), ease.inout2],
  [10.15, cam([0, 2.3, -7], 0, -0.035, 0, 56), ease.out3],
  [BAND, cam([0, 2.15, -8.2], 0, -0.02, 0, 54)],
];

function dropR(i, t) {
  const t0 = NOTES[i];
  if (t < t0) return 0;
  const d = t - t0;
  let r = DROPS[i][2] * (ease.outExpo(clamp(d / 0.22)) + 0.12 * clamp(d / 3));
  if (t > SWELL0) r *= 1 + 26 * ease.in3(clamp((t - SWELL0) / (DEV - SWELL0)));
  return r;
}

export const cover = [{
  name: 'cover', t0: 0, t1: BAND,
  draw(C, X) {
    const { P, I, F, S } = C;
    const t = X.t;
    const dev = clamp((t - SWELL0) / (DEV - SWELL0));
    const paper = t < DEV + 0.05;
    // ---------------- the sea below
    seaOn(C, ['calm'], { light: !paper, grain: 0.05, vig: 0.4 });
    S.cam = handheld(keyed(t, CAMKEYS), t, 0.25 + 0.5 * clamp((t - DEV) / 2), 3);
    const tilt = clamp((t - DEV) / (10.15 - DEV));
    const mh = lerp(0.97, 0.21, ease.inout2(tilt));
    S.moonDir = [0.16, mh, -Math.sqrt(Math.max(0.01, 1 - mh * mh - 0.0256))];
    S.moon = [0.045, 0.55, 1.4, 0];
    S.city = 0.85 * ease.in2(tilt);
    S.wave = [0.2 + 0.05 * tilt, 4.0, 0.16, 0.25];
    // ripples: under the holes while the paper lies on the water, then out in front of the camera
    const notes = [...NOTES, ...GHOST].filter((n) => n <= t).sort((a, b) => a - b).slice(-8);
    S.rip = notes.map((n) => {
      const i = NOTES.indexOf(n);
      const age = t - n;
      let xz;
      if (i >= 0 && i < DROPS.length) xz = screenToWater(TOP, DROPS[i][0] * W, DROPS[i][1] * H);
      else xz = [(hash(n, 1) - 0.5) * 7, -6 - hash(n, 2) * 9];
      return [xz[0], xz[1], age, (i >= 0 ? 0.22 : 0.12) * Math.exp(-age * 0.25)];
    });
    // ---------------- the paper, with holes burnt through it
    if (paper) {
      P.fillStyle = '#ffffff';
      P.fillRect(0, 0, W, H);
      P.save();
      P.globalCompositeOperation = 'destination-out';
      P.beginPath();
      for (let i = 0; i < DROPS.length; i++) {
        const r = dropR(i, t);
        if (r > 0) dropPath(P, DROPS[i][0] * W, DROPS[i][1] * H, r, i * 7 + 1, 0.25, false);
      }
      P.fill();
      P.restore();
      F.mode = 0;
    }
    // ---------------- type: ink on the paper, light over the sea
    const markIn = ease.out3(clamp(t / 0.35));
    if (paper) {
      cropMarks(I, 60, 50, W - 120, H - 100, 26 * markIn, 10, ink(K), 1);
      regMark(I, W / 2, 26, 11 * markIn, ink(K));
      regMark(I, W / 2, H - 26, 11 * markIn, ink(K));
      const outlineA = t < SWELL0 ? 1 : clamp(1 - dev * 1.6);
      for (let i = 0; i < DROPS.length; i++) {
        const r = dropR(i, t);
        if (r <= 0 || outlineA <= 0) continue;
        const cx = DROPS[i][0] * W, cy = DROPS[i][1] * H;
        I.save();
        I.globalAlpha = outlineA;
        I.strokeStyle = ink(B); I.lineWidth = 1.5;
        dropPath(I, cx, cy, r + 5, i * 7 + 1, 0.25); I.stroke();
        const lx = cx + r * 0.75 + 18, ly = cy - r * 0.75 - 10;
        I.beginPath(); I.moveTo(cx + r * 0.72, cy - r * 0.72); I.lineTo(lx, ly); I.lineTo(lx + 70, ly); I.strokeStyle = ink(K); I.lineWidth = 1; I.stroke();
        text(I, `fig.${i + 1}`, lx + 2, ly - 6, { font: `500 13px ${FONT.mono}`, color: ink(K) });
        text(I, timecode(NOTES[i]), lx + 2, ly + 17, { font: `400 12px ${FONT.mono}`, color: ink(K) });
        I.restore();
      }
      if (t > NOTES[2] + 0.2) {
        const a = clamp((t - NOTES[2] - 0.2) / 0.3) * outlineA;
        text(I, '氵', 0.19 * W, 0.2 * H, { font: `800 64px ${FONT.min}`, color: ink(A), alpha: a });
        text(I, '＝ 水 ／ さんずい', 0.19 * W + 70, 0.2 * H - 8, { font: `400 20px ${FONT.min}`, color: ink(A), alpha: a });
      }
      if (t > 0.444) caption(I, ['Blume popo', 'No.01 — 2026.09.30', '♩ = 91 / 4/4'], 96, 110, { size: 14, alpha: clamp((t - 0.444) / 0.25) });
    }
    // masthead, revealed on the bar-1 notes; stays (as light) once the paper is gone
    const mhN = [3.56, 4.062, 4.546, 4.725].filter((n) => t >= n).length;
    vtext(I, '海と毒薬', W - 150, 88, 118, { color: ink(K), weight: 800, reveal: mhN, gap: 0.02, alpha: paper ? 1 : 0.92 });
    if (!paper) {
      const a = clamp((t - DEV) / 0.6);
      text(I, 'UMI TO DOKUYAKU — Blume popo', W - 88, 92, { font: `500 12px ${FONT.mono}`, color: ink(K), rot: Math.PI / 2, tracking: 3, alpha: a });
      // the title, word by word on the bar-3 notes, floating over the water
      const words = [['He', 8.871], ['drowns', 9.371], ['in the', 9.853], ['She', 10.024]];
      I.save(); I.font = `italic 400 132px ${FONT.serif}`;
      let x = 110;
      for (const [w, tw] of words) {
        const ww = I.measureText(w + ' ').width;
        if (t >= tw) {
          const b = ease.out3(clamp((t - tw) / 0.12));
          text(I, w, x, 870 + (1 - b) * 20, { font: `italic 400 132px ${FONT.serif}`, color: ink(K), alpha: b * 0.95 });
          if (w === 'She' && t > tw + 0.18) text(I, 'シー／sea', x + 8, 730, { font: `400 25px ${FONT.min}`, color: ink(A), alpha: clamp((t - tw - 0.18) / 0.2) });
        }
        x += ww;
      }
      I.restore();
      if (t > BAR3) {
        const b = clamp((t - BAR3) / 0.4);
        line(I, 110, 905, 110 + 1280 * ease.out3(b), 905, 1, ink(K, 0.7));
        text(I, '♩ = 91    4/4 → 3/8 → 5/8 → 6/8 → 4/4    03′42″', 110, 945, { font: `500 15px ${FONT.mono}`, color: ink(K), alpha: b * 0.85 });
      }
    }
    react(F, X, t > DEV ? 0.4 : 0.15);
  },
}];
