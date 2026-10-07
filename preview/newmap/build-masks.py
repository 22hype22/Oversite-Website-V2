# New-map terrain from the official render: grey textured rock rings are contour steps.
from PIL import Image
import numpy as np, sys
from scipy import ndimage as ndi
from collections import deque
SRC=sys.argv[1]; OUT=sys.argv[2]
full=Image.open(SRC).convert('RGB'); F=full.size[0]
a=np.asarray(full).astype(float)/255
r,g,b=a[...,0],a[...,1],a[...,2]; mx=a.max(2); mn=a.min(2); v=mx; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
white=(v>0.97)&(s<0.03)
water=(b>r+0.12)&(b>g)&(v>0.3)&(v<0.7)
m=ndi.uniform_filter(v,7); m2=ndi.uniform_filter(v*v,7); std=np.sqrt(np.maximum(m2-m*m,0)); del m,m2
rock=(s<0.09)&(v>0.18)&(v<0.95)&(std>0.07)
rock=ndi.binary_closing(rock,iterations=3); rock=ndi.binary_opening(rock,structure=np.ones((5,5)))
lab,n=ndi.label(rock); objs=ndi.find_objects(lab); keep=np.zeros(n+1,bool)
for i,sl in enumerate(objs,1):
    if max(sl[0].stop-sl[0].start,sl[1].stop-sl[1].start)>=90: keep[i]=True
rock=keep[lab]; del lab
road=(s<0.14)&(v>0.38)&(v<0.62)&(std<0.03)&~water
# downsample to working grid
N=1340; K=F/N
def ds(mask,thr=0.5): return np.asarray(Image.fromarray((mask*255).astype(np.uint8)).resize((N,N),Image.BOX)).astype(float)/255>thr
W=ds(white,0.5); WA=ds(water,0.5); R=ds(rock,0.35); RD=ds(road,0.5)
lab,_=ndi.label(W|WA); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
sea=np.isin(lab,list(border)); land=~sea&~WA
free=land&~R
lab2,n=ndi.label(free); sizes=ndi.sum(free,lab2,range(1,n+1)); objs=ndi.find_objects(lab2)
seaedge=ndi.binary_dilation(sea,iterations=3)
level=np.full(n+1,-1)
for i in set(np.unique(lab2[seaedge&free]))-{0}: level[i]=0
big=[i for i in range(1,n+1) if sizes[i-1]>=25]; ringw=10
adj={}
for i in big:
    sl=objs[i-1]; y0=max(sl[0].start-ringw,0); y1=min(sl[0].stop+ringw,N); x0=max(sl[1].start-ringw,0); x1=min(sl[1].stop+ringw,N)
    sub=lab2[y0:y1,x0:x1]; d=ndi.binary_dilation(sub==i,iterations=ringw)
    adj[i]=set(t for t in (set(np.unique(sub[d]))-{0,i}) if sizes[t-1]>=25)
q=deque(i for i in big if level[i]==0)
while q:
    i=q.popleft()
    for j in adj.get(i,()):
        if level[j]<0: level[j]=level[i]+1; q.append(j)
lv=np.zeros((N,N)); known=np.zeros((N,N),bool)
for i in big:
    if level[i]>=0: lv[lab2==i]=level[i]; known[lab2==i]=True
idx=ndi.distance_transform_edt(~known,return_distances=False,return_indices=True); lv=lv[idx[0],idx[1]]
STEP=float(sys.argv[3]) if len(sys.argv)>3 else 8.0; BASE=16.0
h=BASE+STEP*lv
h+=STEP*0.5*ndi.gaussian_filter(R.astype(float),2)
h=ndi.gaussian_filter(h,2.0)
h[WA&~sea]-=5; h[sea]=0
print('levels:',int(lv.max()),'| max h',h.max().round(1),'| rock%',round(R.mean()*100,1),'| land%',round(land.mean()*100,1))
HMAX=max(60.0,float(np.ceil(h.max()/10)*10))
Image.fromarray((np.clip(h/HMAX,0,1)*255).astype(np.uint8)).resize((1024,1024),Image.LANCZOS).save(OUT); open(OUT+'.hmax','w').write(str(HMAX))
np.save(OUT.replace('.png','_masks.npy'),np.stack([sea,WA,land,R,RD]).astype(np.uint8))
small=np.asarray(full.resize((N,N),Image.LANCZOS)).astype(float)
gy,gx=np.gradient(h); shade=np.clip(0.55+(gx*-0.9+gy*0.9)*0.35,0,1)
Image.fromarray((small*shade[...,None]).astype(np.uint8)).save(OUT.replace('.png','_shade.png'))
lvimg=np.zeros((N,N,3),np.uint8); lvimg[...,1]=(np.clip(lv/max(lv.max(),1),0,1)*255); lvimg[R]=(200,200,210); lvimg[sea|WA]=(30,60,90)
Image.fromarray(lvimg).save(OUT.replace('.png','_levels.png'))
