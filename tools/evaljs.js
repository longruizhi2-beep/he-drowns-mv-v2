// evaluate an expression in the loaded MV page: node --experimental-websocket tools/evaljs.js "<expr>"
const { spawn } = require('child_process'); const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
const expr = process.argv[2]; const ROOT = path.resolve(__dirname, '..');
const PORT = 8300 + Math.floor(Math.random() * 30), DBG = 9950 + Math.floor(Math.random() * 40);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let s = ''; r.on('data', (d) => (s += d)); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js'), '--no-open'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const br = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'mvev-'))}`, '--window-size=1280,720', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let tg; for (let i = 0; i < 60 && !tg; i++) { await sleep(200); try { tg = (await getJSON(`http://127.0.0.1:${DBG}/json`)).find((x) => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.exception?.description); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  for (let i = 0; i < 200; i++) { await sleep(250); const r = await send('Runtime.evaluate', { expression: 'window.__mv && __mv.ready', returnByValue: true }); if (r.result?.result?.value) break; }
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result?.result?.value ?? r.result, null, 1));
  ws.close(); br.kill(); srv.kill(); process.exit(0);
})();
