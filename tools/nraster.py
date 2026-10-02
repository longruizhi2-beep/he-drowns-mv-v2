# numeric raster: per-16th strongest onset (0-9) + chord-change marks. python nraster.py L k0 rows
import numpy as np, sys
d=np.load('out/onsets.npz'); h=np.load('out/harm.npz')
P=60/91/4; T0=0.0784
t=d['all_t']; w=d['all_w']
n=1348; s=np.zeros(n)
for tt,ww in zip(t,w):
    k=int(round((tt-T0)/P))
    if 0<=k<n and abs((tt-T0)/P-k)<0.3: s[k]=max(s[k],ww)
N=h['N4']/(np.percentile(h['N4'],90)+1e-9)+h['NB']/(np.percentile(h['NB'],90)+1e-9)
L=int(sys.argv[1]); k0=int(sys.argv[2]); rows=int(sys.argv[3])
def c(k):
    v=s[k]; d='.' if v<4 else str(min(9,int(np.log2(v/4)*2.2)+1))
    m='*' if (N[k]>1.4 and N[k]==N[max(0,k-2):k+3].max()) else ' '
    return d+m
print('       '+''.join('%-3d'%i for i in range(L)))
for r in range(rows):
    a=k0+r*L
    print('%6.2f '%(T0+a*P)+' '.join(c(k) for k in range(a,a+L))+'  #%d'%a)
