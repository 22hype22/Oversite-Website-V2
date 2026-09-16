from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage as ndi
S='/tmp/claude-0/-home-user-Oversite-Website-V2/12077a2b-514d-5869-a336-49444aaa4631/scratchpad/'
N=1024; OUT=512
im=Image.open('preview/liberty-county.jpg').convert('RGB').resize((N,N),Image.BILINEAR)
a=np.asarray(im).astype(float)/255; r,g,b=a[...,0],a[...,1],a[...,2]
mx=a.max(2); mn=a.min(2); v=mx; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
dark=(v<0.2); lab,_=ndi.label(dark); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
ocean=np.isin(lab,list(border)); land=~ocean
# flat city zone (same polygon as the dark-mode map)
kz=Image.new('L',(N,N),0); dz=ImageDraw.Draw(kz)
dz.polygon([(140,125),(560,95),(700,140),(880,150),(905,380),(775,395),(775,900),(700,905),(240,905),(240,770),(150,770),(120,420)],fill=255)
dz.polygon([(150,265),(380,260),(380,335),(150,335)],fill=0)
keep=ndi.gaussian_filter((np.asarray(kz)>0).astype(float),12)>0.5   # rounded flat zone
grey=(s<0.13)&(v>0.39)&(v<0.56)&land
cliff=grey&~keep
cliff=ndi.binary_opening(cliff,structure=np.ones((3,3)))
# levels (world units): sea 0 → city basin 22 → plateau 42; the plateau runs to the coast and drops as a sea cliff
BASIN, PLATEAU = 22.0, 42.0
d=ndi.distance_transform_edt(~keep)
ramp=np.clip(d/34,0,1); ramp=ramp*ramp*(3-2*ramp)                 # short, steep step up at the rock bands
h=BASIN+(PLATEAU-BASIN)*ramp
h+=10*ndi.gaussian_filter(cliff.astype(float),5)*ramp               # extra relief where the map shows rock
# gentle rolling hills on the plateau; the north-west ridge is the one real high ground
hills=[((250,300),120,26),((70,600),90,12),((880,560),130,16),((900,820),110,14),((520,940),120,10),((980,420),80,12),((450,80),90,8)]
yy,xx=np.mgrid[0:N,0:N]; H=np.zeros((N,N))
for (cx,cy),rad,hh in hills: H=np.maximum(H,hh*np.exp(-((xx-cx)**2+(yy-cy)**2)/(2*(rad*0.55)**2)))
h+=H*ramp
rng=np.random.default_rng(4); noise=ndi.gaussian_filter(rng.standard_normal((N,N)),16); noise=noise/np.abs(noise).max()
h+=5*noise*ramp
h=ndi.gaussian_filter(h,2.0)
h[~land]=0                                                          # sea cliff: sharp edge, no coastal slope
HMAX=110.0
img=Image.fromarray((np.clip(h/HMAX,0,1)*255).astype(np.uint8)).resize((OUT,OUT),Image.LANCZOS)
img.save('preview/liberty-county-height.png',optimize=True)
# preview: hillshade
gy,gx=np.gradient(h); shade=np.clip(0.6+ (gx*-0.7+gy*0.7)*0.6,0,1)
pv=(np.asarray(im).astype(float)*shade[...,None]).astype(np.uint8); Image.fromarray(pv).save(S+'height_preview.png')
print('max height',h.max().round(1),'mean outside city',h[~keep&land].mean().round(1))
