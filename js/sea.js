// The sea, in 3D. A ray-marched height-field ocean (choppy wave octaves + a travelling giant swell + drop
// ripples) under a night sky with a textured moon; below the surface: Snell's window, light shafts, depth fog,
// drifting particles. The waterline is decided per pixel at the lens, so a camera at the surface splits the frame.
// Floating cards (photos from a texture array, or the printed page itself) are intersected as rectangles.
import { program, target, draw } from './gl.js';
import { hex } from './util.js';
const lin = (h) => hex(h).map((v) => Math.pow(v, 2.2));
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

const FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uTime, uSeaT;
uniform vec3 uCamPos, uCamR, uCamU, uCamF;
uniform float uTanFov;
uniform vec4 uWave;        // height, choppy, freq, foam
uniform vec4 uSwell;       // origin x, origin z, amplitude, width
uniform vec4 uSwell2;      // dir x, dir z, travelled distance, front steepness
uniform vec4 uRip[8];      // x, z, age, amplitude
uniform vec3 uMoonDir;
uniform vec4 uMoon;        // angular radius, glow, brightness, texture flag
uniform vec3 uMoonCol;
uniform sampler2D uMoonTex;
uniform vec3 uSkyTop, uSkyHor, uWaterDeep, uWaterScat, uFogCol, uLightCol;
uniform vec4 uSky;         // stars, clouds, fog density, exposure
uniform vec4 uUnder;       // underwater fog, shafts, particles, depth darkening
uniform float uLightning, uCity, uRain;
uniform vec3 uBoltDir;
uniform float uSkyFog;     // how much of the haze lies over the sky itself (1 = all of it)     // where the lightning is (it lights that part of the sky most)
uniform vec2 uCityAz;
uniform sampler2D uCityTex;
uniform vec4 uCardC[6];    // centre xyz, layer (-1 = page)
uniform vec4 uCardU[6];    // half-width axis xyz, alpha
uniform vec4 uCardV[6];    // half-height axis xyz, glow
uniform int uNumCards;
uniform sampler2DArray uCards;
uniform sampler2D uPage;
uniform vec3 uGrade;       // colour grade multiplier
uniform int uNumViews;     // >0: the frame is split into viewports, each with its own camera
uniform vec4 uViewRect[5]; // x0, y0, x1, y1 in uv space (y up)
uniform vec3 uViewPos[5], uViewR[5], uViewU[5], uViewF[5];
uniform float uViewFov[5];
uniform vec4 uViewGrade[5]; // per-view tint (rgb) and amount (a)
uniform float uGradeSat;

const float PI = 3.14159265;
#define ZERO min(int(uRes.x), 0)
float hash(vec2 p) { float h = dot(p, vec2(127.1, 311.7)); return fract(sin(h) * 43758.5453123); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return -1. + 2. * mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0., a = .5; for (int i = ZERO; i < 5; i++) { s += a * noise(p); p = p * 2.02 + 3.1; a *= .5; } return s; }

