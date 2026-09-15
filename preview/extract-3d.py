from PIL import Image, ImageDraw
import numpy as np, json, math
from scipy import ndimage as ndi
S='/tmp/claude-0/-home-user-Oversite-Website-V2/12077a2b-514d-5869-a336-49444aaa4631/scratchpad/'
N=1024; K=2000/N
im=Image.open('preview/liberty-county.jpg').convert('RGB').resize((N,N),Image.BILINEAR)
a=np.asarray(im).astype(float)/255
r,g,b=a[...,0],a[...,1],a[...,2]
mx=a.max(2); mn=a.min(2); v=mx; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
# hue
h=np.zeros_like(v); d=np.maximum(mx-mn,1e-6)
h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60

wat=(b>r+0.03)&(v<0.36)
lab,_=ndi.label(wat); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
ocean=np.isin(lab,list(border))
land=~ndi.binary_dilation(ocean,iterations=14)
coast=ndi.distance_transform_edt(~ocean)<34
roadgrey=(s<0.13)&(v>0.39)&(v<0.56)
green=(h>55)&(h<170)&(s>0.16)
water=(b>r+0.02)&(s>0.08)&(v<0.30)
road_zone=ndi.binary_dilation(roadgrey&land,iterations=28)

cand=land&~roadgrey&~green&~water&road_zone
cand=ndi.binary_opening(cand,structure=np.ones((3,3)))

def comps(mask,minarea):
    lab,n=ndi.label(mask); out=[]
    for i,sl in enumerate(ndi.find_objects(lab),1):
        ys,xs=np.nonzero(lab[sl]==i)
        if len(xs)<minarea: continue
        out.append((xs+sl[1].start,ys+sl[0].start))
    return out
def rrect(xs,ys):
    cx,cy=xs.mean(),ys.mean(); X=np.stack([xs-cx,ys-cy]); cov=X@X.T/len(xs)
    w,vec=np.linalg.eigh(cov); ax=vec[:,1]; ang=math.atan2(ax[1],ax[0])
    # snap near-axis angles so the grid stays crisp
    for k in (0,math.pi/2,-math.pi/2,math.pi,-math.pi):
        if abs(ang-k)<0.06: ang=k
    c,sn=math.cos(-ang),math.sin(-ang)
    u=X[0]*c-X[1]*sn; t=X[0]*sn+X[1]*c
    return cx,cy,u.max()-u.min()+1,t.max()-t.min()+1,ang

buildings=[]; bmask=np.zeros_like(cand)
for xs,ys in comps(cand,12):
    cx,cy,L,W,ang=rrect(xs,ys); area=len(xs); sol=area/max(L*W,1)
    if coast[int(cy),int(cx)]: continue
    if L>130 or W<2.2 or L/W>6.5: continue
    if W<3.2 and L/W>2.2: continue            # lane paint
    if float(v[ys,xs].std())>0.055 and float(v[ys,xs].mean())<0.42: continue   # textured dark = cliff crevice
    if sol<(0.62 if area<60 else 0.55): continue
    vm=float(v[ys,xs].mean()); sm=float(s[ys,xs].mean())
    if vm>0.56 and sm<0.15: kind=0; hgt=18+min(42,area*0.3)          # light concrete/white — tall
    elif vm<0.42 and sm<0.25: kind=1; hgt=(9 if area<40 else 16+min(18,area*0.08))   # dark roofs — houses / mid
    else: kind=2; hgt=10+min(14,area*0.1)                              # coloured roofs — low commercial
    buildings.append([round(cx*K,1),round(cy*K,1),round(L*K,1),round(W*K,1),round(ang,3),round(hgt,1),kind])
    bmask[ys,xs]=True

# trees: dark green specks, not on buildings
dk=(v>0.20)&(v<0.40)&(s<0.30)&~roadgrey&land&~water&~ndi.binary_dilation(bmask,iterations=2)
trees=[]
for xs,ys in comps(dk,2):
    if len(xs)>11: continue
    trees.append([round(xs.mean()*K,1),round(ys.mean()*K,1),round(0.75+min(len(xs),10)*0.09,2)])
rng=np.random.default_rng(7)
if len(trees)>4500: trees=[trees[i] for i in sorted(rng.choice(len(trees),4500,replace=False))]

json.dump({"buildings":buildings,"trees":trees},open('preview/liberty-county-3d.json','w'),separators=(',',':'))
kinds=[b[6] for b in buildings]
print('buildings',len(buildings),'light',kinds.count(0),'dark',kinds.count(1),'coloured',kinds.count(2),'trees',len(trees))
ov=im.copy(); dr=ImageDraw.Draw(ov)
def poly(cx,cy,L,W,ang,col):
    c,sn=math.cos(ang),math.sin(ang)
    pts=[(cx+u*c-t*sn,cy+u*sn+t*c) for u,t in ((-L/2,-W/2),(L/2,-W/2),(L/2,W/2),(-L/2,W/2))]
    dr.polygon(pts,outline=col)
for bb in buildings: poly(bb[0]/K,bb[1]/K,bb[2]/K,bb[3]/K,bb[4],[(255,80,80),(90,200,255),(255,200,60)][bb[6]])
for t in trees: dr.point((t[0]/K,t[1]/K),fill=(60,255,120))
ov.save(S+'overlay.png'); ov.crop((140,620,460,900)).resize((960,840),Image.NEAREST).save(S+'overlay_dt.png')
