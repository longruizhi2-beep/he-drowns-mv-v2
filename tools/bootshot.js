// screenshot of the boot page + a record start/stop smoke test (no npm deps)
const { spawn } = require('child_process'); const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..'); const PORT = 8360 + Math.floor(Math.random() * 30), DBG = 9860 + Math.floor(Math.random() * 60);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let s = ''; r.on('data', (d) => (s += d)); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js'), '--no-open'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  await sleep(400);
  const br = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'mvboot-'))}`, '--window-size=1600,900', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let tg; for (let i = 0; i < 60 && !tg; i++) { await sleep(200); try { tg = (await getJSON(`http://127.0.0.1:${DBG}/json`)).find((x) => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); let errors = 0;
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') { errors++; console.log('EXC', m.params.exceptionDetails.exception?.description); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  for (let i = 0; i < 200; i++) { await sleep(250); const s = await ev("document.getElementById('bootStatus').textContent"); if (s && s.startsWith('準備完了')) break; }
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  fs.writeFileSync(path.join(__dirname, 'out', 'shots', 'boot.jpg'), Buffer.from(shot.result.data, 'base64'));
  // HUD check: play, seek into the odd-meter section, show timeline + debug, screenshot
  const key0 = async (k) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, text: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k }); };
  if (process.argv[2] === 'hud') {
    await ev("document.getElementById('playBtn').click()"); await sleep(300);
    await ev('__mv.audio.seek(128.4)'); await key0('h'); await key0('d'); await sleep(1500);
    const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    fs.writeFileSync(path.join(__dirname, 'out', 'shots', 'hud.jpg'), Buffer.from(s2.result.data, 'base64'));
    console.log('hud shot, errors', errors);
    ws.close(); br.kill(); srv.kill(); process.exit(0);
  }
  // record smoke test: press R, wait, press R
  const key = async (k) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, text: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k }); };
  await key('r'); await sleep(2500);
  const st = await ev('({ t: __mv.audio.time(), playing: __mv.audio.playing })');
  await key('r'); await sleep(800);
  console.log('record smoke test: playing', st.playing, 't', st.t.toFixed(2), 'errors', errors);
  ws.close(); br.kill(); srv.kill(); process.exit(0);
})();
