# Zoomed onset strips with the 16th grid: python strip.py start end [strip_len] [name]
import numpy as np, os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.ndimage import uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
d = np.load(os.path.join(OUT, 'onsets.npz'))
f = np.load(os.path.join(OUT, 'feat.npz'))
dt = float(d['dt'])
P = 60 / 91 / 4
T0 = 0.0854 - 0.0070
a = float(sys.argv[1]); b = float(sys.argv[2])
SL = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0
name = sys.argv[4] if len(sys.argv) > 4 else f'strip_{int(a)}_{int(b)}'
n = int(np.ceil((b - a) / SL))
LM = f['LM'].astype(np.float32)
fig, axs = plt.subplots(n * 2, 1, figsize=(30, 5.2 * n), gridspec_kw={'height_ratios': [2, 3] * n})
for i in range(n):
    s, e = a + i * SL, min(b, a + (i + 1) * SL)
    ax0, ax = axs[2 * i], axs[2 * i + 1]
    fa, fb = int(s * 100), int(e * 100)
    ax0.imshow(LM[fa:fb].T, aspect='auto', origin='lower', extent=[s, e, 0, LM.shape[1]], cmap='magma')
    ax0.set_xlim(s, e)
    i0, i1 = int(s / dt), int(e / dt)
    tt = np.arange(i0, i1) * dt
    for off, key, col in [(0, 'lo', 'tab:red'), (1.1, 'mid', 'tab:green'), (2.2, 'hi', 'tab:blue')]:
        x = d['env_' + key][i0:i1]
        x = x - uniform_filter1d(x, 40); x = np.clip(x, 0, None)
        x = x / (np.percentile(x, 99.5) + 1e-9)
        ax.plot(tt, np.clip(x, 0, 1) + off, color=col, lw=0.7)
    k0 = int(np.ceil((s - T0) / P)); k1 = int((e - T0) / P)
    for k in range(k0, k1 + 1):
        g = T0 + k * P
        ax.axvline(g, color='k', alpha=0.5 if k % 4 == 0 else 0.12, lw=1.2 if k % 16 == 0 else 0.6)
        if k % 4 == 0: ax.text(g, 3.35, str(k), fontsize=7, ha='center')
    ax.set_xlim(s, e); ax.set_ylim(0, 3.5)
    ax.set_xticks(np.arange(np.ceil(s * 2) / 2, e, 0.5))
plt.tight_layout(); plt.savefig(os.path.join(OUT, name + '.png'), dpi=48)
print('saved', name)
