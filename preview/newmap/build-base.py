# New base assets: texture, dark-mode map, heightmap (world grid stays 0..2000; texture 2560px)
from PIL import Image; import numpy as np, sys, shutil
from scipy import ndimage as ndi
SC=sys.argv[1]; N=1340
full=Image.open(SC+'/newmap/fall_blank.png').convert('RGB')
# page background → sea colour so the texture has no white
a=np.asarray(full); white=(a.min(2)>247); a=a.copy(); a[white]=(62,105,115)
Image.fromarray(a).resize((2560,2560),Image.LANCZOS).save('preview/liberty-county.jpg',quality=88)
masks=np.load(SC+'/nm/height_masks.npy'); sea,WA,land,R,RD=[m.astype(bool) for m in masks]
# dark mode: grey ground, white roads, dark water
up=lambda m,sig: ndi.gaussian_filter(ndi.zoom(m.astype(float),2048/N,order=1),sig).clip(0,1)
road=ndi.binary_opening(RD,structure=np.ones((2,2))); lab,n=ndi.label(road,structure=np.ones((3,3))); sz=ndi.sum(road,lab,range(1,n+1)); road=np.isin(lab,[i+1 for i,z in enumerate(sz) if z>=60])
Rr=up(road,0.9); Wm=up(WA,1.2); O=up(sea,1.5); K=up(ndi.binary_dilation(R,iterations=1),1.5)
out=np.tile(np.array([43,43,46]),(2048,2048,1)).astype(float)
mix=lambda o,m,c: o*(1-m[...,None])+np.array(c)*m[...,None]
out=mix(out,K*0.5,[54,54,58]); out=mix(out,Wm,[22,22,25]); out=mix(out,O,[17,17,19]); out=mix(out,Rr,[226,226,228])
Image.fromarray(out.clip(0,255).astype(np.uint8)).save('preview/liberty-county-darkmode.jpg',quality=84)
shutil.copy(SC+'/nm/height3.png','preview/liberty-county-height.png')
print('HMAX',open(SC+'/nm/height3.png.hmax').read())
