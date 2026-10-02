# Bar rasters on the 16th grid: python raster.py L start end [name]
import numpy as np, os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
g = np.load(os.path.join(OUT, 'gridfeat.npz'))
tk = g['tk']
L = int(sys.argv[1]); a = float(sys.argv[2]); b = float(sys.argv[3])
name = sys.argv[4] if len(sys.argv) > 4 else f'raster_L{L}_{int(a)}_{int(b)}'
def nz(x):
    q = np.percentile(x[x > 0], 97) if np.any(x > 0) else 1
    return np.clip(x / (q + 1e-9), 0, 1)
k0 = int(np.searchsorted(tk, a)); k1 = int(np.searchsorted(tk, b))
rows = (k1 - k0) // L
img = np.zeros((rows, L, 3))
for ci, key in enumerate(['lo', 'mid', 'hi']):
    x = nz(g[key][k0:k1])
    img[:, :, ci] = x[:rows * L].reshape(rows, L)
fig, ax = plt.subplots(figsize=(max(6, L * 0.45), max(4, rows * 0.28)))
ax.imshow(img ** 0.7, aspect='auto', interpolation='nearest')
ax.set_yticks(range(rows)); ax.set_yticklabels(['%.2f' % tk[k0 + r * L] for r in range(rows)], fontsize=7)
ax.set_xticks(range(L)); ax.set_xticklabels([str(i) for i in range(L)], fontsize=7)
ax.set_title(f'L={L}  from {a}s   (R=lo  G=mid  B=hi)')
plt.tight_layout(); plt.savefig(os.path.join(OUT, name + '.png'), dpi=60)
print('saved', name, 'rows', rows, 'first grid', tk[k0])
