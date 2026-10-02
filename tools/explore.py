# First look at the song: spectrogram, onset envelope, RMS, sliding tempogram.
import numpy as np, soundfile as sf, os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.signal import get_window
from scipy.ndimage import maximum_filter1d, uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
y, sr = sf.read(os.path.join(OUT, 'song.wav'), dtype='float32')
mono = y.mean(axis=1)
print('sr', sr, 'dur', len(mono) / sr)

HOP = 441  # 10 ms
NFFT = 2048
win = get_window('hann', NFFT).astype(np.float32)
pad = np.pad(mono, (NFFT // 2, NFFT // 2))
nfr = 1 + (len(pad) - NFFT) // HOP
frames = np.lib.stride_tricks.as_strided(pad, shape=(nfr, NFFT), strides=(pad.strides[0] * HOP, pad.strides[0]))
S = np.abs(np.fft.rfft(frames * win, axis=1)).astype(np.float32)  # (T, F)
freqs = np.fft.rfftfreq(NFFT, 1 / sr)
t = np.arange(nfr) * HOP / sr

def mel(f): return 2595 * np.log10(1 + f / 700)
def imel(m): return 700 * (10 ** (m / 2595) - 1)
NM = 128
mpts = imel(np.linspace(mel(30), mel(16000), NM + 2))
fb = np.zeros((NM, len(freqs)), np.float32)
for i in range(NM):
    l, c, r = mpts[i], mpts[i + 1], mpts[i + 2]
    fb[i] = np.clip(np.minimum((freqs - l) / (c - l), (r - freqs) / (r - c)), 0, None)
M = S @ fb.T
LM = np.log1p(100 * M)

# SuperFlux-ish onset envelope
mx = maximum_filter1d(LM, 3, axis=1)
flux = np.clip(LM[2:] - mx[:-2], 0, None)
def band(lo, hi):
    idx = np.where((mpts[1:-1] >= lo) & (mpts[1:-1] < hi))[0]
    return np.concatenate([[0, 0], flux[:, idx].sum(1)])
on_all = np.concatenate([[0, 0], flux.sum(1)])
on_lo, on_mid, on_hi = band(30, 180), band(180, 2500), band(2500, 16000)
rms = np.sqrt(uniform_filter1d(mono ** 2, 2048)[::HOP][:nfr] + 1e-12)

np.savez(os.path.join(OUT, 'feat.npz'), t=t, on_all=on_all, on_lo=on_lo, on_mid=on_mid, on_hi=on_hi, rms=rms, LM=LM.astype(np.float16))

# sliding autocorrelation tempogram
def norm(x):
    x = x - uniform_filter1d(x, 50)
    return np.clip(x, 0, None)
oe = norm(on_all)
W = 600  # 6 s window
lags = np.arange(20, 200)  # 0.2 .. 2.0 s
tg = []
centers = np.arange(W // 2, nfr - W // 2, 50)
for c in centers:
    seg = oe[c - W // 2:c + W // 2]
    seg = seg - seg.mean()
    ac = np.array([np.dot(seg[:-L], seg[L:]) for L in lags])
    ac /= (np.dot(seg, seg) + 1e-9)
    tg.append(ac)
tg = np.array(tg)

fig, ax = plt.subplots(4, 1, figsize=(26, 16), sharex=True, gridspec_kw={'height_ratios': [3, 1, 1, 3]})
ax[0].imshow(LM.T, aspect='auto', origin='lower', extent=[0, t[-1], 0, NM], cmap='magma')
ax[0].set_title('log-mel')
ax[1].plot(t, on_all, lw=0.4); ax[1].set_title('onset all')
ax[2].plot(t, 20 * np.log10(rms), lw=0.6); ax[2].set_title('rms dB')
ax[3].imshow(tg.T, aspect='auto', origin='lower', extent=[centers[0] / 100, centers[-1] / 100, lags[0] / 100, lags[-1] / 100], cmap='viridis', vmin=0, vmax=0.5)
ax[3].set_title('tempogram (lag s)')
for a in ax: a.grid(True, alpha=0.3)
ax[3].set_xticks(np.arange(0, t[-1], 10))
plt.tight_layout(); plt.savefig(os.path.join(OUT, 'overview.png'), dpi=60)

# zoomed spectrogram pages (30 s each)
for k in range(0, int(t[-1]) + 1, 30):
    a, b = int(k * 100), min(nfr, int((k + 30) * 100))
    fig, ax = plt.subplots(3, 1, figsize=(30, 11), sharex=True, gridspec_kw={'height_ratios': [3, 1, 1]})
    ax[0].imshow(LM[a:b].T, aspect='auto', origin='lower', extent=[a / 100, b / 100, 0, NM], cmap='magma')
    ax[1].plot(t[a:b], on_lo[a:b] / (on_lo.max() + 1e-9), lw=0.6, label='lo')
    ax[1].plot(t[a:b], on_hi[a:b] / (on_hi.max() + 1e-9) + 1, lw=0.6, label='hi')
    ax[1].legend(loc='upper right')
    ax[2].plot(t[a:b], on_mid[a:b], lw=0.6)
    for aa in ax:
        aa.set_xticks(np.arange(k, k + 30.01, 1)); aa.grid(True, alpha=0.35)
    plt.tight_layout(); plt.savefig(os.path.join(OUT, f'spec_{k:03d}.png'), dpi=50)
    plt.close('all')
print('done')
