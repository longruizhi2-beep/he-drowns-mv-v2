// Boot, asset loading, render loop, controls, recording and headless test hooks.
import { createGL } from './gl.js';
import { Press, defaults } from './print.js';
import { Sea, seaDefaults, seaHeightJS, swellJS } from './sea.js';
import { AudioEngine } from './audio.js';
import { IMG } from './draw.js';
import { BARS, SECTIONS, DUR, barIndex, pos, hit, env } from './timing.js';
import { renderFrame, SCENE_LIST, prewarm } from './director.js';

const $ = (id) => document.getElementById(id);
const QUALITY = [[1920, 1080], [1600, 900], [1280, 720]];
let qi = 0;
let RW = QUALITY[0][0], RH = QUALITY[0][1];
const view = $('view');
const gl = createGL(view);
const press = new Press(gl, RW, RH);
const seaC0 = performance.now();
const sea = new Sea(gl);
const seaCompileMs = performance.now() - seaC0;
// the sea's own clock: waves move faster when the band is louder (integrated, so it is a pure function of song time)
const SEA_RATE = 50, seaTab = new Float32Array(Math.ceil(DUR * SEA_RATE) + 2);
for (let i = 1; i < seaTab.length; i++) {
  const t = i / SEA_RATE;
  seaTab[i] = seaTab[i - 1] + (0.35 + 1.15 * env('loud', t) ** 1.6) / SEA_RATE;
}
const seaClock = (t) => {
  const x = Math.max(0, t) * SEA_RATE, i = Math.min(seaTab.length - 2, Math.floor(x));
  return seaTab[i] + (seaTab[i + 1] - seaTab[i]) * (x - i) + (t > DUR ? (t - DUR) * 0.35 : 0);
};
let seaTest = null, shaderWaitMs = 0;
const mk = () => { const c = document.createElement('canvas'); c.width = RW; c.height = RH; return c; };
const photoC = mk(), inkC = mk();
const P = photoC.getContext('2d', { willReadFrequently: false });
const I = inkC.getContext('2d', { willReadFrequently: false });
const audio = new AudioEngine();
let ready = false, started = false, showHud = false, showDbg = false;
let lastT = 0, fps = 0, frameMs = 0, lastF = null, lastS = null, hold = false;

function setRes(w, h) {
  RW = w; RH = h;
  view.width = w; view.height = h;
  photoC.width = inkC.width = w; photoC.height = inkC.height = h;
  press.resize(w, h);
}
setRes(RW, RH);

// ------------------------------------------------------------------ loading
const status = (s) => { $('bootStatus').textContent = s; };
const progress = (p) => { $('bootBar').style.width = Math.round(p * 100) + '%'; };
async function loadImages(onEach) {
  const names = Object.keys(window.IMAGES);
  let n = 0;
  await Promise.all(names.map(async (name) => {
    const im = new Image();
    im.decoding = 'async';
    im.src = `assets/img/${name}.jpg`;
    await im.decode();
    IMG[name] = im;
    onEach(++n / names.length);
  }));
}
// moon disc from the blood-moon photograph; card layers for photographs that float in the 3D sea
const CARD_IMAGES = window.CARDS || [];
function setupSeaTextures() {
  const mc = document.createElement('canvas');
  mc.width = mc.height = 512;
  const mx = mc.getContext('2d');
  mx.fillStyle = '#000'; mx.fillRect(0, 0, 512, 512);
  const ec = IMG.m_redmoon;   // measured: disc centre (0.4961, 0.5439), radius 0.1162 of the width
  if (ec) {
    const iw = ec.naturalWidth, ih = ec.naturalHeight, r = iw * 0.1162 * 1.015;
    mx.drawImage(ec, iw * 0.4961 - r, ih * 0.5439 - r, 2 * r, 2 * r, 0, 0, 512, 512);
  }
  sea.moonTex = sea.imageTexture(mc);
  const city = IMG[window.CITY_IMAGE || 'm_shinjuku'];
  sea.cityTex = sea.imageTexture(city || mc, true);
  const cards = {};
  for (const n of CARD_IMAGES) if (IMG[n]) cards[n] = IMG[n];
  if (!Object.keys(cards).length) cards.m_redmoon = IMG.m_redmoon;
  sea.loadCards(cards, 1024);
}
async function loadFonts() {
  const fams = ['800 20px Shippori', '400 20px Shippori', '900 20px ZenKaku', '400 20px ZenKaku', '20px Dela',
    'italic 400 20px Garamond', '400 20px Garamond', '400 20px Plex', '500 20px Plex', '900 20px Bodoni', 'italic 900 20px Bodoni'];
  await Promise.all(fams.map((f) => document.fonts.load(f, '海は溢れて彼を飲んだ Ag 5/8')));
}
async function boot() {
  try {
    status('フォント…'); await loadFonts();
    status('写真…'); await loadImages((p) => progress(p * 0.4));
    setupSeaTextures();
    prewarm();
    status('音声…');
    try {
      await audio.loadUrl('audio/song.flac', (p) => progress(0.4 + p * 0.55));
    } catch (e) {
      console.warn('audio fetch failed', e);
      status('音声を読み込めません（file:// で開いた場合は start.bat を使ってください）。ファイルを選択できます。');
      $('fileLbl').classList.remove('hidden');
      ready = true;
      return;
    }
    status('シェーダ…');
    const tc = performance.now();
    while (!sea.prog.ready()) await new Promise((r) => setTimeout(r, 40));
    shaderWaitMs = performance.now() - tc;
    progress(1);
    status('準備完了 — ' + BARS.length + ' 小節 / ' + SECTIONS.length + ' 段落');
    $('playBtn').disabled = false;
    ready = true;
  } catch (e) {
    status('エラー: ' + e.message);
    console.error(e);
  }
}
$('fileIn').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  status('音声をデコード中…');
  await audio.loadFile(f);
  status('準備完了');
  $('playBtn').disabled = false;
});
$('playBtn').addEventListener('click', () => start());
function start() {
  if (!audio.buf) return;
  started = true;
  $('boot').classList.add('gone');
  document.body.classList.add('playing');
  audio.play();
}
audio.onEnded = () => { document.body.classList.remove('playing'); stopRecording(); };

