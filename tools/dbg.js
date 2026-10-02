// debug: render t, dump photo/ink layers + frame params
const { spawn } = require('child_process'); const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
const t = +process.argv[2] || 2; const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(__dirname, 'out', 'shots');
const PORT = 8260 + Math.floor(Math.random() * 30), DBG = 9900 + Math.floor(Math.random() * 90);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let s = ''; r.on('data', (d) => (s += d)); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js'), '--no-open'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const br = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'mvdbg-'))}`, '--window-size=1920,1080', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let tg; for (let i = 0; i < 60 && !tg; i++) { await sleep(200); try { tg = (await getJSON(`http://127.0.0.1:${DBG}/json`)).find((x) => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.exception?.description); else if (m.method === 'Runtime.consoleAPICalled') console.log('console', m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 3000)); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.result?.exceptionDetails) console.log('ERR', r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
  await send('Runtime.enable'); await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  for (let i = 0; i < 200; i++) { await sleep(250); if (await ev('window.__mv && __mv.ready')) break; }
  await ev(`__mv.renderAt(${t}, 0)`);
  const L = await ev('__mv.layers()');
  fs.writeFileSync(path.join(OUT, 'dbg_photo.jpg'), Buffer.from(L.photo.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(OUT, 'dbg_ink.jpg'), Buffer.from(L.ink.split(',')[1], 'base64'));
  console.log(JSON.stringify(await ev('__mv.F')));
  ws.close(); br.kill(); srv.kill(); process.exit(0);
})();