// ---------------------------------------------------------------- sea height field
// integer hash: identical in GLSL (uint) and JS (Math.imul) so the camera can ride the exact same waves
float ihash(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)));
  uint h = (q.x * 0x8da6b343u) ^ (q.y * 0xd8163841u);
  h ^= h >> 16; h *= 0x7feb352du; h ^= h >> 15; h *= 0x846ca68bu; h ^= h >> 16;
  return float(h) * (1. / 4294967295.);
}
float inoise(vec2 p) {
  vec2 i = floor(p), f = p - i;
  vec2 u = f * f * (3. - 2. * f);
  return -1. + 2. * mix(mix(ihash(i), ihash(i + vec2(1, 0)), u.x), mix(ihash(i + vec2(0, 1)), ihash(i + vec2(1, 1)), u.x), u.y);
}
float seaOctave(vec2 uv, float choppy) {
  uv += inoise(uv);
  vec2 wv = 1. - abs(sin(uv));
  vec2 swv = abs(cos(uv));
  wv = mix(wv, swv, wv);
  return pow(1. - pow(wv.x * wv.y, .65), choppy);
}
float swell(vec2 xz) {
  if (uSwell.z == 0.) return 0.;
  vec2 dir = uSwell2.xy;
  vec2 rel = xz - uSwell.xy;
  float d = dot(rel, dir) - uSwell2.z;
  float w = uSwell.w;
  float k = d > 0. ? w * mix(1., .38, uSwell2.w) : w * 1.35;
  float lat = dot(rel, vec2(-dir.y, dir.x));
  float fade = exp(-lat * lat / (w * w * 90.));
  return uSwell.z * exp(-d * d / (k * k)) * fade;
}
float ripples(vec2 xz) {
  float h = 0.;
  for (int i = ZERO; i < 8; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.) continue;
    float d = length(xz - r.xy);
    float front = r.z * 2.4;
    float env = exp(-abs(d - front) * 1.2) * exp(-r.z * .55);
    h += r.w * sin((d - front) * 6.) * env;
  }
  return h;
}
const mat2 OCT = mat2(1.6, 1.2, -1.2, 1.6);
float seaH(vec2 xz, int iters) {
  float freq = uWave.z, amp = uWave.x, choppy = uWave.y;
  vec2 uv = xz; uv.x *= .75;
  float h = 0.;
  for (int i = ZERO; i < 5; i++) {
    if (i >= iters) break;
    float d = seaOctave((uv + uSeaT) * freq, choppy);
    d += seaOctave((uv - uSeaT) * freq, choppy);
    h += d * amp;
    uv *= OCT; freq *= 1.9; amp *= .22;
    choppy = mix(choppy, 1., .2);
  }
  return h + swell(xz) + ripples(xz) - uWave.x * .9;
}
float mapG(vec3 p) { return p.y - seaH(p.xz, 3); }
vec3 seaNormal(vec3 p, float eps) {
  vec3 hs = vec3(0.);
  for (int i = ZERO; i < 3; i++) {
    vec2 o2 = i == 1 ? vec2(eps, 0.) : i == 2 ? vec2(0., eps) : vec2(0.);
    hs[i] = seaH(p.xz + o2, 5);
  }
  return normalize(vec3(hs.x - hs.y, eps, hs.x - hs.z));
}
// find the surface along a ray, from above (sgn = 1) or from below (sgn = -1); returns -1 if none.
// One loop, one height-field call site (keeps ANGLE/fxc compile time down): adaptive march in the near field
// (catches a giant swell above the horizon), a jump to the horizon for downward rays, then secant refinement.
float traceSurface(vec3 ro, vec3 rd, float sgn, out vec3 p) {
  float ta = 0.;
  // from above: skip the empty air over the highest possible crest
  float maxH = uWave.x * 1.4 + uSwell.z + .3;
  if (sgn > 0. && ro.y > maxH) {
    if (rd.y >= 0.) { p = ro + rd * 600.; return -1.; }
    ta = (ro.y - maxH) / -rd.y;
  }
  float ha = sgn * mapG(ro + rd * ta);
  float tb = 0., hb = 0.;
  float t = 0.;
  int phase = 0;        // 0 march, 1 jumped to the far point, 2 refine
  for (int i = ZERO; i < 72; i++) {
    if (phase == 0) t = ta + max(abs(ha) * .5, .04 + ta * .014);
    else if (phase == 1) t = 600.;
    else t = mix(ta, tb, ha / (ha - hb));
    float h = sgn * mapG(ro + rd * t);
    if (phase == 2) {
      if (h < 0.) { tb = t; hb = h; } else { ta = t; ha = h; }
      if (i > 62 || abs(h) < .002) break;
      continue;
    }
    if (h < 0.) { tb = t; hb = h; phase = 2; continue; }
    if (phase == 1) { p = ro + rd * 600.; return -1.; }
    ta = t; ha = h;
    if (t > 90. || i > 54) phase = 1;
  }
  if (phase != 2) { p = ro + rd * 600.; return -1.; }
  t = mix(ta, tb, ha / (ha - hb));
  p = ro + rd * t;
  return t;
}