// ------------------------------------------------------------------ render
function frame(t) {
  const F = defaults();
  const S = seaDefaults();
  const t0 = performance.now();
  P.setTransform(1, 0, 0, 1, 0, 0);
  I.setTransform(1, 0, 0, 1, 0, 0);
  P.globalCompositeOperation = 'source-over';
  P.globalAlpha = 1; P.filter = 'none';
  P.clearRect(0, 0, RW, RH);
  I.globalCompositeOperation = 'source-over';
  I.globalAlpha = 1; I.filter = 'none';
  I.clearRect(0, 0, RW, RH);
  I.fillStyle = '#000'; I.fillRect(0, 0, RW, RH);
  I.globalCompositeOperation = 'lighter';
  const s = RW / 1920;
  P.setTransform(s, 0, 0, s, 0, 0);
  I.setTransform(s, 0, 0, s, 0, 0);
  const st = seaClock(t);
  const C = { P, I, F, S, W: 1920, H: 1080, seaT: st, seaH: (x, z, iters) => seaHeightJS(x, z, S, st, iters),
    seaBase: (x, z, iters) => seaHeightJS(x, z, S, st, iters) - swellJS(x, z, S) }; // the waves without the giant swell
  if (seaTest) { Object.assign(S, seaTest, { on: true }); if (seaTest.F) Object.assign(F, seaTest.F); }
  else renderFrame(t, C);
  if (S.on) {
    if (!F.backMode) F.backMode = 1;
    if (S.pageIn3D) {
      // overlayInk: the ink layer stays on the screen (over the 3D) instead of being printed on the floating page
      const page = press.printPage(photoC, inkC, F, t, { noInk: !!S.overlayInk });
      const rt = sea.render(S, RW, RH, t, st, page.tex);
      press.render(photoC, inkC, F, t, rt.tex, { backOnly: true, keepInk: !!S.overlayInk });
    } else {
      const rt = sea.render(S, RW, RH, t, st, null);
      press.render(photoC, inkC, F, t, rt.tex);
    }
  } else press.render(photoC, inkC, F, t);
  lastF = F; lastS = S;
  frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
}
function loop(now) {
  requestAnimationFrame(loop);
  if (!ready || hold) return;
  const dt = now - lastT; lastT = now;
  fps = fps * 0.95 + (1000 / Math.max(dt, 1)) * 0.05;
  const t = audio.time();
  frame(t);
  if (showHud) drawTimeline(t);
  if (showDbg) {
    const p = pos(t);
    $('dbg').textContent = `t ${t.toFixed(3)}  bar ${p.bi + 1} (${p.meter}) ${p.sec}\n16th ${p.q.toFixed(2)} / ${p.b ? p.b.len : '-'}  group ${p.gi} ${p.gq.toFixed(2)}\n` +
      `kick ${hit('kick', t).toFixed(2)} snare ${hit('snare', t).toFixed(2)} hat ${hit('hat', t).toFixed(2)} acc ${hit('acc', t).toFixed(2)}\n` +
      `fps ${fps.toFixed(0)}  frame ${frameMs.toFixed(1)} ms  ${RW}x${RH}  sync ${(audio.userOffset * 1000).toFixed(0)} ms` + (rec ? '\n● REC' : '');
  }
}
requestAnimationFrame(loop);

