// Headless frame grabber: drives Edge/Chrome over the DevTools protocol (no npm deps).
//   node --experimental-websocket tools/shoot.js [--w=1280] [--warm=0.5] [--prefix=s] [--sheet=name] t1 t2 ...
// Frames -> tools/out/shots/<prefix>_<t>.jpg ; optional contact sheet via python (Pillow).
const { spawn, execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const times = args.filter((a) => !a.startsWith('--')).map(Number);
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const W = +(opt.w || 1920), H = Math.round(W * 9 / 16);
const PORT = 8190 + Math.floor(Math.random() * 60);
const DBG = 9400 + Math.floor(Math.random() * 400);
const BROWSER = opt.browser || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => { let s = ''; res.on('data', (d) => (s += d)); res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } }); }).on('error', reject);
});

(async () => {
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js'), '--no-open'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mvshot-'));
  const br = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
    '--hide-scrollbars', '--mute-audio', '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization', '--use-angle=d3d11', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(200);
    try { target = (await getJSON(`http://127.0.0.1:${DBG}/json`)).find((t) => t.type === 'page'); } catch (e) { /* retry */ }
  }
  if (!target) { console.error('no browser target'); process.exit(1); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === 'Runtime.consoleAPICalled') console.log('[console.' + m.params.type + ']', m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 2000));
    else if (m.method === 'Runtime.exceptionThrown') console.log('[exception]', (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 2000));
  };
  const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJS = async (expr, await_ = false) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: await_ });
    if (r.result?.exceptionDetails) console.log('[eval error]', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  let ok = false;
  for (let i = 0; i < 240; i++) { await sleep(250); if (await evalJS('window.__mv && window.__mv.ready')) { ok = true; break; } }
  if (!ok) { console.error('page not ready:', await evalJS("document.getElementById('bootStatus')?.textContent")); }
  console.log('renderer:', await evalJS("(()=>{const gl=document.getElementById('view').getContext('webgl2');const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'})()"));
  if (opt.res) await evalJS(`__mv.setRes(${opt.res.split('x').join(',')})`);
  const prefix = opt.prefix || 't';
  const files = [];
  if (opt.seafile) {
    // render named sea configurations: [{ name, t, S }]
    for (const cfg of JSON.parse(fs.readFileSync(opt.seafile, 'utf8'))) {
      await evalJS(`__mv.seaTest(${JSON.stringify(cfg.S)})`);
      await evalJS(`__mv.renderAt(${cfg.t ?? 10}, ${opt.warm ?? 0.2})`);
      const data = await evalJS(`document.getElementById('view').toDataURL('image/jpeg', 0.9)`);
      const f = path.join(OUT, `${prefix}_${cfg.name}.jpg`);
      fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
      files.push(f);
      console.log('shot', cfg.name);
    }
    await evalJS('__mv.seaTest(null)');
  }
  for (const t of times) {
    await evalJS(`__mv.renderAt(${t}, ${opt.warm ?? 0.5})`);
    const data = await evalJS(`document.getElementById('view').toDataURL('image/jpeg', 0.9)`);
    const f = path.join(OUT, `${prefix}_${t.toFixed(2).padStart(7, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
    files.push(f);
    console.log('shot', t, f);
  }
  if (opt.perf) console.log('ms/frame', await evalJS(`__mv.perf(${times[0] || 60}, 90)`));
  ws.close();
  br.kill();
  srv.kill();
  if (opt.sheet && files.length) {
    const py = `
import sys
from PIL import Image, ImageDraw
fs = sys.argv[2:]
cols = min(int(sys.argv[1]), len(fs))
tw = 640; th = 360
rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 22)), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 22)
    sheet.paste(im, (x, y))
    d.text((x + 6, y + th + 4), f.split('_')[-1][:-4], fill=(255, 220, 0))
sheet.save(sys.argv[1 + len(fs) + 1] if False else '${path.join(OUT, opt.sheet + '.jpg').replace(/\\/g, '/')}', quality=88)
`;
    fs.writeFileSync(path.join(OUT, '_sheet.py'), py);
    execFileSync('python', [path.join(OUT, '_sheet.py'), String(opt.cols || 3), ...files], { stdio: 'inherit' });
    console.log('sheet', path.join(OUT, opt.sheet + '.jpg'));
  }
  process.exit(0);
})();