// ---------------------------------------------------------------- sky
// the distant city's glow on the low sky and in the haze (light pollution under the clouds)
vec3 cityGlow(vec3 rd) {
  if (uCity <= 0.) return vec3(0.);
  float az = atan(rd.x, -rd.z);
  float u = (az - uCityAz.x) / (uCityAz.y - uCityAz.x);
  float w = smoothstep(-.3, .2, u) * smoothstep(1.3, .8, u);
  return vec3(1., .5, .26) * .1 * uCity * w * exp(-abs(rd.y) * (rd.y > 0. ? 7. : 16.));
}
vec3 sky(vec3 rd) {
  float y = rd.y;
  vec3 c = mix(uSkyHor, uSkyTop, pow(clamp(y, 0., 1.), .5));
  c = mix(c, uSkyHor * .6, smoothstep(.0, -.2, y));
  // stars
  if (uSky.x > 0. && y > 0.) {
    vec2 sp = rd.xz / (rd.y + .25) * 140.;
    vec2 cell = floor(sp);
    float s = hash(cell);
    vec2 f = fract(sp) - .5 - (vec2(hash(cell + 7.), hash(cell + 3.)) - .5) * .7;
    c += uSky.x * smoothstep(.12, 0., length(f)) * step(.985, s) * (.5 + .5 * sin(uTime * 3. + s * 60.)) * smoothstep(0., .3, y);
  }
  c += cityGlow(rd);
  if (uCity > 0. && y < .06 && y > -.01) {
    // one stretch of far coast (azimuth window uCityAz), not the whole horizon
    float az = atan(rd.x, -rd.z);
    float u = (az - uCityAz.x) / (uCityAz.y - uCityAz.x);
    if (u > 0. && u < 1.) {
      vec3 ct = texture(uCityTex, vec2(.1 + u * .8, .5 + .5 * (1. - clamp(y / .06, 0., 1.)))).rgb;
      ct = pow(ct, vec3(1.9)) * 2.6 * vec3(1.15, 1., .8);
      float edge = smoothstep(0., .12, u) * smoothstep(1., .88, u);
      c = mix(c, max(c, ct), uCity * edge * smoothstep(-.01, .003, y) * smoothstep(.06, .035, y));
    }
  }
  // moon
  float md = acos(clamp(dot(rd, uMoonDir), -1., 1.));
  float R = uMoon.x;
  vec3 mU = normalize(cross(uMoonDir, vec3(0., 1., 0.)));
  vec3 mV = cross(mU, uMoonDir);
  vec2 mq = vec2(dot(rd, mU), dot(rd, mV)) / R;
  float disc = smoothstep(1., .96, length(mq));
  vec3 mc = uMoonCol * uMoon.z;
  // moon surface: the 2026 eclipse photograph; uMoon.w = redness (0 = a pale moon with the same craters)
  vec3 mt = pow(texture(uMoonTex, mq * .5 * vec2(1., -1.) + .5).rgb, vec3(1.5));
  vec3 pale = vec3(dot(mt, vec3(.55, .3, .15))) * vec3(1.05, 1., .95) * 6.;
  mc *= mix(pale, mt * 4., uMoon.w);
  c = mix(c, mc, disc);
  c += uMoonCol * uMoon.y * (exp(-md * 7.) * .35 + exp(-md * 30.) * .6);
  // clouds
  if (uSky.y > 0. && y > -.02) {
    vec2 cp = rd.xz / (rd.y + .12) * 1.4 + vec2(uTime * .02, 0.);
    float cl = smoothstep(.0, .65, fbm(cp) * .5 + .5 - (1. - uSky.y) * .6);
    float lb = pow(max(dot(rd, uBoltDir), 0.), 4.);
    vec3 lit = uSkyHor * .6 + uMoonCol * uMoon.y * exp(-md * 3.) * .8 + vec3(.9, .92, 1.) * uLightning * (.35 + 2.4 * lb);
    c = mix(c, lit * (.4 + .6 * fbm(cp * 2.3)), cl * .85 * smoothstep(-.02, .15, y));
  }
  c += vec3(.75, .8, 1.) * uLightning * (.08 + .7 * pow(max(dot(rd, uBoltDir), 0.), 6.)) * smoothstep(-.1, .4, y);
  return c;
}

