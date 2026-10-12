# Step 1: split the asphalt mask into roads and parking lots (wide, blocky asphalt), at 4k (2.048 px per map unit)
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import disk, skeletonize
SC = sys.argv[1]
asph = np.load(SC + '/roads/mask.npy')
img = np.asarray(Image.open('preview/liberty-county-4k.jpg').convert('RGB')).astype(np.int16)
soft = (img[..., 1] - img[..., 2] > 8) | (img[..., 2] - img[..., 0] > 25)           # grass, trees, water: never filled
filled = asph | (ndi.binary_closing(asph, structure=disk(7)) & ~soft)                # fill parking-stall lines and paint so a lot is one solid area
R = 20
op = ndi.binary_opening(filled, structure=disk(R))                    # what survives is wider than ~68 px (~33 map units) in every direction: wider than any street
lab, n = ndi.label(op); sl = ndi.find_objects(lab)
lot = np.zeros_like(asph); info = []
dt = ndi.distance_transform_edt(filled); print('half-width percentiles', [round(float(np.percentile(dt[asph], q)), 1) for q in (50, 90, 99, 99.9)])
for k in range(1, n + 1):
    s = sl[k - 1]; comp = lab[s] == k; area = int(comp.sum())
    if area < 3000: continue                                          # small wide spots are just big junctions
    L = int(skeletonize(comp).sum()) or 1; W = area / L; elong = L / W
    hh, ww = comp.shape; yy, xx = np.nonzero(comp); ev = np.linalg.eigvalsh(np.cov(np.vstack([xx, yy]))); aspect = float(np.sqrt(ev[1] / max(ev[0], 1e-6)))
    if elong < 6.5 and min(hh, ww) >= 56 and aspect < 2.6: lot[s] |= comp & asph[s]   # blocky and at least ~56 px across both ways; flat strips are wide roads                                    # blocky -> a lot; long strips (highways, boulevards) stay roads
    info.append((area, round(W, 1), round(elong, 1)))
np.save(SC + '/net/lot.npy', lot)
print('wide parts', len(info), 'lots px', int(lot.sum()), 'road px', int((asph & ~lot).sum()))
im = Image.open('preview/liberty-county-4k.jpg').convert('RGB'); lay = np.zeros(asph.shape + (3,), np.uint8); a = np.zeros(asph.shape, np.uint8)
lay[asph & ~lot] = (255, 40, 40); a[asph & ~lot] = 120; lay[lot] = (255, 210, 0); a[lot] = 150
mix = Image.composite(Image.fromarray(lay), im, Image.fromarray(a)); s = 4096 / 2000
for nm, (x0, y0, x1, y1) in {'cl_dtw': (330, 1180, 760, 1500), 'cl_dte': (900, 1150, 1350, 1480), 'cl_n': (850, 150, 1250, 450)}.items():
    mix.crop((int(x0 * s), int(y0 * s), int(x1 * s), int(y1 * s))).resize((860, int(860 * (y1 - y0) / (x1 - x0)))).save(SC + f'/net/{nm}.jpg', quality=82)
