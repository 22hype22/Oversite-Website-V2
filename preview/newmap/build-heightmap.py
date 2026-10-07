# Region-filled terrain: each free region gets its entry cost (rock crossed from the sea); rock ramps between regions.
from PIL import Image
import numpy as np, sys
from scipy import ndimage as ndi
from skimage.graph import MCP_Geometric
S=sys.argv[1]; OUT=sys.argv[2]; TARGET=float(sys.argv[3]); BASEIMG=sys.argv[4]
masks=np.load(S); sea,WA,land,R,RD=[m.astype(bool) for m in masks]; N=sea.shape[0]
rockd=ndi.binary_dilation(R,iterations=2); rockd=ndi.binary_closing(rockd,iterations=4)&land
cost=np.where(rockd,1.0,0.02); cost[sea|WA]=0.0005
dist,_=MCP_Geometric(cost,fully_connected=True).find_costs(np.argwhere(ndi.binary_erosion(sea,iterations=2))[::7])
dist[~np.isfinite(dist)]=0
free=land&~rockd
lab,n=ndi.label(free)
# robust entry cost per region: 15th percentile of dist inside it (small regions: min)
hreg=np.zeros(n+1)
order=np.argsort(lab.ravel()); flat=dist.ravel()[order]; labs=lab.ravel()[order]
bounds=np.searchsorted(labs,np.arange(1,n+2))
for i in range(1,n+1):
    seg=flat[bounds[i-1]:bounds[i]]
    hreg[i]=np.percentile(seg,15) if len(seg)>=30 else seg.min()
h=hreg[lab]                                  # free regions
# rock pixels: nearest free region's height, then smooth → ramps across the band
idx=ndi.distance_transform_edt(rockd,return_distances=False,return_indices=True)
h=np.where(rockd,h[idx[0],idx[1]],h)
# thick rock that encloses nothing is still a slope: lift rock by local band thickness (half the way to next region)
h=np.maximum(h,np.where(rockd,dist,0)*0.6)
p=np.percentile(h[land],99.0); k=TARGET/max(p,1e-6); BASE=16.0
h=BASE+k*h
h=ndi.gaussian_filter(h,3.0)
h[WA&~sea]=np.minimum(h[WA&~sea],BASE+3); h[sea]=0
print('regions',n,'| p99 cost',round(float(p),1),'| max h',h.max().round(1),'| median land h',np.median(h[land]).round(1))
HMAX=float(np.ceil(h.max()/10)*10)
Image.fromarray((np.clip(h/HMAX,0,1)*255).astype(np.uint8)).resize((1024,1024),Image.LANCZOS).save(OUT); open(OUT+'.hmax','w').write(str(HMAX))
small=np.asarray(Image.open(BASEIMG).convert('RGB').resize((N,N),Image.LANCZOS)).astype(float)
gy,gx=np.gradient(h); shade=np.clip(0.5+(gx*-1.0+gy*1.0)*0.45,0,1)
hm=(np.clip(h/HMAX,0,1)*255).astype(np.uint8)
o=Image.new('RGB',(2*N,N)); o.paste(Image.fromarray((small*shade[...,None]).astype(np.uint8)),(0,0)); o.paste(Image.fromarray(np.stack([hm]*3,2)),(N,0)); o.resize((1800,900)).save(OUT.replace('.png','_both.png'))
