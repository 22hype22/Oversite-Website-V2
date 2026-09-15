from PIL import Image
import numpy as np
from scipy import ndimage as ndi
S='/tmp/claude-0/-home-user-Oversite-Website-V2/12077a2b-514d-5869-a336-49444aaa4631/scratchpad/'
N=1024; OUT=2048
im=Image.open('preview/liberty-county.jpg').convert('RGB').resize((N,N),Image.BILINEAR)
a=np.asarray(im).astype(float)/255
r,g,b=a[...,0],a[...,1],a[...,2]
mx=a.max(2); mn=a.min(2); v=mx; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
# ocean: border-connected dark region (no closing: it zeroes the border)
dark=(v<0.2)
lab,_=ndi.label(dark); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
ocean=np.isin(lab,list(border)); ocean=ndi.binary_dilation(ocean,iterations=2); land=~ndi.binary_dilation(ocean,iterations=4)
# inland water
wat=(b>r+0.025)&(v<0.36)&land
lab2,n2=ndi.label(wat); sz=ndi.sum(wat,lab2,range(1,n2+1)); water=np.isin(lab2,[i+1 for i,z in enumerate(sz) if z>=120])
water=ndi.binary_closing(water,iterations=2)
# grey network
grey=(s<0.13)&(v>0.39)&(v<0.56)&land&~water
core=ndi.binary_closing(grey,iterations=1); core=ndi.binary_opening(core,structure=np.ones((3,3)))
# cliffs: grey riddled with dark specks → high speck density near grey
specks=(v<0.27)&ndi.binary_dilation(core,iterations=3)&~water&land
cliff=ndi.uniform_filter(specks.astype(float),25)>0.05
cliff=ndi.binary_dilation(cliff,iterations=6)
# protect the road network that runs through the hills: long smooth grey that survives cliff removal is re-added below
# the cliff bands are fixed terrain on this map: mask them out with a hand-drawn keep zone (1024 grid)
from PIL import ImageDraw
kz=Image.new('L',(N,N),0); dz=ImageDraw.Draw(kz)
dz.polygon([(140,125),(560,95),(700,140),(880,150),(905,380),(775,395),(775,900),(700,905),(240,905),(240,770),(150,770),(120,420)],fill=255)
dz.polygon([(150,265),(380,260),(380,335),(150,335)],fill=0)          # ridge above the west suburb
keepzone=np.asarray(kz)>0
core_nc=core&~cliff&keepzone
blobs=ndi.binary_opening(core_nc,structure=np.ones((11,11)))
interior=ndi.binary_erosion(blobs,iterations=3)
roads=core_nc&~interior
lab3,n3=ndi.label(roads,structure=np.ones((3,3))); keep=np.zeros_like(roads)
for i,sl in enumerate(ndi.find_objects(lab3),1):
    if max(sl[0].stop-sl[0].start, sl[1].stop-sl[1].start)>=40: keep|=(lab3==i)
roads=keep
# roads through the hills: thin grey inside the cliff zone that is long and connected to the network
hill=core&(cliff|~keepzone)&~ndi.binary_dilation(ndi.binary_opening(core&(cliff|~keepzone),structure=np.ones((9,9))),iterations=1)
hill&=ndi.binary_dilation(keepzone,iterations=30)   # only just beyond the zone edge
lab4,n4=ndi.label(hill|roads,structure=np.ones((3,3))); touch=set(np.unique(lab4[roads]))-{0}
roads_full=np.isin(lab4,list(touch))&(hill|roads)
lab5,n5=ndi.label(roads_full,structure=np.ones((3,3))); keep=np.zeros_like(roads_full)
for i,sl in enumerate(ndi.find_objects(lab5),1):
    if max(sl[0].stop-sl[0].start, sl[1].stop-sl[1].start)>=60: keep|=(lab5==i)
roads_full=ndi.binary_closing(keep,iterations=1)
hwy=ndi.binary_opening(core_nc&~ndi.binary_dilation(blobs,iterations=2),structure=np.ones((9,9)))
lab6,n6=ndi.label(hwy); keep=np.zeros_like(hwy)
for i,sl in enumerate(ndi.find_objects(lab6),1):
    if max(sl[0].stop-sl[0].start, sl[1].stop-sl[1].start)>=120: keep|=(lab6==i)
hwy=keep&roads_full
lots=interior
# ── upscale masks with smoothing for clean anti-aliased edges ──
up=lambda m,sig: ndi.gaussian_filter(ndi.zoom(m.astype(float),OUT/N,order=1),sig).clip(0,1)
R=up(roads_full,1.0); H=up(ndi.binary_dilation(hwy,iterations=1),1.2); Wm=up(water,1.5); O=up(ocean,2.0); L=up(lots,1.5)
BG=np.array([43,43,46]); LOT=np.array([52,52,56]); WATER=np.array([22,22,25]); OCEAN=np.array([17,17,19]); ROAD=np.array([226,226,228]); HWY=np.array([255,255,255])
out=np.tile(BG,(OUT,OUT,1)).astype(float)
mix=lambda out,m,c: out*(1-m[...,None])+c*m[...,None]
out=mix(out,L,LOT); out=mix(out,Wm,WATER); out=mix(out,O,OCEAN); out=mix(out,R,ROAD); out=mix(out,H,HWY)
img=Image.fromarray(out.clip(0,255).astype(np.uint8))
img.save('preview/liberty-county-darkmode.jpg',quality=84,optimize=True)
img.resize((1024,1024),Image.LANCZOS).save(S+'darkmode_preview.png')
print('roads%',roads_full.mean()*100,'water%',water.mean()*100,'ocean%',ocean.mean()*100)
