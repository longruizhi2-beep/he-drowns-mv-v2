# Harmonic-change novelty per 16th: HPSS harmonic part -> chroma per tatum -> novelty peaks.
import numpy as np, soundfile as sf, os
from scipy.signal import get_window
from scipy.ndimage import median_filter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
y, sr = sf.read(os.path.join(OUT, 'song.wav'), dtype='float32')
mono = y.mean(axis=1)
HOP, NFFT = 512, 8192
win = get_window('hann', NFFT).astype(np.float32)
pad = np.pad(mono, (NFFT // 2, NFFT // 2))
nfr = 1 + (len(pad) - NFFT) // HOP
fr = np.lib.stride_tricks.as_strided(pad, shape=(nfr, NFFT), strides=(pad.strides[0] * HOP, pad.strides[0]))
S = np.abs(np.fft.rfft(fr * win, axis=1)).astype(np.float32) ** 2
freqs = np.fft.rfftfreq(NFFT, 1 / sr)
H = median_filter(S, size=(9, 1))
dt = HOP / sr
sel = (freqs > 60) & (freqs < 2000)
pc = (np.round(12 * np.log2(freqs[sel] / 440.0)) % 12).astype(int)
C = np.zeros((nfr, 12), np.float32)
Hs = np.log1p(H[:, sel] * 1e4 / H.max())
for p in range(12):
    C[:, p] = Hs[:, pc == p].sum(1)
bass = np.zeros((nfr, 12), np.float32)
selb = (freqs > 35) & (freqs < 160)
pcb = (np.round(12 * np.log2(freqs[selb] / 440.0)) % 12).astype(int)
Hb = np.log1p(H[:, selb] * 1e4 / H.max())
for p in range(12):
    bass[:, p] = Hb[:, pcb == p].sum(1)
P = 60 / 91 / 4
T0 = 0.0784
n = int((len(mono) / sr - T0) / P)
tk = T0 + np.arange(n) * P
CT = np.zeros((n, 12)); BT = np.zeros((n, 12))
for i in range(n):
    a, b = int(tk[i] / dt), int((tk[i] + P) / dt)
    CT[i] = C[a:b + 1].mean(0); BT[i] = bass[a:b + 1].mean(0)
def nov(X, w):
    Xn = X / (np.linalg.norm(X, axis=1, keepdims=True) + 1e-9)
    out = np.zeros(len(X))
    for i in range(w, len(X) - w):
        A = Xn[i - w:i].mean(0); B = Xn[i:i + w].mean(0)
        out[i] = 1 - np.dot(A, B) / (np.linalg.norm(A) * np.linalg.norm(B) + 1e-9)
    return out
N4 = nov(CT, 4); N8 = nov(CT, 8); NB = nov(BT, 4)
np.savez(os.path.join(OUT, 'harm.npz'), tk=tk, CT=CT, BT=BT, N4=N4, N8=N8, NB=NB)
# print local-max chord changes
score = N4 / (np.percentile(N4, 90) + 1e-9) + NB / (np.percentile(NB, 90) + 1e-9)
pk = [i for i in range(2, n - 2) if score[i] == score[i - 2:i + 3].max() and score[i] > 1.4]
names = 'A A# B C C# D D# E F F# G G#'.split()
for i in pk:
    print('%7.2f  k=%4d  mod16=%2d  score=%.2f  bass=%s' % (tk[i], i, i % 16, score[i], names[int(np.argmax(BT[i:i + 4].mean(0)))]))
