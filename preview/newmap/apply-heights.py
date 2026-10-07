#!/usr/bin/env python3
"""Rebase the generated heightmap so land sits just above the sea, then apply the
photo-derived overrides in heights.json.

    python3 apply-heights.py <generated height png> <out png>

The generated map (build-heightmap.py) puts flat land at BASE=16 units; the beach photos
show sand at sea level, so flat land is moved to ~1.5 units and hills keep their rise.
Overrides raise polygons to a plateau (max with the existing height, blended over `edge`)
or add a rounded peak. HMAX stays 150 to match the page.
"""
import sys, json, os, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
SRC, OUT = sys.argv[1], sys.argv[2]
HMAX, BASE, W = 150.0, 16.0, 2000.0
cfg = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'heights.json')))
S = cfg['stud']
h = np.asarray(Image.open(SRC).convert('L')).astype(np.float32) / 255 * HMAX
N = h.shape[0]; px = N / W
land = h > 0.5
flat = cfg['sea_level_land'] * S
BASE = float(np.bincount(np.round(h[land]).astype(int)).argmax())   # the generated map's flat-land level (its most common height)
h = np.where(land, np.maximum(h - BASE, 0) + flat, 0)          # rebase: flat land -> ~1.4 units
def poly_mask(pts):
    im = Image.new('L', (N, N), 0); ImageDraw.Draw(im).polygon([(x * px, y * px) for x, y in pts], fill=255)
    return np.asarray(im) > 0
yy, xx = np.mgrid[0:N, 0:N] / px
for f in cfg['features']:
    target = f['h'] * S
    if f['type'] == 'polygon':
        m = poly_mask(f['pts'])
        d = ndi.distance_transform_edt(m) / px                   # units inside the polygon edge
        w = np.clip(d / max(f.get('edge', 6), 0.1), 0, 1)
        w = w * w * (3 - 2 * w)
        h = h * (1 - w) + target * w                            # set: the photo height wins inside the polygon
    elif f['type'] == 'peak':
        d2 = (xx - f['x']) ** 2 + (yy - f['y']) ** 2
        bump = np.exp(-d2 / (2 * (f['r'] / 2.2) ** 2))
        h = np.maximum(h, flat + (target - flat) * bump)       # peak: added on top
h[~land & (h < flat * 0.5)] = 0
h = ndi.gaussian_filter(h, 0.8)
Image.fromarray((np.clip(h / HMAX, 0, 1) * 255).astype(np.uint8)).save(OUT)
print('base', round(BASE, 1), '| max', round(float(h.max()), 1), 'units;', 'flat', round(flat, 2), '; features', len(cfg['features']))
