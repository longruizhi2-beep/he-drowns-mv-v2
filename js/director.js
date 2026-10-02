// Director: one active scene per moment. Scenes are pure functions of song time (seek/record safe).
// On top of the scenes: one-16th "subliminal" frames at a few bar ends — an image from earlier or later in
// the song cuts through the page for 0.16 s (stream of consciousness: foreshadowing / memory).
import { sync, W, H, GRAYC } from './scenes/common.js';
import { BARS, P16 } from './timing.js';
import { photo, ink, K, text, FONT } from './draw.js';
import { cover } from './scenes/cover.js';
import { shore } from './scenes/shore.js';
import { verseA } from './scenes/verseA.js';
import { chorusA } from './scenes/chorusA.js';
import { wall, prewarmWall } from './scenes/wall.js';
import { decon } from './scenes/decon.js';
import { cycle } from './scenes/cycle.js';
import { verseB } from './scenes/verseB.js';
import { chorusB } from './scenes/chorusB.js';
import { end } from './scenes/end.js';

const SCENES = [...cover, ...shore, ...verseA, ...chorusA, ...wall, ...decon, ...cycle, ...verseB, ...chorusB, ...end].sort((a, b) => a.t0 - b.t0);
export const SCENE_LIST = SCENES.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1 }));
export function prewarm() { prewarmWall(); }

// [bar whose last 16th flashes, image, crop, print mode (2 = key-only negative, 3 = raw colour)]
const SUB = [
  [7, 'm_iris', [0.22, 0.22, 0.56, 0.56], 2],        // the green eye, before it is sung
  [11, 'm_redmoon', [0.33, 0.28, 0.33, 0.5], 3],     // the red moon, before it rises
  [23, 'm_wave_close', [0.15, 0.0, 0.7, 0.9], 2],    // the wave, before it breaks
  [67, 'm_hand_bubbles', [0.2, 0.1, 0.6, 0.8], 2],   // the hand, before the far shore
  [75, 'm_redmoon', [0.33, 0.28, 0.33, 0.5], 3],
  [87, 'm_moon_sea', [0.45, 0.0, 0.5, 0.75], 2],     // the moon over a calm sea, before the outro
];

let lastIdx = 0;
function find(t) {
  const s = SCENES[lastIdx];
  if (s && t >= s.t0 && t < s.t1) return s;
  let prev = -1;
  for (let i = 0; i < SCENES.length; i++) {
    if (t >= SCENES[i].t0 && t < SCENES[i].t1) { lastIdx = i; return SCENES[i]; }
    if (SCENES[i].t0 <= t) prev = i;
  }
  return prev >= 0 ? SCENES[prev] : null;   // (a float-rounding sliver between two scenes)
}

export function renderFrame(t, C) {
  const X = sync(t);
  const s = find(t);
  if (!s) return;
  const S = { t0: s.t0, t1: s.t1, lt: t - s.t0, lp: (t - s.t0) / (s.t1 - s.t0) };
  s.draw(C, X, S);
  for (const [bi, name, crop, mode] of SUB) {
    const b = BARS[bi];
    if (t >= b.end - P16 && t < b.end) {
      const { P, I, F, S } = C;
      S.on = false; S.pageIn3D = false;   // a flash of a printed page, nothing else
      P.save(); P.globalCompositeOperation = 'source-over'; P.globalAlpha = 1;
      P.fillStyle = '#fff'; P.fillRect(0, 0, W, H);
      photo(P, name, 0, 0, W, H, { crop, filter: mode === 3 ? 'none' : GRAYC(1.5) });
      P.restore();
      I.save(); I.globalCompositeOperation = 'source-over'; I.globalAlpha = 1; I.fillStyle = '#000'; I.fillRect(0, 0, W, H); I.restore();
      text(I, '*', 40, 70, { font: `500 28px ${FONT.mono}`, color: ink(K) });
      F.mode = mode; F.monoInk = 0; F.neg = mode === 3 ? 0 : 1; F.water = [0, 0, 0, 0]; F.trail = 0; F.wet = 0; F.flash = [1, 1, 1, 0];
      F.xf = [1.04, 0, 0, 0]; F.cell = 8; F.photoAmt = 1; F.bleed = 0; F.slit = 0; F.inkLight = 0; F.zoomBlur = 0; F.backMode = 0;
    }
  }
}