// ---------------------------------------------------------------- cards (photos / the page) as rectangles
vec4 hitCards(vec3 ro, vec3 rd, float tMax, out float tHit) {
  tHit = tMax;
  vec4 res = vec4(0.);
  for (int i = ZERO; i < 6; i++) {
    if (i >= uNumCards) break;
    vec3 c = uCardC[i].xyz, U = uCardU[i].xyz, V = uCardV[i].xyz;
    vec3 n = normalize(cross(U, V));
    float dn = dot(rd, n);
    if (abs(dn) < 1e-4) continue;
    float t = dot(c - ro, n) / dn;
    if (t <= .05 || t >= tHit) continue;
    vec3 p = ro + rd * t - c;
    float u = dot(p, U) / dot(U, U), v = dot(p, V) / dot(V, V);
    if (abs(u) > 1. || abs(v) > 1.) continue;
    vec2 tuv = vec2(u * .5 + .5, .5 - v * .5);
    vec3 col;
    if (uCardC[i].w < 0.) col = texture(uPage, vec2(tuv.x, 1. - tuv.y)).rgb;
    else col = texture(uCards, vec3(tuv, uCardC[i].w)).rgb;
    col = pow(col, vec3(2.2));
    // paper edge + soft shading
    float edge = smoothstep(1., .985, max(abs(u), abs(v)));
    float light = .3 + .35 * abs(dot(n, normalize(uMoonDir + vec3(0., .6, 0.))));
    col = col * light * mix(.7, 1., edge) * mix(vec3(1.), uMoonCol, .25) + uCardV[i].w * col;
    float a = uCardU[i].w;
    res = vec4(col, a);
    tHit = t;
  }
  return res;
}

// ---------------------------------------------------------------- above the water
vec3 aboveWater(vec3 ro, vec3 rd, float t, vec3 p, vec3 n, vec3 skyc) {
  vec3 col;
  float dist = 600.;
  if (t < 0.) col = skyc;
  else {
    dist = t;
    float fres = clamp(1. - dot(n, -rd), 0., 1.);
    fres = min(pow(fres, 3.), .6);
    vec3 refl = skyc;
    float diff = pow(dot(n, uMoonDir) * .4 + .6, 60.);
    vec3 refr = uWaterDeep + diff * uWaterScat * .12;
    col = mix(refr, refl, fres);
    float atten = max(1. - t * t * .0012, 0.);
    float sw = swell(p.xz);
    float base = p.y - sw;
    float streak = smoothstep(.55, .85, noise(p.xz * .7 + uSeaT * .25) * .5 + .5 + noise(p.xz * 2.7) * .3);
    // translucency: light through the thin top of the waves, and through the lip of the giant swell
    float sss = clamp((base + uWave.x * .5) / (uWave.x * 2.4), 0., 1.) * .22;
    float rel = uSwell.z > 0. ? sw / uSwell.z : 0.;
    float lip = smoothstep(.5, .9, rel) * (1. - smoothstep(.93, 1., rel));
    col += uWaterScat * (sss + lip * .35 * (.4 + .6 * streak)) * atten * (.35 + .65 * uMoon.y);
    col += uWaterScat * lip * pow(max(dot(rd, uMoonDir), 0.), 3.) * 2.2 * uMoon.y * atten;   // backlit crest
    // the moon's glitter path
    float spec = pow(max(dot(reflect(rd, n), uMoonDir), 0.), 90.) * 9.8;
    col += uMoonCol * uMoon.z * spec * .55;
    // foam: only the highest crests (broken by noise), the swell's lip, and streaks running down its face
    float crest = smoothstep(uWave.x * .95, uWave.x * 1.6, base) * streak;
    if (uSwell.z > 0.) {
      vec2 dir = uSwell2.xy;
      float lat = dot(p.xz - uSwell.xy, vec2(-dir.y, dir.x));
      float runs = smoothstep(.62, .85, noise(vec2(lat * 1.7, p.y * .35 - uSeaT * .6)) * .5 + .5);
      crest += smoothstep(.84, .98, rel) * (.25 + .75 * streak) * .85 + runs * smoothstep(.15, .7, rel) * .45;
    }
    vec3 foamCol = mix(vec3(.55, .6, .66), uMoonCol * .7, .3) * (.13 + uMoon.y * .16) + vec3(.8, .85, 1.) * uLightning * .22;
    col = mix(col, foamCol, clamp(crest * uWave.w, 0., 1.) * (1. - fres * .5) * atten);
    col += vec3(.7, .75, .9) * uLightning * .15 * fres;
  }
  float tc;
  vec4 card = hitCards(ro, rd, dist, tc);
  if (card.a > 0.) col = mix(col, card.rgb, card.a);
  float fogd = card.a > 0. ? tc : t < 0. ? 600. * uSkyFog : dist;
  col = mix(col, uFogCol + cityGlow(rd), 1. - exp(-fogd * uSky.z));
  return col;
}

