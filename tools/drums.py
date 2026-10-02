# HPSS (median filtering) -> percussive band onsets -> per-16th drum features on the 91 BPM grid.
import numpy as np, soundfile as sf, os
from scipy.signal import get_window
from scipy.ndimage import median_filter, uniform_filter1d, maximum_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
y, sr = sf.read(os.path.join(OUT, 'song.wav'), dtype='float32')
mono = y.mean(axis=1)
HOP, NFFT = 256, 2048
win = get_window('hann', NFFT).astype(np.float32)
pad = np.pad(mono, (NFFT // 2, NFFT // 2))
nfr = 1 + (len(pad) - NFFT) // HOP
fr = np.lib.stride_tricks.as_strided(pad, shape=(nfr, NFFT), strides=(pad.strides[0] * HOP, pad.strides[0]))
S = np.abs(np.fft.rfft(fr * win, axis=1)).astype(np.float32) ** 2
freqs = np.fft.rfftfreq(NFFT, 1 / sr)
dt = HOP / sr
print('stft', S.shape)
H = median_filter(S, size=(17, 1))   # smooth in time  -> harmonic
Pm = median_filter(S, size=(1, 17))  # smooth in freq  -> percussive
mask = Pm ** 2 / (H ** 2 + Pm ** 2 + 1e-12)
SP = S * mask
LP = np.log1p(1e3 * SP / SP.max())
def band_onset(lo, hi):
    idx = (freqs >= lo) & (freqs < hi)
    e = LP[:, idx]
    mx = maximum_filter1d(e, 3, axis=1)
    fl = np.clip(e[2:] - mx[:-2], 0, None).sum(1)
    return np.concatenate([[0, 0], fl])
bands = {'kick': (35, 130), 'snare': (150, 350), 'snap': (1200, 5000), 'hat': (7000, 16000), 'perc': (35, 16000)}
E = {k: band_onset(*v) for k, v in bands.items()}
E['snare2'] = E['snare'] / (np.percentile(E['snare'], 99) + 1e-9) + E['snap'] / (np.percentile(E['snap'], 99) + 1e-9)
P = 60 / 91 / 4
T0 = 0.0854 - 0.0070
n = int((len(mono) / sr - T0) / P)
tk = T0 + np.arange(n) * P
G = {}
for k, e in E.items():
    e = e - uniform_filter1d(e, int(0.15 / dt)); e = np.clip(e, 0, None)
    loc = np.sqrt(uniform_filter1d(e ** 2, int(6.0 / dt))) + 1e-9  # local loudness normalisation
    en = e / loc
    out = np.zeros(n)
    for i in range(n):
        c = (tk[i] + 0.012) / dt  # onsets sit ~7 ms before grid; flux peaks a bit later
        a, b = int(c - 0.03 / dt), int(c + 0.03 / dt) + 1
        out[i] = en[max(a, 0):b].max() if b > 0 else 0
    G[k] = out
np.savez(os.path.join(OUT, 'drums.npz'), tk=tk, dt=dt, **G, **{'env_' + k: v for k, v in E.items()})
print('saved drums.npz', n)
