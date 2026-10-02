// Fetch images through a real (headless) Edge when a CDN refuses scripted requests.
//   node --experimental-websocket tools/fetch_browser.js name=url name2=url2 ...   -> assets/src/<name>.jpg
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const DBG = 9600 + Math.floor(Math.random() * 90);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => http.get(u, (r) => { let s = ''; r.on('data', (d) => (s += d)); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));
const jobs = process.argv.slice(2).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
(async () => {
  const br = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${DBG}`,
    `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'mvfetch-'))}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let tg; for (let i = 0; i < 60 && !tg; i++) { await sleep(200); try { tg = (await getJSON(`http://127.0.0.1:${DBG}/json`)).find((x) => x.type === 'page'); } catch (e) { /* retry */ } }
  const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const events = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method) events.push(m); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Network.enable', { maxResourceBufferSize: 50e6, maxTotalBufferSize: 200e6 });
  await send('Page.enable');
  for (const [name, url] of jobs) {
    events.length = 0;
    await send('Page.navigate', { url });
    let reqId = null, status = 0, done = false;
    for (let i = 0; i < 80 && !done; i++) {
      await sleep(250);
      for (const e of events) {
        if (e.method === 'Network.responseReceived' && e.params.response.url === url) { reqId = e.params.requestId; status = e.params.response.status; }
        if (e.method === 'Network.loadingFinished' && e.params.requestId === reqId) done = true;
      }
    }
    if (!reqId || status !== 200) { console.log('!!', name, 'status', status); continue; }
    const body = await send('Network.getResponseBody', { requestId: reqId });
    const buf = Buffer.from(body.result.body, body.result.base64Encoded ? 'base64' : 'utf8');
    fs.writeFileSync(path.join(ROOT, 'assets', 'src', name + '.jpg'), buf);
    console.log('ok', name, Math.round(buf.length / 1024), 'KB');
    await sleep(400);
  }
  ws.close(); br.kill(); process.exit(0);
})();