// ---------------------------------------------------------------- below the water
vec3 waterBody(vec3 rd, float camDepth) {
  float up = clamp(rd.y * .5 + .5, 0., 1.);
  vec3 c = mix(uWaterDeep * .6, uWaterScat * 1.1, pow(up, 1.8));
  return c * exp(-camDepth * uUnder.w);
}
vec3 shafts(vec3 ro, vec3 rd, float tmax) {
  float acc = 0.;
  float tm = min(tmax, 46.);
  float dt = tm / 14.;
  float j = hash(gl_FragCoord.xy + fract(uTime) * 61.);
  vec3 L = normalize(uMoonDir * vec3(1., 0., 1.) * .35 + vec3(0., 1., 0.));
  for (int i = ZERO; i < 14; i++) {
    float t = (float(i) + j) * dt;
    vec3 q = ro + rd * t;
    float depth = max(0., -q.y);
    vec2 s = q.xz + L.xz / L.y * depth;
    float c = fbm(s * .22 + vec2(uSeaT * .04, -uSeaT * .03));
    c = smoothstep(.15, .7, c);
    acc += c * exp(-depth * .07) * exp(-t * .045);
  }
  return uLightCol * acc * dt * uUnder.y * .09;
}
vec3 particles(vec3 ro, vec3 rd) {
  vec3 acc = vec3(0.);
  for (int k = ZERO + 1; k <= 5; k++) {
    float d = float(k) * 2.2;
    vec3 q = ro + rd * d + vec3(0., uTime * .15, 0.);
    vec3 cell = floor(q * 1.3);
    vec3 f = fract(q * 1.3) - .5;
    vec3 r = vec3(hash3(cell), hash3(cell + 11.), hash3(cell + 23.)) - .5;
    float dd = length(f - r * .75);
    acc += smoothstep(.07, .0, dd) * exp(-d * .16) * step(.55, hash3(cell + 5.));
  }
  return acc * uUnder.z * uLightCol;
}
vec3 underWater(vec3 ro, vec3 rd, float t, vec3 p, vec3 n, vec3 skyc) {
  float camDepth = max(0., seaH(ro.xz, 3) - ro.y);
  vec3 col;
  float tEnd = 60.;
  if (t > 0.) {
    tEnd = t;
    vec3 rr = refract(rd, -n, 1.333);
    if (dot(rr, rr) < 1e-4) col = waterBody(reflect(rd, -n), camDepth) * 1.3;   // total internal reflection
    else {
      float fr = clamp(pow(1. - abs(dot(rd, n)), 4.), 0., 1.);
      col = skyc * (1. - fr) * 1.25 + waterBody(rd, camDepth) * fr;
    }
    col = mix(col, waterBody(rd, camDepth), 1. - exp(-t * uUnder.x));
  } else col = waterBody(rd, camDepth);
  float tc;
  vec4 card = hitCards(ro, rd, tEnd, tc);
  if (card.a > 0.) {
    vec3 cc = card.rgb * mix(vec3(1.), uWaterScat * 2.2, .35);
    col = mix(col, mix(cc, waterBody(rd, camDepth), 1. - exp(-tc * uUnder.x * 1.4)), card.a);
    tEnd = tc;
  }
  col += shafts(ro, rd, tEnd);
  col += particles(ro, rd);
  return col;
}

