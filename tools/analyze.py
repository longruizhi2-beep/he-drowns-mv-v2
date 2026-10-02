# He drowns in the She — full analysis -> data/analysis.js
#   python tools/analyze.py      (needs numpy, scipy, soundfile; out/song.wav decoded from the original)
#
# Result of the investigation (see explore.py / tatum.py / meter.py / harm.py):
#   * the band plays to a click: one continuous 16th-note grid at exactly 91.000 BPM for the whole song
#   * the meter changes in the instrumental middle: 4/4 -> 3/8, 2/4 -> 5/8 x9 -> [5/8 5/8 5/8 6/8] x3 -> 4/4
#   * this shifts the 4/4 downbeat phase from 16th #2 (first half) to 16th #6 (second half)
import numpy as np, soundfile as sf, os, json, base64, re
from scipy.signal import get_window, find_peaks
from scipy.ndimage import maximum_filter1d, uniform_filter1d, median_filter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out')
y, sr = sf.read(os.path.join(OUT, 'song.wav'), dtype='float32')
mono = y.mean(axis=1)
DUR = len(mono) / sr
BPM = 91.0
P = 60.0 / BPM / 4.0            # one 16th = 0.164835 s

# ---------------------------------------------------------------- spectra
def stft(x, hop, nfft):
    w = get_window('hann', nfft).astype(np.float32)
    pad = np.pad(x, (nfft // 2, nfft // 2))
    n = 1 + (len(pad) - nfft) // hop
    fr = np.lib.stride_tricks.as_strided(pad, shape=(n, nfft), strides=(pad.strides[0] * hop, pad.strides[0]))
    return np.abs(np.fft.rfft(fr * w, axis=1)).astype(np.float32), np.fft.rfftfreq(nfft, 1 / sr)

def melfb(freqs, nm, lo, hi):
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    imel = lambda m: 700 * (10 ** (m / 2595) - 1)
    mp = imel(np.linspace(mel(lo), mel(hi), nm + 2))
    fb = np.zeros((nm, len(freqs)), np.float32)
    for i in range(nm):
        l, c, r = mp[i], mp[i + 1], mp[i + 2]
        fb[i] = np.clip(np.minimum((freqs - l) / (c - l), (r - freqs) / (r - c)), 0, None)
    return fb, mp[1:-1]

# fine-timing onset detection (2.9 ms hop) for grid phase refinement
S1, f1 = stft(mono, 128, 1024)
fb1, c1 = melfb(f1, 96, 30, 16000)
LM1 = np.log1p(100 * (S1 @ fb1.T))
fl1 = np.clip(LM1[3:] - maximum_filter1d(LM1, 3, axis=1)[:-3], 0, None).sum(1)
env1 = np.concatenate([np.zeros(3), fl1])
dt1 = 128 / sr
e = np.clip(env1 - uniform_filter1d(env1, int(0.1 / dt1)), 0, None)
loc = uniform_filter1d(e, int(1.0 / dt1)) + 1e-6
pk, _ = find_peaks(e, height=1.3 * loc, distance=int(0.05 / dt1))
a_, b_, c_ = e[pk - 1], e[pk], e[np.minimum(pk + 1, len(e) - 1)]
off = np.clip(0.5 * (a_ - c_) / (a_ - 2 * b_ + c_ + 1e-9), -0.5, 0.5)
on_t = (pk + off) * dt1 - 1.5 * dt1
on_w = np.minimum(b_ / loc[pk], 8)

# refine the grid origin on the clearly locked 4/4 band sections
T0 = 0.0784
lock = ((on_t > 11) & (on_t < 31)) | ((on_t > 43) & (on_t < 62)) | ((on_t > 152) & (on_t < 170))
for _ in range(3):
    r = ((on_t[lock] - T0 + P / 2) % P) - P / 2
    good = np.abs(r) < 0.025
    T0 += np.median(r[good & (on_w[lock] > 2)])
print('grid origin T0 = %.4f s, 16th = %.6f s' % (T0, P))
NT = int((DUR - T0) / P) + 1
tk = T0 + np.arange(NT) * P

# ---------------------------------------------------------------- bar map (in 16ths)
bars = []   # (start_k, length, meter, groups, section)
def add(k, L, meter, groups, sec):
    bars.append(dict(k=k, len=L, meter=meter, groups=groups, sec=sec))
k = 2
def run(n, L, meter, groups, sec):
    global k
    for _ in range(n):
        add(k, L, meter, groups, sec); k += L
Q = [4, 4, 4, 4]
run(4, 16, '4/4', [3, 3, 3, 3, 4], 'intro')        # piano: 3-3-3-3-4 figure
run(8, 16, '4/4', [3, 3, 3, 3, 4], 'band')         # band enters 10.96 s
run(4, 16, '4/4', Q, 'break')                      # breakdown 32.1 s
run(8, 16, '4/4', Q, 'verseA')                     # 客観、主観… 42.6 s
run(4, 16, '4/4', Q, 'inter')                      # 63.7 s
run(4, 16, '4/4', Q, 'chorusA')                    # 海は溢れて… 74.3 s
run(1, 6, '3/8', [3, 3], 'turn')                   # 84.8 s
run(8, 16, '4/4', Q, 'wall')                       # 85.8 s  shoegaze wall
run(1, 8, '2/4', [4, 4], 'wall')                   # 106.9 s
run(1, 6, '3/8', [6], 'hit')                       # 108.2 s  the stab
run(4, 10, '5/8', [4, 6], 'drone')                 # 109.2 s  5/8 drone build
run(4, 10, '5/8', [4, 3, 3], 'five')               # 115.8 s  drums in 5/8
run(1, 8, '2/4', [2, 2, 2, 2], 'fill')             # 122.4 s
run(1, 10, '5/8', [4, 6], 'five')                  # 123.7 s
for c in range(3):                                 # 125.3 s  [5/8 5/8 5/8 6/8] x3
    run(3, 10, '5/8', [6, 4], 'cycle')
    run(1, 12, '6/8', [6, 6], 'cycle')
run(2, 10, '5/8', [6, 4], 'cycle')                 # truncated last cycle
run(1, 12, '6/8', [6, 6], 'cycle')
assert k == 918, k
run(8, 16, '4/4', Q, 'verseB')                     # 151.4 s
run(8, 16, '4/4', Q, 'chorusB')                    # 172.5 s
run(4, 16, '4/4', Q, 'coda')                       # 193.6 s
run(5, 16, '4/4', [3, 3, 3, 3, 4], 'outro')        # 204.1 s piano
add(k, NT - k, 'free', [NT - k], 'tail')           # 217.3 s dissolve
for i, b in enumerate(bars):
    b['i'] = i
    b['t'] = round(T0 + b['k'] * P, 4)

# ---------------------------------------------------------------- per-16th drum / accent features (HPSS)
S2, f2 = stft(mono, 256, 2048)
S2p = S2 ** 2
H = median_filter(S2p, size=(17, 1))
Pc = median_filter(S2p, size=(1, 17))
SP = S2p * (Pc ** 2 / (H ** 2 + Pc ** 2 + 1e-12))
LP = np.log1p(1e3 * SP / SP.max())
dt2 = 256 / sr
def band_flux(X, freqs, lo, hi):
    idx = (freqs >= lo) & (freqs < hi)
    Z = X[:, idx]
    return np.concatenate([[0, 0], np.clip(Z[2:] - maximum_filter1d(Z, 3, axis=1)[:-2], 0, None).sum(1)])
def per16(env, dt, win=0.03, norm_s=6.0):
    x = np.clip(env - uniform_filter1d(env, int(0.15 / dt)), 0, None)
    x = x / (np.sqrt(uniform_filter1d(x ** 2, int(norm_s / dt))) + 1e-9)
    out = np.zeros(NT)
    for i in range(NT):
        c = (tk[i] + 0.008) / dt
        a, b = int(c - win / dt), int(c + win / dt) + 1
        out[i] = x[max(a, 0):max(b, 1)].max()
    return out
kick = per16(band_flux(LP, f2, 35, 130), dt2)
snare = per16(band_flux(LP, f2, 150, 350), dt2) * 0.5 + per16(band_flux(LP, f2, 1200, 5000), dt2) * 0.5
hat = per16(band_flux(LP, f2, 7000, 16000), dt2)
# full-band accent from the fine onsets
acc = np.zeros(NT)
for t_, w_ in zip(on_t, on_w):
    kk = int(round((t_ - T0) / P))
    if 0 <= kk < NT and abs((t_ - T0) / P - kk) < 0.3:
        acc[kk] = max(acc[kk], w_)
def squash(x, q=97):
    s = np.percentile(x[x > 0], q) if np.any(x > 0) else 1
    return np.clip(x / s, 0, 1)
kick, snare, hat, acc = squash(kick), squash(snare), squash(hat), squash(acc, 96)

# ---------------------------------------------------------------- 100 Hz envelopes
HOP3 = 441
S3, f3 = stft(mono, HOP3, 2048)
fb3, c3 = melfb(f3, 64, 30, 16000)
M3 = S3 @ fb3.T
LM3 = np.log1p(100 * M3)
nfr = S3.shape[0]
rms = np.sqrt(uniform_filter1d(mono ** 2, 2048)[::HOP3][:nfr] + 1e-12)
db = 20 * np.log10(rms + 1e-9)
loud = np.clip((db + 60) / 60, 0, 1)
def bandE(lo, hi):
    idx = (c3 >= lo) & (c3 < hi)
    v = np.log1p(M3[:, idx].sum(1))
    return v
lowE, midE, highE = bandE(30, 200), bandE(200, 3000), bandE(3000, 16000)
def n01(v, lo=2, hi=99.5):
    a, b = np.percentile(v, lo), np.percentile(v, hi)
    return np.clip((v - a) / (b - a + 1e-9), 0, 1)
fl3 = np.clip(LM3[2:] - maximum_filter1d(LM3, 3, axis=1)[:-2], 0, None).sum(1)
onset = np.concatenate([[0, 0], fl3])
onset = np.clip(onset - uniform_filter1d(onset, 30), 0, None)
cent = (S3 * f3[None, :]).sum(1) / (S3.sum(1) + 1e-9)
bright = n01(np.log(cent + 1))
envs = dict(loud=n01(uniform_filter1d(loud, 5)), low=n01(uniform_filter1d(lowE, 5)), mid=n01(uniform_filter1d(midE, 5)),
            high=n01(uniform_filter1d(highE, 5)), onset=n01(onset, 50, 99.7), bright=n01(uniform_filter1d(bright, 9)))
def b64(v):
    return base64.b64encode(np.round(np.clip(v, 0, 1) * 255).astype(np.uint8).tobytes()).decode()

# ---------------------------------------------------------------- lyrics (LRC) snapped to the grid
lyr = []
for line in open(os.path.join(ROOT, 'audio', 'song.lrc'), encoding='utf-8'):
    m = re.match(r'\[(\d+):(\d+\.\d+)\](.*)', line.strip())
    if not m: continue
    t = int(m.group(1)) * 60 + float(m.group(2))
    kf = (t - T0) / P
    lyr.append(dict(t=round(t, 3), k=int(round(kf)), text=m.group(3).strip()))

# ---------------------------------------------------------------- sections (by bar ranges)
secs = []
for b in bars:
    if not secs or secs[-1]['name'] != b['sec']:
        secs.append(dict(name=b['sec'], bar0=b['i'], t0=b['t']))
for i, s in enumerate(secs):
    s['t1'] = secs[i + 1]['t0'] if i + 1 < len(secs) else round(DUR, 3)

A = dict(
    title='He drowns in the She', artist='Blume popo', album='海と毒薬',
    duration=round(DUR, 3), bpm=BPM, sixteenth=P, t0=round(T0, 5), n16=NT,
    bars=bars, sections=secs, lyrics=lyr,
    k16=dict(kick=[round(float(v), 2) for v in kick], snare=[round(float(v), 2) for v in snare],
             hat=[round(float(v), 2) for v in hat], acc=[round(float(v), 2) for v in acc]),
    env=dict(rate=sr / HOP3, n=nfr, **{k: b64(v) for k, v in envs.items()}),
)
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
with open(os.path.join(ROOT, 'data', 'analysis.js'), 'w', encoding='utf-8') as f:
    f.write('// generated by tools/analyze.py — do not edit\nwindow.ANALYSIS = ')
    json.dump(A, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

# ---------------------------------------------------------------- report
rep = []
rep.append('He drowns in the She — Blume popo — analysis report')
rep.append('duration %.2f s   grid 16th = %.6f s  (%.3f BPM quarter)   origin %.4f s' % (DUR, P, BPM, T0))
rep.append('')
for s in secs:
    bb = [b for b in bars if b['sec'] == s['name'] and b['t'] >= s['t0'] - 1e-6 and b['t'] < s['t1'] - 1e-6]
    meters = []
    for b in bb:
        if not meters or meters[-1][0] != b['meter']: meters.append([b['meter'], 1])
        else: meters[-1][1] += 1
    rep.append('%-8s %7.2f-%7.2f  bars %3d-%3d  %s' % (s['name'], s['t0'], s['t1'], bb[0]['i'], bb[-1]['i'],
               ' '.join('%s x%d' % (m, n) for m, n in meters)))
rep.append('')
for l in lyr:
    rep.append('%7.3f  16th %4d  (bar %s)  %s' % (l['t'], l['k'], next((b['i'] for b in reversed(bars) if b['k'] <= l['k']), '-'), l['text']))
open(os.path.join(OUT, 'report.txt'), 'w', encoding='utf-8').write('\n'.join(rep))
print('\n'.join(rep))
print('bars', len(bars), 'size', os.path.getsize(os.path.join(ROOT, 'data', 'analysis.js')))
