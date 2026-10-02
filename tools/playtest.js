// End-to-end check of the real playback path: serve.js -> fetch FLAC -> decodeAudioData -> play -> clock -> render loop.
//   node --experimental-websocket tools/playtest.js [seekSeconds]
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8330 + Math.floor(Math.random() * 30), DBG = 9800 + Math.floor(Math.random() * 90);
const BROWSER = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const seek = +(process.argv[2] || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let s = ''; r.on('data', (d) => (s += d)); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js'), '--no-open'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  await sleep(400);
  const br = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'mvplay-'))}`,
    '--window-size=1600,900', '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11', 'about:blank'], { stdio: 'ignore' });
  let tg; for (let i = 0; i < 60 && !tg; i++) { await sleep(200); try { tg = (await getJSON(`http://127.0.0.1:${DBG}/json`)).find((x) => x.type === 'page'); } catch (e) { /* retry */ } }
  const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); let errors = 0;
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') { errors++; console.log('EXCEPTION', m.params.exceptionDetails.exception?.description?.slice(0, 400)); }
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') { errors++; console.log('console.error', m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400)); }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  const t0 = Date.now();
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  let st = '';
  for (let i = 0; i < 240; i++) { await sleep(250); st = await ev("document.getElementById('bootStatus').textContent"); if (st && st.startsWith('準備完了')) break; }
  console.log('boot:', st, `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  console.log('audio duration', await ev('__mv.audio.duration'));
  await ev("document.getElementById('playBtn').click()");
  if (seek) await ev(`__mv.audio.seek(${seek})`);
  await sleep(600);
  // measure: song clock vs wall clock, and frames rendered
  const a = await ev('({ t: __mv.audio.time(), p: performance.now(), state: __mv.audio.ctx.state })');
  await ev('window.__frames = 0; (function f(){ window.__frames++; requestAnimationFrame(f); })(); 0');
  await sleep(4000);
  const b = await ev('({ t: __mv.audio.time(), p: performance.now(), frames: window.__frames, playing: __mv.audio.playing })');
  const dtWall = (b.p - a.p) / 1000, dtSong = b.t - a.t;
  console.log(`context ${a.state}; song ${a.t.toFixed(3)} -> ${b.t.toFixed(3)} (Δ ${dtSong.toFixed(3)} s) over wall ${dtWall.toFixed(3)} s; drift ${((dtSong - dtWall) * 1000).toFixed(1)} ms`);
  console.log(`rAF ${(b.frames / dtWall).toFixed(1)} fps; playing=${b.playing}; errors=${errors}`);
  ws.close(); br.kill(); srv.kill(); process.exit(0);
})();
