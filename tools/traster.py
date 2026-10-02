# Text raster of percussive hits: python traster.py L start_tatum n_rows   (or start in seconds with 's' suffix)
import numpy as np, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
g = np.load(os.path.join(HERE, 'out', 'drums.npz'))
tk = g['tk']
L = int(sys.argv[1])
s = sys.argv[2]
k0 = int(np.searchsorted(tk, float(s[:-1]) - 0.02)) if s.endswith('s') else int(s)
rows = int(sys.argv[3])
hi_t = float(sys.argv[4]) if len(sys.argv) > 4 else 1.6
def cell(k):
    kk, sn, hh = g['kick'][k], g['snare2'][k] / 2, g['hat'][k]
    c1 = 'K' if kk > hi_t * 1.5 else ('k' if kk > hi_t * 0.9 else '.')
    c2 = 'S' if sn > hi_t * 1.2 else ('s' if sn > hi_t * 0.7 else '.')
    c3 = 'H' if hh > hi_t * 1.5 else ('h' if hh > hi_t * 0.9 else '.')
    return c1 + c2 + c3
print('      ' + ''.join('%-4d' % i for i in range(L)))
for r in range(rows):
    a = k0 + r * L
    if a + L > len(tk): break
    print('%6.2f ' % tk[a] + ' '.join(cell(k) for k in range(a, a + L)) + '   #%d' % a)
