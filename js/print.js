// The "press": turns the two Canvas2D layers into a printed page.
//   photo layer = colour proof (white = bare paper). Separated into spot inks by optical density,
//                 each ink screened with its own angle (euclidean dot / line / grain), misregistered.
//   ink layer   = crisp solids for type: R = key (K), G = spot A, B = spot B coverage.
// Inks combine subtractively on a paper texture. A post pass adds feedback trails, negative print,
// chromatic split, xerox streaks, vignette, film grain and flashes.
import { program, texture, target, uploadCanvas, draw } from './gl.js';
import { hex } from './util.js';

const COMMON = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), u.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
`;

// static paper: r = mottling/fibre brightness factor, g = ink-void mask, b = coarse ink unevenness
const FS_PAPER = COMMON + `
uniform vec2 uRes;
void main() {
  vec2 px = vUv * uRes;
  float mott = fbm(px * .0035) - .5;
  float fib = 0.;
  for (int i = 0; i < 3; i++) {
    vec2 q = px * vec2(.9, .08) * (1. + float(i) * .7) + float(i) * 31.;
    fib += (vnoise(q * .35) - .5) * (.5 / (1. + float(i)));
  }
  float speck = step(.9985, h12(px * 1.37)) * .5;
  float bright = 1. - .045 * mott - .025 * fib - speck * .25 + (h12(px) - .5) * .018;
  float voids = step(.035, h12(px * .71 + 3.1)) * (1. - step(.9992, h12(px * .23)) );
  float uneven = fbm(px * .012 + 9.) ;
  o = vec4(bright, voids, uneven, 1.);
}`;

const FS_PRINT = COMMON + `
uniform sampler2D uPhoto, uInk, uPaperTex, uLut;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uPaper, uInkK, uInkA, uInkB, uDK, uDA, uDB;
uniform int uMode, uMonoInk, uScrType, uDuoInk;
uniform float uCell, uScrMix, uGrain, uPhotoAmt, uInkAmt;
uniform vec4 uAng;          // K, A, B, (process Y) screen angles
uniform vec2 uOffK, uOffA, uOffB;
uniform vec4 uTone;         // contrast, gamma, lo, hi
uniform vec4 uXf;           // zoom, rotation, dx, dy
uniform float uWet, uBleed, uPaperAmt;
uniform vec4 uRip;          // centre.xy (uv), phase, amplitude
uniform vec4 uWater;        // amount, caustics, rays, depth darkening
uniform vec3 uWaterCol;
uniform float uWaterScale, uSlit;
uniform vec3 uOutside;
uniform sampler2D uBack;
uniform int uBackMode;      // 0 paper, 1 raw 3D behind the page, 2 3D printed like a photograph
uniform int uInkLight;      // 0 ink (subtractive), 1 light (screen) - for type over dark 3D
uniform vec3 uLightK, uLightA, uLightB;
uniform vec4 uDuo;          // duotone: K from, K to, A from, A to (in darkness units)

