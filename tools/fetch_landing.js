// Load a landing page in headless Edge and capture image responses from a host (for hotlink-protected CDNs).
//   node --experimental-websocket tools/fetch_landing.js name=landingUrl ...
const { spawn } = require('child_process'); const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..'); const DBG = 9700 + Math.floor(Math.random() * 90);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let s = ''; r.on('data', (d) => (s += d)); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));
const jobs = process.argv.slice(2).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
(async () => {
  const br = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'mvland-'))}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
  let tg; for (let i = 0; i < 60 && !tg; i++) { await sleep(200); try { tg = (await getJSON(`http://127.0.0.1:${DBG}/json`)).find((x) => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const events = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method) events.push(m); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Network.enable', { maxResourceBufferSize: 50e6, maxTotalBufferSize: 300e6 }); await send('Page.enable');
  for (const [name, url] of jobs) {
    events.length = 0;
    await send('Page.navigate', { url });
    await sleep(6000);
    const imgs = new Map();
    for (const e of events) if (e.method === 'Network.responseReceived' && /cdn\.stocksnap\.io/.test(e.params.response.url) && e.params.response.status === 200) imgs.set(e.params.requestId, e.params.response.url);
    const pageStatus = (events.find((e) => e.method === 'Network.responseReceived' && e.params.type === 'Document') || {}).params?.response?.status;
    let best = null;
    for (const [rid, u] of imgs) {
      const b = await send('Network.getResponseBody', { requestId: rid });
      if (!b.result) continue;
      const buf = Buffer.from(b.result.body, b.result.base64Encoded ? 'base64' : 'utf8');
      if (!best || buf.length > best.buf.length) best = { buf, u };
    }
    if (best && best.buf.length > 60000) { fs.writeFileSync(path.join(ROOT, 'assets', 'src', name + '.jpg'), best.buf); console.log('ok', name, Math.round(best.buf.length / 1024), 'KB', best.u); }
    else console.log('!!', name, 'page', pageStatus, 'cdn images', imgs.size);
  }
  ws.close(); br.kill(); process.exit(0);
})();