void main() {
  vec3 ro = uCamPos, cR = uCamR, cU = uCamU, cF = uCamF;
  float tf = uTanFov;
  vec2 lq = vUv;
  float asp = uRes.x / uRes.y;
  vec4 vg = vec4(0.);
  for (int i = ZERO; i < 5; i++) {
    if (i >= uNumViews) break;
    vec4 r = uViewRect[i];
    if (vUv.x >= r.x && vUv.x < r.z && vUv.y >= r.y && vUv.y < r.w) {
      ro = uViewPos[i]; cR = uViewR[i]; cU = uViewU[i]; cF = uViewF[i]; tf = uViewFov[i]; vg = uViewGrade[i];
      lq = (vUv - r.xy) / (r.zw - r.xy);
      asp = (r.z - r.x) * uRes.x / ((r.w - r.y) * uRes.y);
    }
  }
  vec2 q = lq * 2. - 1.;
  q.x *= asp;
  vec3 rd = normalize(cF + (q.x * cR + q.y * cU) * tf);
  // which side of the surface is this pixel's lens on? (split-level waterline)
  float side = mapG(ro + rd * .12);
  float sgn = side < 0. ? -1. : 1.;
  bool tr = sgn > 0. ? (rd.y < .2 || uSwell.z > 0.) : rd.y > -.05;
  vec3 p = ro;
  float t = tr ? traceSurface(ro, rd, sgn, p) : -1.;
  if (sgn < 0. && t > 120.) t = -1.;
  vec3 n = t > 0. ? seaNormal(p, max(.002, t * .0038)) : vec3(0., 1., 0.);
  // the one direction along which this pixel sees the sky: straight, reflected, or refracted out of the water
  vec3 sd = rd;
  if (t > 0.) sd = sgn > 0. ? reflect(rd, n) : refract(rd, -n, 1.333);
  vec3 skyc = dot(sd, sd) > 1e-4 ? sky(normalize(sd)) : vec3(0.);
  vec3 col = sgn > 0. ? aboveWater(ro, rd, t, p, n, skyc) : underWater(ro, rd, t, p, n, skyc);
  col *= 1. - .55 * exp(-abs(side) * 60.);
  if (uRain > 0. && sgn > 0.) {
    vec2 rp = vec2(q.x + q.y * .18, q.y);
    for (int k = ZERO; k < 2; k++) {
      float sc = k == 0 ? 90. : 210.;
      float cx = floor(rp.x * sc);
      float h = hash(vec2(cx, float(k) * 7.3));
      float y = fract(rp.y * (k == 0 ? .7 : 1.4) + uTime * (2.2 + h * 2.4) + h * 17.);
      float s = smoothstep(.0, .015, y) * smoothstep(.16, .03, y) * step(.62, h);
      s *= smoothstep(.5, .12, abs(fract(rp.x * sc) - .5));
      col += vec3(.5, .55, .62) * s * uRain * (k == 0 ? .5 : .28) * (.25 + uLightning * 1.5);
    }
  }
  col *= uSky.w;
  col = (col * (2.51 * col + .03)) / (col * (2.43 * col + .59) + .14);
  col = clamp(col, 0., 1.);
  float l = dot(col, vec3(.299, .587, .114));
  col = mix(vec3(l), col, uGradeSat) * uGrade;
  if (vg.a > 0.) col = mix(col, vec3(dot(col, vec3(.3, .55, .15))) * vg.rgb * 1.6, vg.a);
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

// camera basis from yaw / pitch / roll (yaw 0 looks down -z)
function basis(c) {
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const F = [sy * cp, sp, -cy * cp];
  let R = [cy, 0, sy];
  let U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]]; // up = right x forward
  const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  const R2 = R.map((v, i) => v * cr + U[i] * sr), U2 = U.map((v, i) => U[i] * cr - R[i] * sr);
  return [F, R2, U2];
}
// viewports: [{ rect: [x, y, w, h] in 1920x1080 screen px (y down), cam }]
function views(list = []) {
  const n = Math.min(5, list.length);
  const rect = new Float32Array(20), pos = new Float32Array(15), r = new Float32Array(15), u = new Float32Array(15), f = new Float32Array(15), fov = new Float32Array(5), grade = new Float32Array(20);
  for (let i = 0; i < n; i++) {
    const v = list[i];
    const [x, y, w, h] = v.rect;
    rect.set([x / 1920, 1 - (y + h) / 1080, (x + w) / 1920, 1 - y / 1080], i * 4);
    const [F, R, U] = basis(v.cam);
    pos.set(v.cam.pos, i * 3); r.set(R, i * 3); u.set(U, i * 3); f.set(F, i * 3);
    fov[i] = Math.tan((v.cam.fov * Math.PI) / 360);
    if (v.grade) grade.set(v.grade, i * 4);
  }
  return { uNumViews: n, uViewRect: rect, uViewPos: pos, uViewR: r, uViewU: u, uViewF: f, uViewFov: fov, uViewGrade: grade };
}
export { basis };

