# overlay the exported bar map on the spectrogram + onset strengths
import numpy as np, json, os, sys
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
A = json.loads(open('../data/analysis.js', encoding='utf-8').read().split('=', 1)[1].rstrip().rstrip(';'))
f = np.load('out/feat.npz'); LM = f['LM'].astype(np.float32)
a, b = float(sys.argv[1]), float(sys.argv[2]); name = sys.argv[3]
P, T0 = A['sixteenth'], A['t0']
col = {'4/4': 'white', '5/8': 'cyan', '6/8': 'lime', '3/8': 'magenta', '2/4': 'yellow', 'free': 'red'}
n = int(np.ceil((b - a) / 25))
fig, axs = plt.subplots(n, 1, figsize=(30, 6 * n))
axs = np.atleast_1d(axs)
acc = np.array(A['k16']['acc']); kick = np.array(A['k16']['kick'])
for i in range(n):
    s, e = a + i * 25, min(b, a + (i + 1) * 25); ax = axs[i]
    ax.imshow(LM[int(s * 100):int(e * 100)].T, aspect='auto', origin='lower', extent=[s, e, 0, 128], cmap='magma')
    for bar in A['bars']:
        if s <= bar['t'] <= e:
            ax.axvline(bar['t'], color=col[bar['meter']], lw=2.2)
            ax.text(bar['t'] + 0.03, 120, '%d %s' % (bar['i'], bar['meter']), color=col[bar['meter']], fontsize=11)
            kk = bar['k']
            for g in np.cumsum(bar['groups'])[:-1]:
                tg = T0 + (kk + g) * P
                if tg <= e: ax.axvline(tg, color=col[bar['meter']], lw=0.8, ls='--', alpha=0.7)
    ks = np.arange(len(acc)); tt = T0 + ks * P; m = (tt >= s) & (tt <= e)
    ax.bar(tt[m], acc[m] * 30, width=0.05, color='white', alpha=0.8, bottom=0)
    ax.set_xlim(s, e); ax.set_xticks(np.arange(np.ceil(s), e, 1))
plt.tight_layout(); plt.savefig('out/' + name + '.png', dpi=42)
