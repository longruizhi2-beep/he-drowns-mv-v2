# Per-tatum features on the locked 91 BPM 16th grid, then sliding autocorrelation in tatum lags (meter finder).
import numpy as np, soundfile as sf, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.ndimage import uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
d = np.load(os.path.join(OUT, 'onsets.npz'))
dt = float(d['dt'])
P = 60 / 91 / 4
T0 = 0.0854 - 0.0070
def gridfeat(e):
    e = e - uniform_filter1d(e, int(0.12 / dt)); e = np.clip(e, 0, None)
    n = int((len(e) * dt - T0) / P)
    out = np.zeros(n)
    for k in range(n):
        c = (T0 + k * P) / dt
        a, b = int(c - 0.025 / dt), int(c + 0.025 / dt) + 1
        out[k] = e[max(a, 0):b].max() if b > 0 else 0
    return out
F = {k: gridfeat(d['env_' + k]) for k in ['all', 'lo', 'mid', 'hi']}
n = len(F['all'])
tk = T0 + np.arange(n) * P
np.savez(os.path.join(OUT, 'gridfeat.npz'), tk=tk, **F)

def acorr_map(x, W=96, step=8, maxlag=72):
    rows, cs = [], []
    for c in range(W // 2, len(x) - W // 2, step):
        s = x[c - W // 2:c + W // 2]
        s = (s - s.mean()) / (s.std() + 1e-9)
        ac = np.array([np.mean(s[:-L] * s[L:]) for L in range(1, maxlag + 1)])
        rows.append(ac); cs.append(c)
    return np.array(rows), np.array(cs)

fig, ax = plt.subplots(4, 1, figsize=(28, 22))
for i, k in enumerate(['all', 'lo', 'mid', 'hi']):
    A, cs = acorr_map(np.log1p(F[k] / (np.median(F[k]) + 1e-9)))
    ax[i].imshow(A.T, aspect='auto', origin='lower', extent=[tk[cs[0]], tk[cs[-1]], 0.5, 72.5], cmap='magma', vmin=0, vmax=0.6)
    ax[i].set_yticks(range(0, 73, 4)); ax[i].set_xticks(np.arange(0, 225, 5)); ax[i].grid(True, alpha=0.25)
    ax[i].set_title(f'tatum autocorrelation ({k}), lag in 16ths')
plt.tight_layout(); plt.savefig(os.path.join(OUT, 'meter_acorr.png'), dpi=50)
print('n tatums', n)
