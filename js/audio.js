// Web Audio playback with a sample-accurate song clock (output latency compensated).
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buf = null;
    this.src = null;
    this.playing = false;
    this.offset = 0;        // song time at startCtx
    this.startCtx = 0;      // context time when playback (re)started
    this.userOffset = 0;    // manual A/V trim, seconds ([ / ] keys)
    this.displayLead = 1 / 60; // render slightly ahead: the frame reaches the screen ~1 vsync later
    this.onEnded = null;
  }
  ensureCtx() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
    this.recDest = this.ctx.createMediaStreamDestination();
    this.gain.connect(this.recDest);
  }
  async loadUrl(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const total = +res.headers.get('Content-Length') || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (onProgress && total) onProgress(got / total);
    }
    const all = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { all.set(c, o); o += c.length; }
    return this.decode(all.buffer);
  }
  async loadFile(file) { return this.decode(await file.arrayBuffer()); }
  async decode(ab) {
    this.ensureCtx();
    this.buf = await this.ctx.decodeAudioData(ab);
    return this.buf;
  }
  get duration() { return this.buf ? this.buf.duration : 0; }
  play() {
    if (!this.buf || this.playing) return;
    this.ensureCtx();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.offset >= this.buf.duration - 0.05) this.offset = 0;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buf;
    src.connect(this.gain);
    const when = this.ctx.currentTime + 0.06;
    src.start(when, Math.max(0, this.offset));
    src.onended = () => {
      if (this.src !== src) return;
      this.playing = false;
      this.offset = this.buf.duration;
      this.src = null;
      if (this.onEnded) this.onEnded();
    };
    this.src = src;
    this.startCtx = when;
    this.playing = true;
  }
  pause() {
    if (!this.playing) return;
    this.offset = this.rawTime();
    const s = this.src;
    this.src = null;
    this.playing = false;
    try { s.stop(); } catch (e) { /* already stopped */ }
  }
  seek(t) {
    const was = this.playing;
    if (was) this.pause();
    this.offset = Math.max(0, Math.min(this.duration - 0.01, t));
    if (was) this.play();
  }
  rawTime() {
    if (!this.playing) return this.offset;
    let ct;
    const ts = this.ctx.getOutputTimestamp ? this.ctx.getOutputTimestamp() : null;
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) ct = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    else ct = this.ctx.currentTime - (this.ctx.outputLatency || this.ctx.baseLatency || 0);
    return Math.max(0, this.offset + (ct - this.startCtx));
  }
  // song time that the frame being rendered now should show
  time() { return this.rawTime() + this.userOffset + (this.playing ? this.displayLead : 0); }
}