// ------------------------------------------------------------------ timeline HUD
function drawTimeline(t) {
  const c = $('tlc');
  const w = c.clientWidth * devicePixelRatio, h = c.clientHeight * devicePixelRatio;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const x = c.getContext('2d');
  x.clearRect(0, 0, w, h);
  const col = { '4/4': '#8a8', '5/8': '#e8352e', '6/8': '#ffb000', '3/8': '#6cf', '2/4': '#c8c', free: '#666' };
  for (const b of BARS) {
    const x0 = (b.t / DUR) * w, x1 = (b.end / DUR) * w;
    x.fillStyle = col[b.meter] || '#888';
    x.globalAlpha = 0.55;
    x.fillRect(x0, h * 0.45, Math.max(1, x1 - x0 - 1), h * 0.3);
  }
  x.globalAlpha = 1;
  x.fillStyle = '#efebe2';
  x.font = `${11 * devicePixelRatio}px Plex, monospace`;
  let lastX = -1e9;
  for (const s of SECTIONS) {
    const sx = (s.t0 / DUR) * w + 3;
    if (sx < lastX) continue; // skip labels of very short sections rather than overlap
    x.fillText(s.name, sx, h * 0.35);
    lastX = sx + x.measureText(s.name).width + 8;
  }
  x.fillRect((t / DUR) * w - 1, 0, 2, h);
}
$('tl').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  audio.seek(((e.clientX - r.left) / r.width) * DUR);
});

// ------------------------------------------------------------------ controls
function seekBars(n) {
  const t = audio.time();
  const bi = Math.max(0, barIndex(t));
  const cur = BARS[bi];
  const target = n < 0 && t - cur.t > 0.6 ? bi + n + 1 : bi + n;
  audio.seek(BARS[Math.max(0, Math.min(BARS.length - 1, target))].t);
}
function seekSection(d) {
  const t = audio.time();
  let i = SECTIONS.findIndex((s) => s.t0 <= t && t < s.t1);
  if (d < 0 && t - SECTIONS[i].t0 > 1.0) d = 0;
  i = Math.max(0, Math.min(SECTIONS.length - 1, i + d));
  audio.seek(SECTIONS[i].t0);
}
window.addEventListener('keydown', (e) => {
  if (!ready) return;
  const k = e.key;
  if (k === ' ') { e.preventDefault(); if (!started) { start(); return; } audio.playing ? audio.pause() : audio.play(); document.body.classList.toggle('playing', audio.playing); }
  else if (k === 'ArrowRight') seekBars(e.shiftKey ? 8 : 1);
  else if (k === 'ArrowLeft') seekBars(e.shiftKey ? -8 : -1);
  else if (k === 'PageDown') seekSection(1);
  else if (k === 'PageUp') seekSection(-1);
  else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  else if (k === 'h' || k === 'H') { showHud = !showHud; $('hud').classList.toggle('hidden', !showHud); }
  else if (k === 'd' || k === 'D') { showDbg = !showDbg; $('dbg').classList.toggle('hidden', !showDbg); }
  else if (k === '[') audio.userOffset -= 0.01;
  else if (k === ']') audio.userOffset += 0.01;
  else if (k === 'q' || k === 'Q') { qi = (qi + 1) % QUALITY.length; setRes(...QUALITY[qi]); }
  else if (k === 'r' || k === 'R') { rec ? stopRecording() : startRecording(); }
});

// ------------------------------------------------------------------ recording (canvas + original audio -> webm)
let rec = null, chunks = [];
function startRecording() {
  if (!audio.buf) return;
  const vs = view.captureStream(60);
  const stream = new MediaStream([...vs.getVideoTracks(), ...audio.recDest.stream.getAudioTracks()]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 24e6, audioBitsPerSecond: 256e3 });
  chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    a.download = 'he-drowns-in-the-she.webm';
    a.click();
  };
  if (!started) { started = true; $('boot').classList.add('gone'); }
  audio.seek(0);
  audio.play();
  document.body.classList.add('playing');
  rec.start(1000);
}
function stopRecording() { if (rec && rec.state !== 'inactive') rec.stop(); rec = null; }

// ------------------------------------------------------------------ hooks for headless checks (tools/shoot.js)
window.__mv = {
  get ready() { return ready; },
  scenes: SCENE_LIST,
  renderAt(t, warm = 0.4) {
    // replay a short run-up so feedback trails are populated, then the requested frame
    hold = true;
    press.clearHistory = true;
    for (let tt = Math.max(0, t - warm); tt < t; tt += 1 / 60) frame(tt);
    frame(t);
    return true;
  },
  perf(t, n = 60) {
    hold = true;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) frame(t + i / 60);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); // forces the GPU to finish
    return (performance.now() - t0) / n;
  },
  audio,
  setRes,
  layers: () => ({ photo: photoC.toDataURL('image/jpeg', 0.8), ink: inkC.toDataURL('image/jpeg', 0.8) }),
  seaTest(o) { seaTest = o; },
  seaCompileMs,
  get shaderWaitMs() { return shaderWaitMs; },
  seaPerf(o, n = 40) {
    const S = Object.assign(seaDefaults(), o, { on: true });
    sea.render(S, RW, RH, 10, 5, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const t0 = performance.now();
    for (let i = 0; i < n; i++) sea.render(S, RW, RH, 10 + i / 60, 5 + i / 60, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); // forces the GPU to finish
    return (performance.now() - t0) / n;
  },
  seaH: (x, z, o, t) => seaHeightJS(x, z, Object.assign(seaDefaults(), o || {}), seaClock(t || 0)),
  get F() { return lastF; },
  get S() { return lastS; },
  px(layer, x, y) { const c = (layer === 'I' ? I : P); return [...c.getImageData(x * RW / 1920, y * RH / 1080, 1, 1).data]; },
};
boot();
