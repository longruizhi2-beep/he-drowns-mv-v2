// Lyrics (横田檀) with readings for ruby + mora-timed character reveal, and English glosses for captions.
import { P16, T0 } from './timing.js';
import { clamp } from './util.js';

// token = [surface, reading?]; reading given only for kanji runs
const L = {
  kyakkan: { tok: [['客観', 'きゃっかん'], ['、'], ['主観', 'しゅかん'], ['、'], ['此岸', 'しがん'], ['、'], ['彼岸', 'ひがん']],
    en: 'the objective, the subjective, this shore, the far shore' },
  hora1: { tok: [['ほら'], ['、'], ['その'], ['手', 'て'], ['の'], ['中', 'なか'], ['が'], ['世界', 'せかい']], en: 'look — the world is what lies in that hand' },
  airashi: { tok: [['愛', 'あい'], ['らしき'], ['口元', 'くちもと'], ['目', 'め'], ['は'], ['緑', 'みどり']], en: 'a lovely mouth; the eyes are green' },
  hora2: { tok: [['ほら'], ['、'], ['その'], ['目', 'め'], ['を'], ['開', 'あ'], ['ければ'], ['すぐに']], en: 'look — the moment you open those eyes' },
  kobune: { tok: [['海', 'うみ'], ['に'], ['浮', 'う'], ['かぶ'], ['小舟', 'こぶね'], ['の'], ['ほとりで']], en: 'beside a small boat afloat on the sea' },
  oborete: { tok: [['溺', 'おぼ'], ['れて'], ['忘', 'わす'], ['れる'], ['愛', 'あい'], ['と'], ['汚辱', 'おじょく'], ['の'], ['うちに']],
    en: 'drowning, forgetting, in love and in disgrace' },
  umiNaka: { tok: [['海', 'うみ'], ['の'], ['中', 'なか'], ['に'], ['いる']], en: 'i am in the sea' },
  umiNaka2: { tok: [['海', 'うみ'], ['の'], ['中', 'なか'], ['に'], ['行', 'い'], ['ってしまえば']], en: 'once you have gone into the sea' },
  afure: { tok: [['海', 'うみ'], ['は'], ['溢', 'あふ'], ['れて'], ['彼', 'かれ'], ['を'], ['飲', 'の'], ['んだ']], en: 'the sea overflowed and swallowed him' },
  atatakai: { tok: [['温', 'あたた'], ['かい'], ['海水', 'かいすい'], ['の'], ['深', 'ふか'], ['くへ'], ['落', 'お'], ['ちた']],
    en: 'he fell deep into the warm seawater' },
  tsuki: { tok: [['月', 'つき'], ['は'], ['赤', 'あか']], en: 'the moon is red' },
  tsuki2: { tok: [['月', 'つき'], ['は'], ['赤', 'あか'], ['。']], en: 'the moon is red.' },
  umiwa: { tok: [['海', 'うみ'], ['は']], en: 'the sea —' },
  umiwa2: { tok: [['海', 'うみ'], ['は'], ['、'], ['海', 'うみ'], ['は']], en: 'the sea, the sea' },
  umiwa3: { tok: [['海', 'うみ'], ['は'], ['、'], ['海', 'うみ'], ['は'], ['、'], ['海', 'うみ'], ['は']], en: 'the sea, the sea, the sea' },
};

const SEQ = [
  [42.652, 'kyakkan'], [45.106, 'hora1'], [47.642, 'airashi'], [50.238, 'hora2'], [53.004, 'kyakkan'], [55.568, 'kobune'],
  [58.243, 'oborete'], [61.844, 'umiNaka'], [74.324, 'afure'], [76.856, 'atatakai'], [79.762, 'afure'], [82.066, 'tsuki'],
  [83.361, 'umiwa'],
  [151.659, 'kyakkan'], [153.891, 'hora1'], [156.419, 'airashi'], [158.992, 'hora2'], [161.825, 'kyakkan'], [164.354, 'kobune'],
  [167.013, 'oborete'], [169.755, 'umiNaka2'], [172.49, 'afure'], [174.894, 'atatakai'], [177.558, 'afure'], [179.985, 'tsuki2'],
  [181.526, 'umiwa2'], [182.805, 'afure'], [185.534, 'atatakai'], [188.077, 'afure'], [190.448, 'tsuki2'], [191.927, 'umiwa3'],
];

const SMALL = 'ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ';
const mora = (s) => [...s].filter((c) => !SMALL.includes(c) && !'、。'.includes(c)).length;

export const LINES = SEQ.map(([t, key], i) => {
  const d = L[key];
  const next = i + 1 < SEQ.length ? SEQ[i + 1][0] : t + 3;
  const gap = Math.min(next - t, 3.2);
  // snap the start to the 16th grid
  const k = Math.round((t - T0) / P16);
  const t0 = T0 + k * P16;
  const chars = [];
  let m = 0;
  for (const [surf, read] of d.tok) {
    const cs = [...surf];
    const mm = read ? mora(read) : 0;
    cs.forEach((c, j) => {
      const cm = read ? mm / cs.length : '、。'.includes(c) ? 0.6 : SMALL.includes(c) ? 0 : 1;
      chars.push({ c, m0: m, m: cm, read: j === 0 ? read : null, runLen: cs.length });
      m += cm;
    });
  }
  const per = clamp((gap * 0.82) / Math.max(m, 1), P16 * 0.8, P16 * 2.2);
  for (const ch of chars) ch.t = t0 + ch.m0 * per;
  const text = d.tok.map((x) => x[0]).join('');
  return { i, key, t: t0, lrc: t, end: t0 + gap, sing: m * per, text, chars, en: d.en, tok: d.tok };
});

export function lineAt(t) {
  let cur = null;
  for (const l of LINES) if (l.t <= t + 1e-6) cur = l; else break;
  return cur;
}
// how many characters of a line are revealed at time t (float: fractional last char)
export function revealCount(line, t, fadeDur = 0.07) {
  let n = 0;
  for (const ch of line.chars) {
    if (t < ch.t) break;
    n += clamp((t - ch.t) / fadeDur);
    if (t - ch.t < fadeDur) break;
  }
  return n;
}
export const byKey = (key, nth = 0) => LINES.filter((l) => l.key === key)[nth];
