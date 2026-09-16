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
dz.polygon([(440,815),(600,815),(600,910),(440,910)],fill=0)     # rock hill across the river south-east of downtown
keep=ndi.gaussian_filter((np.asarray(kz)>0).astype(float),12)>0.5   # rounded flat zone
grey=(s<0.13)&(v>0.39)&(v<0.56)&land
cliff=grey&~keep
cliff=ndi.binary_opening(cliff,structure=np.ones((3,3)))
# inland water: river, lake, ponds
wat=(b>r+0.025)&(v<0.36)&land
lab2,n2=ndi.label(wat); sz=ndi.sum(wat,lab2,range(1,n2+1)); water=np.isin(lab2,[i+1 for i,z in enumerate(sz) if z>=120])
water=ndi.binary_closing(water,iterations=2)
# levels (world units): sea 0 → one plateau for city, suburbs and hills; river and lake carved below it
PLATEAU, RIVER_DROP = 40.0, 9.0
d=ndi.distance_transform_edt(~keep)
ramp=np.clip(d/30,0,1); ramp=ramp*ramp*(3-2*ramp)          # the rise starts right at the city edge
h=np.full((N,N),PLATEAU)
# outer hills: real rises beyond the city zone, shaped by the rock bands (east highlands highest, north-west mesa, west and south ridges)
hills=[((250,300),150,30),((70,600),100,22),((880,560),160,44),((900,820),140,38),((520,900),110,20),((980,420),100,32),((450,80),110,12),((150,880),110,20)]   # (500,870) = rock hill across the river SE of downtown
yy,xx=np.mgrid[0:N,0:N]; H=np.zeros((N,N))
for (cx,cy),rad,hh in hills[1:]: H=np.maximum(H,hh*np.exp(-((xx-cx)**2+(yy-cy)**2)/(2*(rad*0.55)**2)))
mesa=np.clip(1-(np.sqrt(((xx-250)/160.0)**2+((yy-290)/75.0)**2)-0.8)/0.35,0,1); mesa=mesa*mesa*(3-2*mesa)   # flat top, steep sides
H=np.maximum(H,30*mesa)
# the big hill hard against downtown's west side (fire station / bank / tunnel): tall, elongated north-south
west=np.clip(1-(np.sqrt(((xx-50)/95.0)**2+((yy-720)/200.0)**2)-0.75)/0.45,0,1); west=west*west*(3-2*west)
H=np.maximum(H,58*west)
# rock hill across the river south-east of downtown: steep face right at the river bank (cave sits in it)
se=np.clip(1-(np.sqrt(((xx-505)/70.0)**2+((yy-862)/48.0)**2)-0.7)/0.3,0,1); se=se*se*(3-2*se)
h+=48*se*(1-keep)
cd=ndi.gaussian_filter(cliff.astype(float),12); cd=cd/max(cd.max(),1e-6)                                    # rock density → extra relief
h+=(H+16*cd)*ramp
rng=np.random.default_rng(4)
noise=ndi.gaussian_filter(rng.standard_normal((N,N)),22); noise=noise/np.abs(noise).max()
fine=ndi.gaussian_filter(rng.standard_normal((N,N)),7); fine=fine/np.abs(fine).max()
roll=np.clip(d/25,0,1)                                              # rolling ground everywhere except the city core
h+=7*noise*roll+2*fine*roll
h+=3.5*ndi.gaussian_filter(cliff.astype(float),3)*roll             # rock belts sit a little proud of the grass
rim=np.exp(-((np.sqrt((xx-250)**2+(yy-400)**2)-150)**2)/(2*28**2)); h+=4*rim*roll   # low rim around the west suburb
# river / lake channels: drop with soft banks
wd=ndi.distance_transform_edt(~water)
h-=RIVER_DROP*np.clip(1-(wd-1)/4,0,1)
# roads stay level across the water (bridges)
road=(s<0.13)&(v>0.39)&(v<0.56)&land
h=np.where(ndi.binary_dilation(road,iterations=2)&(wd<8),PLATEAU,h)
# tunnel approach: the westbound road out of downtown stays level into the hill face (portal modelled in the scene)
TUN=dict(x0=112,x1=158,y0=737,y1=748)   # 1024-px box: world x 219-309, y 1440-1461
h=ndi.gaussian_filter(h,1.2)
h[TUN['y0']:TUN['y1'],TUN['x0']:TUN['x1']]=PLATEAU
h[~land]=0                                                          # sea cliff: sharp edge
HMAX=110.0
img=Image.fromarray((np.clip(h/HMAX,0,1)*255).astype(np.uint8)).resize((OUT,OUT),Image.LANCZOS)
img.save('preview/liberty-county-height.png',optimize=True)
# preview: hillshade
gy,gx=np.gradient(h); shade=np.clip(0.6+ (gx*-0.7+gy*0.7)*0.6,0,1)
pv=(np.asarray(im).astype(float)*shade[...,None]).astype(np.uint8); Image.fromarray(pv).save(S+'height_preview.png')
print('max height',h.max().round(1),'mean outside city',h[~keep&land].mean().round(1))
