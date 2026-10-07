# Buildings + trees from the official 5355 render. Output in the 2000-unit world grid.
from PIL import Image; import numpy as np, json, math, sys
from scipy import ndimage as ndi
SC=sys.argv[1]
full=Image.open(SC+'/newmap/fall_blank.png').convert('RGB'); F=full.size[0]; K=2000/F
a=np.asarray(full).astype(float)/255
r,g,b=a[...,0],a[...,1],a[...,2]; mx=a.max(2); mn=a.min(2); v=mx; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
d=np.maximum(mx-mn,1e-6); h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
m=ndi.uniform_filter(v,5); m2=ndi.uniform_filter(v*v,5); std=np.sqrt(np.maximum(m2-m*m,0)); del m,m2
white=(v>0.97)&(s<0.03); water=(b>r+0.12)&(b>g)
veg=(h>45)&(h<170)&(s>0.14)
grey=s<0.10
rock=grey&(std>0.07)
lotroad=grey&(v>0.42)&(v<0.62)&(std<0.03)
# road/lot network = big connected grey-smooth components
lab,n=ndi.label(lotroad); sz=ndi.sum(lotroad,lab,range(1,n+1)); net=np.isin(lab,[i+1 for i,z in enumerate(sz) if z>=4000]); del lab
cand=~veg&~net&~rock&~water&~white&(std<0.08)
cand=ndi.binary_opening(cand,structure=np.ones((5,5)))
lab,n=ndi.label(cand); objs=ndi.find_objects(lab)
B=[]
for i,sl in enumerate(objs,1):
    sub=(lab[sl]==i); area=int(sub.sum())
    if area<140: continue
    ys,xs=np.nonzero(sub); ys=ys+sl[0].start; xs=xs+sl[1].start
    hh=sl[0].stop-sl[0].start; ww=sl[1].stop-sl[1].start
    if max(hh,ww)>420 or area/(hh*ww)<0.5: continue
    cx,cy=xs.mean(),ys.mean(); X=np.stack([xs-cx,ys-cy]); cov=X@X.T/len(xs); w,vec=np.linalg.eigh(cov); ax=vec[:,1]; ang=math.atan2(ax[1],ax[0])
    for k in (0,math.pi/2,-math.pi/2,math.pi,-math.pi):
        if abs(ang-k)<0.08: ang=k
    c,sn=math.cos(-ang),math.sin(-ang); u=X[0]*c-X[1]*sn; t=X[0]*sn+X[1]*c; L=u.max()-u.min()+1; W=t.max()-t.min()+1
    rgb=a[ys,xs].reshape(-1,3).mean(0); vm=float(v[ys,xs].mean()); sm=float(s[ys,xs].mean()); hm=float(np.median(h[ys,xs]))
    aw=area*K*K   # world area
    if vm<0.22 and sm<0.2: kind=1; st=4 if aw>=900 else (2 if aw>=250 else 1.5)
    elif vm>0.75 and sm<0.12: kind=0; st=2 if aw>=600 else 1.5
    elif sm>0.3 and (hm<25 or hm>330): kind=2; st=2
    else: kind=2; st=2 if aw>=350 else 1.5
    hexc='#%02x%02x%02x'%tuple(int(min(255,max(0,c*255))) for c in rgb)
    B.append([round(cx*K,1),round(cy*K,1),round(L*K,1),round(W*K,1),round(ang,3),round(st*3.6,1),kind,hexc])
# trees: small dark-green blobs
tree=(h>60)&(h<160)&(s>0.25)&(v<0.45)
tree=ndi.binary_opening(tree,structure=np.ones((3,3)))
lab,n=ndi.label(tree); objs=ndi.find_objects(lab); T=[]
for i,sl in enumerate(objs,1):
    sub=(lab[sl]==i); area=int(sub.sum())
    if area<12 or area>400: continue
    ys,xs=np.nonzero(sub); T.append([round((xs.mean()+sl[1].start)*K,1),round((ys.mean()+sl[0].start)*K,1),round(0.9+min(area,200)/200*1.2,2)])
rng=np.random.default_rng(7)
if len(T)>6000: T=[T[i] for i in sorted(rng.choice(len(T),6000,replace=False))]
json.dump({'buildings':B,'trees':T},open('preview/liberty-county-3d.json','w'),separators=(',',':'))
print('buildings',len(B),'trees',len(T))