vec2 camUv(vec2 uv) {
  vec2 p = (uv - .5) * uRes;
  float c = cos(uXf.y), s = sin(uXf.y);
  p = mat2(c, s, -s, c) * p / uXf.x;
  p -= uXf.zw * uRes;
  return p / uRes + .5;
}
vec2 wetUv(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.);
  if (uWet > 0.) {
    vec2 q = uv * asp * 2.2;
    vec2 d = vec2(fbm(q + vec2(0., uTime * .11)), fbm(q + vec2(5.2, 1.3 - uTime * .09))) - .5;
    uv += d * uWet * .05;
  }
  if (uRip.w > 0.) {
    vec2 d = (uv - uRip.xy) * asp;
    float r = length(d);
    float w = sin(r * 60. - uRip.z * 12.) * exp(-r * 4.) * smoothstep(uRip.z * .9 + .05, uRip.z * .9 - .05, r);
    uv += normalize(d + 1e-5) * w * uRip.w * .012;
  }
  if (uSlit > 0.) {  // slit-scan / strip displacement
    float band = floor(uv.x * 5.);
    uv.y += (h12(vec2(band, floor(uTime * 5.46))) - .5) * uSlit;
  }
  return uv;
}
float caustic(vec2 uv, float time) {
  vec2 p = mod(uv * 6.2831, 6.2831) - 250.;
  vec2 i = p;
  float c = 1.;
  for (int n = 0; n < 5; n++) {
    float t = time * (1. - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + t) / .005), p.y / (cos(i.y + t) / .005)));
  }
  c /= 5.;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.), 0., 1.);
}
float water(vec2 uv) {  // 0 = light, 1 = deep ink
  vec2 asp = vec2(uRes.x / uRes.y, 1.);
  float t = uTime * .35;
  float caus = caustic(uv * asp * uWaterScale * .5, uTime * .5 + 23.);
  float sx = uv.x + (1. - uv.y) * .35;
  float rays = smoothstep(.55, 1., vnoise(vec2(sx * 7., t * .6))) * .8 + smoothstep(.6, 1., vnoise(vec2(sx * 17. + 3., t * .9))) * .5;
  rays *= smoothstep(.1, 1., uv.y);
  float depth = mix(.45, 1., 1. - uv.y);
  float dark = uWater.w * depth;
  float light = uWater.y * caus * mix(.5, 1., uv.y) + uWater.z * rays * .6;
  return clamp(dark - light, 0., 1.);
}
vec3 proof(vec2 uv) {
  vec4 tp = texture(uPhoto, uv);
  vec3 c = tp.rgb;
  if (uBackMode == 2) c = mix(texture(uBack, clamp(uv, 0., 1.)).rgb, c, tp.a);
  else c = mix(vec3(1.), c, tp.a);
  c = clamp((c - uTone.z) / max(uTone.w - uTone.z, 1e-3), 0., 1.);
  c = clamp((c - .5) * uTone.x + .5, 0., 1.);
  c = pow(c, vec3(uTone.y));
  if (uWater.x > 0.) {
    float w = water(uv);
    c *= mix(vec3(1.), mix(vec3(1.), uWaterCol, w), uWater.x);
  }
  return mix(vec3(1.), c, uPhotoAmt);
}
float toArea(float cd, vec3 ink) {
  float L = clamp(dot(ink, vec3(.299, .587, .114)), .03, .97);
  return clamp((1. - pow(L, cd)) / (1. - L), 0., 1.);
}
vec3 sepSpot(vec3 col) {
  vec3 d = max(-log(max(col / uPaper, vec3(.002))), 0.);
  float cK = min(min(d.r / uDK.r, d.g / uDK.g), d.b / uDK.b);
  vec3 r = max(d - cK * uDK, 0.);
  float aa = dot(uDA, uDA), ab = dot(uDA, uDB), bb = dot(uDB, uDB);
  float ra = dot(r, uDA), rb = dot(r, uDB);
  float det = aa * bb - ab * ab;
  float cA = (ra * bb - rb * ab) / max(det, 1e-5);
  float cB = (rb * aa - ra * ab) / max(det, 1e-5);
  if (cA < 0.) { cA = 0.; cB = rb / bb; }
  if (cB < 0.) { cB = 0.; cA = ra / aa; }
  return vec3(toArea(cK, uInkK), toArea(max(cA, 0.), uInkA), toArea(max(cB, 0.), uInkB));
}
float lum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
float spotfn(vec2 px, float ang, float cell) {
  float s = sin(ang), c = cos(ang);
  vec2 p = mat2(c, -s, s, c) * px / cell;
  if (uScrType == 1) return .5 + .5 * cos(6.2831853 * p.y);
  return .5 + .25 * (cos(6.2831853 * p.x) + cos(6.2831853 * p.y));
}
float screenInk(float cov, vec2 px, float ang, float cell, float salt) {
  if (uScrMix <= 0.) return cov;
  float th;
  if (uScrType == 2) {
    vec2 g = px / uGrain;
    th = mix(h12(floor(g) + salt * 13.1), vnoise(g * 1.9 + salt * 7.), .3);
  } else {
    float s = spotfn(px, ang, cell);
    th = uScrType == 1 ? 1. - acos(2. * s - 1.) / 3.14159265 : texture(uLut, vec2(s, .5)).r;
  }
  float aa = max(fwidth(th), 1e-3) * .8;
  // (no ink at all must print no dots: the antialiasing band would otherwise leave a speck in every cell)
  return cov <= .002 ? 0. : mix(cov, smoothstep(th - aa, th + aa, cov), uScrMix);
}
void main() {
  vec2 cu = camUv(vUv);
  vec2 px = cu * uRes;
  vec2 uv = wetUv(cu);
  vec2 oK = uOffK / uRes, oA = uOffA / uRes, oB = uOffB / uRes;
  vec4 pap = texture(uPaperTex, fract(cu));
  vec3 paper = uPaper * mix(1., pap.r, uPaperAmt);
  vec3 col = paper;
  bool outside = cu.x < 0. || cu.y < 0. || cu.x > 1. || cu.y > 1.;
  // ---------------- photo layer
  vec3 cov = vec3(0.);
  if (uMode == 1) {
    vec3 p0 = proof(uv + oA), p1 = proof(uv + oB), p2 = proof(uv - oK), p3 = proof(uv + oK);
    float k0 = 1. - max(max(p0.r, p0.g), p0.b); float C = (1. - p0.r - k0) / max(1. - k0, 1e-3);
    float k1 = 1. - max(max(p1.r, p1.g), p1.b); float M = (1. - p1.g - k1) / max(1. - k1, 1e-3);
    float k2 = 1. - max(max(p2.r, p2.g), p2.b); float Y = (1. - p2.b - k2) / max(1. - k2, 1e-3);
    float K = 1. - max(max(p3.r, p3.g), p3.b);
    C = screenInk(C, px, .2618, uCell, 1.); M = screenInk(M, px, 1.309, uCell, 2.);
    Y = screenInk(Y, px, 0., uCell, 3.);   K = screenInk(K, px, .7854, uCell, 4.);
    col *= 1. - C * (1. - vec3(0., .62, .9));
    col *= 1. - M * (1. - vec3(.92, .08, .52));
    col *= 1. - Y * (1. - vec3(1., .93, 0.));
    col *= 1. - K * (1. - uInkK);
  } else if (uMode == 3) {
    col *= proof(uv);
  } else {
    if (uMode == 0) {
      cov = vec3(sepSpot(proof(uv + oK)).x, sepSpot(proof(uv + oA)).y, sepSpot(proof(uv + oB)).z);
    } else if (uMode == 2) {
      float d = 1. - lum(proof(uv + (uMonoInk == 0 ? oK : uMonoInk == 1 ? oA : oB)));
      cov = uMonoInk == 0 ? vec3(d, 0, 0) : uMonoInk == 1 ? vec3(0, d, 0) : vec3(0, 0, d);
    } else {
      float dK = 1. - lum(proof(uv + oK)), dA = 1. - lum(proof(uv + (uDuoInk == 2 ? oB : oA)));
      float sp = smoothstep(uDuo.z, uDuo.w, dA);
      cov = vec3(smoothstep(uDuo.x, uDuo.y, dK), uDuoInk == 1 ? sp : 0., uDuoInk == 2 ? sp : 0.);
    }
    cov.x = screenInk(cov.x, px, uAng.x, uCell, 1.);
    cov.y = screenInk(cov.y, px, uAng.y, uCell * 1.02, 2.);
    cov.z = screenInk(cov.z, px, uAng.z, uCell * .98, 3.);
  }
  if (outside) cov = vec3(0.);
  // ---------------- riso texture on the photo inks
  float uneven = mix(.86, 1., pap.b);
  float voidm = mix(1., pap.g, .85);
  cov *= uneven * voidm;
  col *= 1. - cov.x * (1. - uInkK);
  col *= 1. - cov.y * (1. - uInkA);
  col *= 1. - cov.z * (1. - uInkB);
  // ---------------- raw 3D behind the page (where the page has been cut away)
  if (uBackMode == 1) {
    float pa = texture(uPhoto, uv).a;
    col = mix(texture(uBack, clamp(uv, 0., 1.)).rgb, col, pa);
  }
  // ---------------- ink (type) layer
  vec3 tk = vec3(texture(uInk, uv + oK).r, texture(uInk, uv + oA).g, texture(uInk, uv + oB).b);
  if (uBleed > 0.) {
    vec2 e = uBleed / uRes;
    vec3 b = (texture(uInk, uv + vec2(e.x, 0)).rgb + texture(uInk, uv - vec2(e.x, 0)).rgb + texture(uInk, uv + vec2(0, e.y)).rgb + texture(uInk, uv - vec2(0, e.y)).rgb) * .25;
    tk = max(tk, smoothstep(.15, .9, b) * .85);
  }
  tk *= uInkAmt;
  if (uInkLight == 1) {
    col = 1. - (1. - col) * (1. - tk.x * uLightK) * (1. - tk.y * uLightA) * (1. - tk.z * uLightB);
  } else {
    tk *= uneven * voidm;
    col *= 1. - tk.x * (1. - uInkK);
    col *= 1. - tk.y * (1. - uInkA);
    col *= 1. - tk.z * (1. - uInkB);
  }
  if (outside) {
    vec2 e = max(-cu, cu - 1.);
    float dd = max(e.x * uRes.x / uRes.y, e.y);
    col = uOutside * (1. - .55 * exp(-dd * 40.)) + (h12(px * .5) - .5) * .01;
  }
  o = vec4(col, 1.);
}`;

const FS_POST = COMMON + `
uniform sampler2D uSrc, uPrev;
uniform vec2 uRes;
uniform float uTrail, uNeg, uCA, uZoomBlur;
uniform vec4 uTrailXf;
uniform int uTrailMode;
void main() {
  vec2 uv = vUv;
  vec3 c;
  if (uCA > 0.) {
    vec2 d = (uv - .5) * uCA / uRes.x * 2.;
    c = vec3(texture(uSrc, uv + d).r, texture(uSrc, uv).g, texture(uSrc, uv - d).b);
  } else c = texture(uSrc, uv).rgb;
  if (uZoomBlur > 0.) {
    vec3 acc = c;
    vec2 d = uv - .5;
    for (int i = 1; i < 10; i++) acc += texture(uSrc, uv - d * uZoomBlur * float(i) / 10.).rgb;
    c = acc / 10.;
  }
  c = mix(c, vec3(1.) - c, uNeg);
  if (uTrail > 0.) {
    vec2 p = (uv - .5) * uRes;
    float cs = cos(uTrailXf.y), sn = sin(uTrailXf.y);
    p = mat2(cs, sn, -sn, cs) * p / uTrailXf.x - uTrailXf.zw * uRes;
    vec3 pr = texture(uPrev, p / uRes + .5).rgb;
    if (uTrailMode == 1) c = mix(c, min(c, pr), uTrail);
    else if (uTrailMode == 2) c = mix(c, max(c, pr), uTrail);
    else c = mix(c, pr, uTrail);
  }
  o = vec4(c, 1.);
}`;

const FS_FINAL = COMMON + `
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uTime, uVig, uGrainAmt, uXerox, uGain;
uniform vec4 uFlash;
void main() {
  vec2 uv = vUv;
  vec3 c = texture(uSrc, uv).rgb;
  if (uXerox > 0.) {
    float row = floor(uv.y * uRes.y / 3.);
    float n = h12(vec2(row, floor(uTime * 24.)));
    float streak = step(1. - uXerox * .12, n) * (h12(vec2(row * 1.7, uTime)) * .6 + .2);
    c = mix(c, vec3(dot(c, vec3(.33))), streak * .5) * (1. - streak * .35);
    c *= 1. - uXerox * .05 * smoothstep(.2, .0, abs(fract(uv.x * 1.3 + uTime * .02) - .5));
  }
  vec2 q = uv - .5;
  c *= mix(1., smoothstep(.95, .25, length(q * vec2(1.05, 1.2))), uVig);
  float g = h12(uv * uRes + fract(uTime * 43.7) * 311.) - .5;
  c += g * uGrainAmt;
  c *= uGain;
  c = mix(c, uFlash.rgb, clamp(uFlash.a, 0., 1.));
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

export const INKS = {
  black: '#1d1b1c', sumi: '#23201f', red: '#e8352e', scarlet: '#f25a55', crimson: '#c8102e', pink: '#ff48b0',
  teal: '#00838a', green: '#00a95c', moss: '#43794d', blue: '#0078bf', ultramarine: '#2b3aa0', navy: '#1e2a4a',
  sea: '#3a6f8f', orange: '#ff6c2f', yellow: '#ffd200', gold: '#b49b57', purple: '#765ba7', white: '#ffffff', paper: '#efebe2',
};

export function defaults() {
  return {
    paper: INKS.paper, outside: '#141312', inkK: INKS.black, inkA: INKS.red, inkB: INKS.teal,
    mode: 0, monoInk: 0, duoInk: 2, cell: 7, scrType: 0, scrMix: 1, grain: 2.2, photoAmt: 1, inkAmt: 1,
    ang: [0.7854, 0.2618, 1.309, 0], offK: [0, 0], offA: [0, 0], offB: [0, 0],
    tone: [1, 1, 0, 1], xf: [1, 0, 0, 0], wet: 0, bleed: 0, paperAmt: 1, rip: [0.5, 0.5, 0, 0],
    water: [0, 0, 0, 0], waterCol: [0.2, 0.35, 0.4], waterScale: 1.4, slit: 0, duo: [0.25, 1.0, 0.0, 0.8],
    trail: 0, trailXf: [1, 0, 0, 0], trailMode: 0, neg: 0, ca: 0, zoomBlur: 0,
    backMode: 0, inkLight: 0, lightK: '#f4f1ea', lightA: '#ff3b30', lightB: '#47d6e6',
    vig: 0.35, grainAmt: 0.035, xerox: 0, gain: 1, flash: [1, 1, 1, 0],
  };
}

export class Press {
  constructor(gl, W, H) {
    this.gl = gl;
    this.W = W; this.H = H;
    this.pPaper = program(gl, FS_PAPER, 'paper');
    this.pPrint = program(gl, FS_PRINT, 'print');
    this.pPost = program(gl, FS_POST, 'post');
    this.pFinal = program(gl, FS_FINAL, 'final');
    this.photoTex = texture(gl, 4, 4);
    this.inkTex = texture(gl, 4, 4);
    this.resize(W, H);
    // tone-response LUT for the euclidean dot: maps spot value -> area fraction (CDF)
    const N = 512, bins = new Float64Array(1024);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const s = 0.5 + 0.25 * (Math.cos((2 * Math.PI * (i + 0.5)) / N) + Math.cos((2 * Math.PI * (j + 0.5)) / N));
      bins[Math.min(1023, Math.floor(s * 1024))]++;
    }
    const lut = new Uint8Array(256 * 4);
    let acc = 0; const cdf = new Float64Array(1024);
    for (let i = 0; i < 1024; i++) { acc += bins[i]; cdf[i] = acc / (N * N); }
    for (let i = 0; i < 256; i++) { const v = Math.round(cdf[Math.min(1023, Math.floor(((i + 0.5) / 256) * 1024))] * 255); lut.set([v, v, v, 255], i * 4); }
    this.lutTex = texture(gl, 256, 1, { data: lut });
  }
  resize(W, H) {
    const gl = this.gl;
    this.W = W; this.H = H;
    this.paperRT = target(gl, W, H);
    this.printRT = target(gl, W, H);
    this.fb = [target(gl, W, H), target(gl, W, H)];
    this.cur = 0;
    this.pPaper.use({ uRes: [W, H] });
    draw(gl, this.paperRT);
    this.clearHistory = true;
  }
  printUniforms(F, time, back) {
    const K = hex(F.inkK), Aa = hex(F.inkA), B = hex(F.inkB);
    const dens = (c) => c.map((v) => -Math.log(Math.max(v, 0.02)));
    return {
      uPhoto: this.photoTex, uInk: this.inkTex, uPaperTex: this.paperRT.tex, uLut: this.lutTex,
      uRes: [this.W, this.H], uTime: time,
      uPaper: hex(F.paper), uInkK: K, uInkA: Aa, uInkB: B, uDK: dens(K), uDA: dens(Aa), uDB: dens(B),
      uMode: F.mode, uMonoInk: F.monoInk, uDuoInk: F.duoInk, uScrType: F.scrType, uCell: F.cell, uScrMix: F.scrMix, uGrain: F.grain,
      uPhotoAmt: F.photoAmt, uInkAmt: F.inkAmt, uAng: F.ang, uOffK: F.offK, uOffA: F.offA, uOffB: F.offB,
      uTone: F.tone, uXf: F.xf, uWet: F.wet, uBleed: F.bleed, uPaperAmt: F.paperAmt, uRip: F.rip,
      uWater: F.water, uWaterCol: F.waterCol, uWaterScale: F.waterScale, uSlit: F.slit, uDuo: F.duo, uOutside: hex(F.outside),
      uBack: back || this.paperRT.tex, uBackMode: back ? F.backMode : 0, uInkLight: F.inkLight,
      uLightK: hex(F.lightK), uLightA: hex(F.lightA), uLightB: hex(F.lightB),
    };
  }
  empties() {
    if (!this.emptyPhoto) {
      this.emptyPhoto = texture(this.gl, 1, 1, { data: new Uint8Array([0, 0, 0, 0]) });
      this.emptyInk = texture(this.gl, 1, 1, { data: new Uint8Array([0, 0, 0, 255]) });
    }
    return { photo: this.emptyPhoto, ink: this.emptyInk };
  }
  upload(photoCanvas, inkCanvas) {
    uploadCanvas(this.gl, this.photoTex, photoCanvas);
    uploadCanvas(this.gl, this.inkTex, inkCanvas);
  }
  // print only the page (no 3D behind it) into its own target, e.g. to float it in the 3D sea
  printPage(photoCanvas, inkCanvas, F, time, opts = {}) {
    const gl = this.gl;
    if (!this.pageRT || this.pageRT.w !== this.W) this.pageRT = target(gl, this.W, this.H);
    this.upload(photoCanvas, inkCanvas);
    const u = this.printUniforms({ ...F, xf: [1, 0, 0, 0], wet: 0, rip: [0.5, 0.5, 0, 0], inkLight: 0 }, time, null);
    if (opts.noInk) u.uInk = this.empties().ink;
    this.pPrint.use(u);
    draw(gl, this.pageRT);
    return this.pageRT;
  }
  render(photoCanvas, inkCanvas, F, time, back = null, opts = {}) {
    const gl = this.gl;
    if (opts.backOnly) {
      // the frame is the 3D render itself: print an empty, transparent page over it
      const e = this.empties();
      const u = this.printUniforms({ ...F, backMode: 1 }, time, back);
      u.uPhoto = e.photo;
      if (!opts.keepInk) u.uInk = e.ink; else this.upload(photoCanvas, inkCanvas);
      this.pPrint.use(u);
    } else {
      this.upload(photoCanvas, inkCanvas);
      this.pPrint.use(this.printUniforms(F, time, back));
    }
    draw(gl, this.printRT);
    const prev = this.fb[this.cur], next = this.fb[1 - this.cur];
    this.pPost.use({
      uSrc: this.printRT.tex, uPrev: prev.tex, uRes: [this.W, this.H],
      uTrail: this.clearHistory ? 0 : F.trail, uTrailXf: F.trailXf, uTrailMode: F.trailMode, uNeg: F.neg, uCA: F.ca, uZoomBlur: F.zoomBlur,
    });
    draw(gl, next);
    this.clearHistory = false;
    this.cur = 1 - this.cur;
    this.pFinal.use({
      uSrc: next.tex, uRes: [this.W, this.H], uTime: time, uVig: F.vig, uGrainAmt: F.grainAmt, uXerox: F.xerox,
      uGain: F.gain, uFlash: F.flash,
    });
    draw(gl, null);
  }
}
