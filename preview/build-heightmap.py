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
# base: rise with distance from the flat zone, plateau at ~34 units
d=ndi.distance_transform_edt(~keep)
base=34*np.clip(d/70,0,1)**1.4
# cliff bands add stepped relief where the map shows rock
relief=28*ndi.gaussian_filter(cliff.astype(float),6)
# big named hills (from the oblique shots): centre (x,y in 1024 px), radius, height
hills=[((250,300),120,44),((70,600),90,30),((880,560),130,52),((900,820),110,42),((520,940),120,30),((980,420),80,36),((450,80),90,22)]
yy,xx=np.mgrid[0:N,0:N]; H=np.zeros((N,N))
for (cx,cy),rad,hh in hills: H=np.maximum(H,hh*np.exp(-((xx-cx)**2+(yy-cy)**2)/(2*(rad*0.55)**2)))
h=base+relief+H*(1-keep)
# rolling noise outside the city
rng=np.random.default_rng(4); noise=ndi.gaussian_filter(rng.standard_normal((N,N)),18); noise=noise/np.abs(noise).max()
h+=10*noise*np.clip(d/40,0,1)
h=np.maximum(h,0)
# drop to sea level at the coast, keep the city flat, smooth the whole thing
coast=ndi.distance_transform_edt(land)
h*=np.clip((coast-6)/18,0,1)
h*=np.clip(d/12,0,1)
h=ndi.gaussian_filter(h,3.0)
h[~land]=0
HMAX=110.0
img=Image.fromarray((np.clip(h/HMAX,0,1)*255).astype(np.uint8)).resize((OUT,OUT),Image.LANCZOS)
img.save('preview/liberty-county-height.png',optimize=True)
# preview: hillshade
gy,gx=np.gradient(h); shade=np.clip(0.6+ (gx*-0.7+gy*0.7)*0.6,0,1)
pv=(np.asarray(im).astype(float)*shade[...,None]).astype(np.uint8); Image.fromarray(pv).save(S+'height_preview.png')
print('max height',h.max().round(1),'mean outside city',h[~keep&land].mean().round(1))