export function seaDefaults() {
  return {
    on: false, scale: 0.72,
    cam: { pos: [0, 2.2, 0], yaw: 0, pitch: -0.08, roll: 0, fov: 60 },
    wave: [0.6, 4.0, 0.16, 0.6], seaSpeed: 0.8,
    swell: [0, 0, 0, 6], swell2: [0, 1, 0, 0.6],
    rip: [],
    moonDir: [0.15, 0.22, -1], moon: [0.05, 0.6, 1.4, 0], moonCol: '#ffd2b8',
    skyTop: '#03060c', skyHor: '#18243a', waterDeep: '#000d12', waterScat: '#1c5966', fogCol: '#0d1522', lightCol: '#9fd6e0',
    sky: [0.8, 0.5, 0.004, 1.0], under: [0.045, 1.0, 0.6, 0.02], lightning: 0, rain: 0, boltDir: [0.3, 0.45, -1], skyFog: 1, city: 0, cityAz: [-0.95, -0.25],
    cards: [], grade: [1, 1, 1], gradeSat: 1, views: [], pageIn3D: false,
  };
}

export class Sea {
  constructor(gl) {
    this.gl = gl;
    this.prog = program(gl, FS, 'sea');
    this.rt = null;
    this.cardTex = null;
    this.moonTex = null;
    this.cityTex = null;
    this.layers = {};
  }
  ensure(W, H, scale) {
    const w = Math.round(W * scale), h = Math.round(H * scale);
    if (!this.rt || this.rt.w !== w || this.rt.h !== h) this.rt = target(this.gl, w, h);
    return this.rt;
  }
  // upload images as layers of a 2D texture array (stretched to square; cards restore the aspect)
  loadCards(images, size = 1024) {
    const gl = this.gl;
    const names = Object.keys(images);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, size, size, names.length);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    names.forEach((n, i) => {
      x.clearRect(0, 0, size, size);
      x.drawImage(images[n], 0, 0, size, size);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, c);
      this.layers[n] = i;
    });
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.cardTex = tex;
  }
  imageTexture(img, repeat = false) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  render(S, W, H, time, seaT, pageTex) {
    const rt = this.ensure(W, H, S.scale);
    const c = S.cam;
    const [F, R, U] = basis(c);
    const rip = new Float32Array(32);
    S.rip.slice(0, 8).forEach((r, i) => rip.set(r, i * 4));
    const cc = new Float32Array(24), cu = new Float32Array(24), cv = new Float32Array(24);
    const cards = S.cards.slice(0, 6);
    cards.forEach((k, i) => {
      const layer = k.page ? -1 : (this.layers[k.img] ?? 0);
      cc.set([...k.c, layer], i * 4);
      cu.set([...k.u, k.alpha ?? 1], i * 4);
      cv.set([...k.v, k.glow ?? 0], i * 4);
    });
    const md = S.moonDir, ml = Math.hypot(...md);
    this.prog.use({
      uRes: [rt.w, rt.h], uTime: time, uSeaT: seaT,
      uCamPos: c.pos, uCamR: R, uCamU: U, uCamF: F, uTanFov: Math.tan((c.fov * Math.PI) / 360),
      uWave: S.wave, uSwell: S.swell, uSwell2: S.swell2, uRip: rip,
      uMoonDir: md.map((v) => v / ml), uMoon: S.moon, uMoonCol: lin(S.moonCol), uMoonTex: this.moonTex,
      uSkyTop: lin(S.skyTop), uSkyHor: lin(S.skyHor), uWaterDeep: lin(S.waterDeep), uWaterScat: lin(S.waterScat),
      uFogCol: lin(S.fogCol), uLightCol: lin(S.lightCol), uSky: S.sky, uUnder: S.under, uLightning: S.lightning, uRain: S.rain, uBoltDir: norm(S.boltDir), uSkyFog: S.skyFog,
      uCity: S.city, uCityTex: this.cityTex, uCityAz: S.cityAz,
      uCardC: cc, uCardU: cu, uCardV: cv, uNumCards: cards.length, uCards: this.cardTex, uPage: pageTex || this.moonTex,
      uGrade: S.grade, uGradeSat: S.gradeSat,
      ...views(S.views),
    });
    draw(this.gl, rt);
    return rt;
  }
}

