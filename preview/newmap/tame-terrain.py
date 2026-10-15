#!/usr/bin/env python3
"""Make the 3D terrain look like Liberty County in game: rolling hills at real heights, flat lots under buildings,
roads that don't climb cliffs.

    python3 tame-terrain.py <current height png> <masks.npy> <out png>

The generated heightmap (build-heightmap.py) guesses hill heights from the rock drawn on the map, which made needle
peaks up to ~325 studs. Here:
  1. guessed hills are smoothed and squeezed under ~50 studs, like the photo-measured terraced hills (35-55);
  2. the photo-measured features in heights.json are put back exactly;
  3. road surfaces are smoothed so roads have gentle grades;
  4. every building in liberty-county-3d.json gets a level pad at the middle height of its footprint.
Output is 16-bit in two channels (R = high byte, G = low byte) over HMAX = 150 units, which 3d.js decodes, so gentle
slopes don't show 8-bit terracing.
"""
import sys, json, os, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

SRC, MASKS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
HMAX, W, CAP = 150.0, 2000.0, 14.0          # CAP: the most a guessed hill rises above flat land, in units (14 = 49 studs, like the measured terraced hills)
cfg = json.load(open(os.path.join(HERE, 'heights.json')))
S = cfg['stud']; flat = cfg['sea_level_land'] * S
geo = json.load(open(os.path.join(HERE, '..', 'liberty-county-3d.json')))

src = Image.open(SRC)
h = (np.asarray(src.convert('L')).astype(np.float32) / 255 * HMAX) if src.mode in ('L', 'P') else None
if h is None:   # already 16-bit RG
    a = np.asarray(src.convert('RGB')).astype(np.float32); h = (a[..., 0] * 256 + a[..., 1]) / 65535 * HMAX
N = h.shape[0]; px = N / W
yy, xx = np.mgrid[0:N, 0:N] / px
sea = h <= 0.01

m = np.load(MASKS).astype(bool); road = np.asarray(Image.fromarray((m[4] * 255).astype(np.uint8)).resize((N, N), Image.BILINEAR)) > 100

# 1. guessed hills: round off the needles, then squeeze the rise above flat land under CAP
rise = np.maximum(h - flat, 0)
rise = ndi.gaussian_filter(rise, 3.0 * px * 2)                   # ~6 units: spikes become rounded tops
rise = CAP * np.tanh(rise / CAP)
h = np.where(sea, 0, flat + rise)

# 2. photo-measured features, exactly as apply-heights.py sets them
def poly_mask(pts):
    im = Image.new('L', (N, N), 0); ImageDraw.Draw(im).polygon([(x * px, y * px) for x, y in pts], fill=255)
    return np.asarray(im) > 0
for f in cfg['features']:
    target = f['h'] * S
    if f['type'] == 'polygon':
        d = ndi.distance_transform_edt(poly_mask(f['pts'])) / px
        w = np.clip(d / max(f.get('edge', 6), 0.1), 0, 1); w = w * w * (3 - 2 * w)
        h = h * (1 - w) + target * w
    elif f['type'] == 'peak':
        bump = np.exp(-((xx - f['x']) ** 2 + (yy - f['y']) ** 2) / (2 * (f['r'] / 2.2) ** 2))
        h = np.maximum(h, flat + (target - flat) * bump)

# 3. roads: the surface follows a heavily smoothed ground, blended in over a few units either side
rw = ndi.gaussian_filter(ndi.binary_dilation(road, iterations=2).astype(np.float32), 2.0)
smooth = ndi.gaussian_filter(h, 6.0 * px * 2)
h = h * (1 - rw) + smooth * rw

# 4. building pads: level ground at the median height under each footprint, eased out over EDGE units
EDGE, MARGIN = 5.0, 2.0
pad = np.zeros((N, N), np.float32); wsum = np.zeros((N, N), np.float32)
for b in geo['buildings']:
    x, y, L, Wd, ang = b[:5]
    c, s = np.cos(ang), np.sin(ang)
    r = (max(L, Wd) / 2 + MARGIN + EDGE) * px
    i0, i1 = int(max(0, y * px - r)), int(min(N, y * px + r + 1)); j0, j1 = int(max(0, x * px - r)), int(min(N, x * px + r + 1))
    if i0 >= i1 or j0 >= j1: continue
    dx, dy = xx[i0:i1, j0:j1] - x, yy[i0:i1, j0:j1] - y
    u, v = dx * c + dy * s, -dx * s + dy * c                       # into the footprint's own axes
    out = np.maximum(np.abs(u) - (L / 2 + MARGIN), 0), np.maximum(np.abs(v) - (Wd / 2 + MARGIN), 0)
    dist = np.hypot(*out)                                         # 0 inside the footprint (+margin), units outside
    inside = dist <= 0
    if not inside.any() or sea[i0:i1, j0:j1][inside].mean() > 0.5: continue
    level = float(np.median(h[i0:i1, j0:j1][inside]))
    w = np.clip(1 - dist / EDGE, 0, 1); w = w * w * (3 - 2 * w)
    pad[i0:i1, j0:j1] += w * level; wsum[i0:i1, j0:j1] += w
has = wsum > 0
wb = np.clip(wsum, 0, 1)
h = np.where(has, h * (1 - wb) + (pad / np.maximum(wsum, 1e-6)) * wb, h)

h[sea] = 0
q = (np.clip(h / HMAX, 0, 1) * 65535).round().astype(np.uint32)
rgb = np.stack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), np.zeros_like(q, dtype=np.uint8)], -1)
Image.fromarray(rgb, 'RGB').save(OUT, optimize=True)
land = ~sea
print(f'max {h.max():.1f} units ({h.max() / S:.0f} studs) | 99th pct land {np.percentile(h[land], 99):.1f} | buildings {len(geo["buildings"])}')
