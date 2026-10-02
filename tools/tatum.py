# Precise tatum grid: sub-frame onset times -> global period/phase search -> residual drift plot.
import numpy as np, soundfile as sf, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.signal import get_window, find_peaks
from scipy.ndimage import maximum_filter1d, uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
y, sr = sf.read(os.path.join(OUT, 'song.wav'), dtype='float32')
mono = y.mean(axis=1)

HOP, NFFT = 128, 1024          # 2.9 ms hop for timing precision
win = get_window('hann', NFFT).astype(np.float32)
pad = np.pad(mono, (NFFT // 2, NFFT // 2))
nfr = 1 + (len(pad) - NFFT) // HOP
fr = np.lib.stride_tricks.as_strided(pad, shape=(nfr, NFFT), strides=(pad.strides[0] * HOP, pad.strides[0]))
S = np.abs(np.fft.rfft(fr * win, axis=1)).astype(np.float32)
freqs = np.fft.rfftfreq(NFFT, 1 / sr)
def mel(f): return 2595 * np.log10(1 + f / 700)
def imel(m): return 700 * (10 ** (m / 2595) - 1)
NM = 96
mp = imel(np.linspace(mel(30), mel(16000), NM + 2))
fb = np.zeros((NM, len(freqs)), np.float32)
for i in range(NM):
    l, c, r = mp[i], mp[i + 1], mp[i + 2]
    fb[i] = np.clip(np.minimum((freqs - l) / (c - l), (r - freqs) / (r - c)), 0, None)
LM = np.log1p(100 * (S @ fb.T))
mx = maximum_filter1d(LM, 3, axis=1)
LAG = 3
fl = np.clip(LM[LAG:] - mx[:-LAG], 0, None)
cen = mp[1:-1]
def bandsum(lo, hi):
    idx = np.where((cen >= lo) & (cen < hi))[0]
    return np.concatenate([np.zeros(LAG), fl[:, idx].sum(1)])
env = {'all': np.concatenate([np.zeros(LAG), fl.sum(1)]), 'lo': bandsum(30, 160), 'mid': bandsum(160, 3000), 'hi': bandsum(3000, 16000)}
dt = HOP / sr
# local normalisation (adaptive threshold)
def peaks(e, win_s=1.0, k=1.3):
    e = e - uniform_filter1d(e, int(0.1 / dt))
    e = np.clip(e, 0, None)
    loc = uniform_filter1d(e, int(win_s / dt)) + 1e-6
    p, _ = find_peaks(e, height=k * loc, distance=int(0.05 / dt))
    # parabolic interpolation
    a, b, c = e[p - 1], e[p], e[np.minimum(p + 1, len(e) - 1)]
    off = 0.5 * (a - c) / (a - 2 * b + c + 1e-9)
    tt = (p + np.clip(off, -0.5, 0.5)) * dt - (LAG * dt) / 2  # flux centred between frames
    return tt, b / loc[p]
res = {}
for k, e in env.items():
    tt, ww = peaks(e)
    res[k] = (tt, ww)
    print(k, 'peaks', len(tt))
np.savez(os.path.join(OUT, 'onsets.npz'), **{f'{k}_t': v[0] for k, v in res.items()}, **{f'{k}_w': v[1] for k, v in res.items()},
         env_all=env['all'], env_lo=env['lo'], env_mid=env['mid'], env_hi=env['hi'], dt=dt)

tt, ww = res['all']
ww = np.minimum(ww, 6)
# global Rayleigh search over tatum period
Ps = np.arange(0.1600, 0.1740, 0.000005)
R = np.array([np.abs(np.sum(ww * np.exp(2j * np.pi * tt / P))) for P in Ps]) / ww.sum()
bi = np.argmax(R); P0 = Ps[bi]
ph = np.angle(np.sum(ww * np.exp(2j * np.pi * tt / P0)))
t0 = (ph / (2 * np.pi)) * P0 % P0
print('global tatum period %.6f s  (x4 beat %.4f BPM, x3 beat %.4f BPM)  R=%.3f  phase %.4f' % (P0, 60 / (4 * P0), 60 / (3 * P0), R[bi], t0))
# sliding window estimates
wins = np.arange(0, tt.max(), 5.0)
loc = []
for a in wins:
    m = (tt >= a) & (tt < a + 15)
    if m.sum() < 10: loc.append((a, np.nan, np.nan, np.nan)); continue
    Rl = np.array([np.abs(np.sum(ww[m] * np.exp(2j * np.pi * tt[m] / P))) for P in Ps]) / ww[m].sum()
    j = np.argmax(Rl)
    phl = np.angle(np.sum(ww[m] * np.exp(2j * np.pi * tt[m] / Ps[j])))
    loc.append((a, Ps[j], Rl[j], phl))
loc = np.array(loc)
for row in loc: print('win %6.1f  P %.5f  R %.3f' % (row[0], row[1], row[2]))
# residual of each onset vs global grid
resid = ((tt - t0 + P0 / 2) % P0) - P0 / 2
fig, ax = plt.subplots(3, 1, figsize=(26, 14))
ax[0].plot(Ps, R); ax[0].axvline(P0, color='r'); ax[0].set_title('global Rayleigh R vs tatum period')
ax[1].scatter(tt, resid * 1000, s=np.clip(ww, 0.2, 6) * 3, alpha=0.5); ax[1].set_ylim(-85, 85); ax[1].set_title('onset residual vs global grid (ms)')
ax[1].set_xticks(np.arange(0, 225, 5)); ax[1].grid(True, alpha=0.4)
ax[2].plot(loc[:, 0] + 7.5, loc[:, 1], 'o-'); ax[2].set_title('local tatum period (15 s windows)'); ax[2].grid(True, alpha=0.4)
ax[2].set_xticks(np.arange(0, 225, 5))
plt.tight_layout(); plt.savefig(os.path.join(OUT, 'tatum.png'), dpi=55)
