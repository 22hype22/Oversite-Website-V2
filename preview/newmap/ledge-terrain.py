#!/usr/bin/env python3
"""Terrain from the rock ledges on the official map.

    python3 ledge-terrain.py <masks.npy> <out.png> [peak_units]

On ER:LC's map every grey rock line is a ledge where the ground steps up, and the ledges nest like contour lines:
a hill is a cluster of rings, its top the area inside the innermost ring. So:
  1. ledge lines are thinned to one pixel, so a thick rock patch counts like a single ledge;
  2. smoothing them gives how many ledges are around each point: high on hillsides, low on open flat land;
  3. basins are filled (as with real elevation data): ground ringed by higher ground that doesn't drain to the sea or
     a river rises to the rim, so the inside of a ring becomes the hilltop, and rivers and lakes stay low;
  4. scaled so the top 1% of land is at `peak_units` (default 22 units, ~77 studs).
Output is 16-bit in red (high byte) + green (low byte) over 150 units; tame-terrain.py then adds the photo-measured
features, smooth roads and building pads.
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize, reconstruction

MASKS, OUT = sys.argv[1], sys.argv[2]; PEAK = float(sys.argv[3]) if len(sys.argv) > 3 else 22.0
HMAX, SPREAD = 150.0, 14.0                                  # SPREAD: how far (units) a ledge lifts the ground around it
sea, water, land, rock, road = np.load(MASKS).astype(bool); N = sea.shape[0]; upx = 2000 / N

lines = skeletonize(ndi.binary_closing(rock, iterations=1) & land).astype(np.float32)
h = ndi.gaussian_filter(lines, SPREAD / upx); h = ndi.gaussian_filter(h, SPREAD / upx * 0.6)
h = h / np.percentile(h[land], 99) * PEAK
h = np.where(sea, 0, h); h[water & ~sea] = np.minimum(h[water & ~sea], 0.5)
outlet = sea | water; outlet[0, :] = outlet[-1, :] = outlet[:, 0] = outlet[:, -1] = True
h = reconstruction(np.where(outlet, h, h.max()), h, method='erosion')        # fill basins: ring interiors become hilltops
h = ndi.gaussian_filter(h, 1.5); h[sea] = 0

h = np.asarray(Image.fromarray(h.astype(np.float32)).resize((1024, 1024), Image.BILINEAR))
q = (np.clip(h / HMAX, 0, 1) * 65535).round().astype(np.uint32)
Image.fromarray(np.stack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), np.zeros(q.shape, np.uint8)], -1), 'RGB').save(OUT)
print(f'max {h.max():.1f} units, median land {np.median(h[h > 0.3]):.1f}')