// ---------------------------------------------------------------- the same height field in JS (camera riding)
function ihash(x, y) {
  const qx = Math.floor(x) | 0, qy = Math.floor(y) | 0;
  let h = (Math.imul(qx, 0x8da6b343) ^ Math.imul(qy, 0xd8163841)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function inoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = ihash(ix, iy), b = ihash(ix + 1, iy), c = ihash(ix, iy + 1), d = ihash(ix + 1, iy + 1);
  return -1 + 2 * ((a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy);
}
function seaOctave(x, y, choppy) {
  const n = inoise(x, y);
  x += n; y += n;
  let wx = 1 - Math.abs(Math.sin(x)), wy = 1 - Math.abs(Math.sin(y));
  const sx = Math.abs(Math.cos(x)), sy = Math.abs(Math.cos(y));
  wx = wx + (sx - wx) * wx; wy = wy + (sy - wy) * wy;
  return Math.pow(1 - Math.pow(wx * wy, 0.65), choppy);
}
export function swellJS(x, z, S) {
  const [ox, oz, amp, w] = S.swell;
  if (!amp) return 0;
  const [dx, dz, dist, steep] = S.swell2;
  const rx = x - ox, rz = z - oz;
  const d = rx * dx + rz * dz - dist;
  const k = d > 0 ? w * (1 + (0.38 - 1) * steep) : w * 1.35;
  const lat = -rx * dz + rz * dx;
  return amp * Math.exp((-d * d) / (k * k)) * Math.exp((-lat * lat) / (w * w * 90));
}
export function seaHeightJS(x, z, S, seaT, iters = 3) {
  let freq = S.wave[2], amp = S.wave[0], choppy = S.wave[1];
  let ux = x * 0.75, uz = z;
  let h = 0;
  for (let i = 0; i < iters; i++) {
    let d = seaOctave((ux + seaT) * freq, (uz + seaT) * freq, choppy);
    d += seaOctave((ux - seaT) * freq, (uz - seaT) * freq, choppy);
    h += d * amp;
    const nx = 1.6 * ux + 1.2 * uz, nz = -1.2 * ux + 1.6 * uz; // GLSL: uv *= mat2(1.6,1.2,-1.2,1.6) (row vector x column-major)
    ux = nx; uz = nz;
    freq *= 1.9; amp *= 0.22;
    choppy = choppy + (1 - choppy) * 0.2;
  }
  let rip = 0;
  for (const r of S.rip) {
    if (r[3] <= 0) continue;
    const dd = Math.hypot(x - r[0], z - r[1]);
    const front = r[2] * 2.4;
    rip += r[3] * Math.sin((dd - front) * 6) * Math.exp(-Math.abs(dd - front) * 1.2) * Math.exp(-r[2] * 0.55);
  }
  return h + swellJS(x, z, S) + rip - S.wave[0] * 0.9;
}
