# Road mask from the 4k map: neutral grey, smooth (not the speckled rock), wide enough to be a road, connected to the network
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
SC = sys.argv[1]
a = np.asarray(Image.open('preview/liberty-county-4k.jpg').convert('RGB')).astype(np.int16)
mx, mn, mean = a.max(2), a.min(2), a.mean(2)
grey = ((mx - mn) < 12) & (np.abs(mean - 116) < 11)          # asphalt: one even mid grey; sidewalks and plazas are lighter, roofs textured
# smoothness: local std of brightness in a 5x5 window
m1 = ndi.uniform_filter(mean, 5); m2 = ndi.uniform_filter(mean * mean, 5); sd = np.sqrt(np.maximum(m2 - m1 * m1, 0))
cand = grey & (sd < 13)
cand = ndi.binary_closing(cand, structure=np.ones((3, 3)), iterations=1)  # fill yellow centre/edge lines inside a road
cand = ndi.median_filter(cand.astype(np.uint8), 5).astype(bool)          # drop speckle
cand = ndi.binary_opening(cand, structure=np.ones((3, 3)), iterations=1)   # drop hairlines (contours)
# rejoin road pieces split by white paint (crosswalks, stop lines, lane arrows), but never across grass, trees, water or dark ground,
# so the grass medians of divided roads stay a gap
green = (a[..., 1] - a[..., 2] > 8) & (a[..., 1] >= a[..., 0] - 2)                                     # grass and trees (the medians of divided roads)
water = (a[..., 2] - a[..., 0] > 25)
light = mean >= 128                                                      # light concrete and paint
cand = (cand | (ndi.binary_closing(cand, structure=np.ones((3, 3)), iterations=4) & ~green & ~water & ~light)   # dark breaks (parked cars, shadows) up to ~8 px
            | (ndi.binary_closing(cand, structure=np.ones((3, 3)), iterations=2) & ~green & ~water))           # thin light breaks (crosswalk stripes) up to ~4 px; wider concrete medians stay
lab, n = ndi.label(cand); sz = ndi.sum(cand, lab, range(1, n + 1))
keep = lab == (np.argmax(sz) + 1)                                         # the main road network
# road pieces cut off by wide paint (bridge joints, big crosswalks): join each one within ~30 px to the network with a short
# straight link, unless the link would cross water or grass
water = (a[..., 2] - a[..., 0] > 25)
for _ in range(3):
    dist, (iy, ix) = ndi.distance_transform_edt(~keep, return_indices=True)
    for k in np.nonzero(sz >= 600)[0] + 1:
        comp = lab == k
        if (comp & keep).any(): continue
        dk = np.where(comp, dist, np.inf); p0 = np.unravel_index(np.argmin(dk), dk.shape)
        if dk[p0] > 30: continue
        q0 = (iy[p0], ix[p0]); n = int(dk[p0]) + 2; ys = np.linspace(p0[0], q0[0], n).round().astype(int); xs = np.linspace(p0[1], q0[1], n).round().astype(int)
        if (water[ys, xs] | green[ys, xs]).mean() > 0.2: continue
        link = np.zeros_like(keep); link[ys, xs] = True; link = ndi.binary_dilation(link, iterations=3)
        keep |= comp | link
np.save(SC + '/roads/mask.npy', keep)
print('components', n, 'kept', int((sz >= 3000).sum()), 'coverage', round(keep.mean(), 4))
im = Image.open('preview/liberty-county-4k.jpg').convert('RGB'); red = Image.new('RGB', im.size, (255, 0, 0))
mix = Image.composite(red, im, Image.fromarray((keep * 120).astype(np.uint8)))
s = 4096 / 2000
for name, (x0, y0, x1, y1) in {'res': (560, 780, 820, 980), 'down': (400, 1300, 900, 1650), 'east': (1300, 1100, 1800, 1500), 'north': (900, 200, 1400, 600), 'eastmtn': (1350, 750, 1750, 1100), 'bridge': (600, 50, 1000, 400), 'west': (180, 500, 500, 900), 'dt': (1000, 1150, 1200, 1300), 'dtw': (420, 1260, 700, 1450), 'median': (860, 1120, 1010, 1300)}.items():
    mix.crop((int(x0 * s), int(y0 * s), int(x1 * s), int(y1 * s))).save(SC + f'/roads/{name}.jpg', quality=80)
mix.resize((1400, 1400)).save(SC + '/roads/full.jpg', quality=75)
