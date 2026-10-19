"""Cut the street names and postal numbers out of the owner's labeled map, so the CAD can draw them as their own layer that
stays readable at every zoom (map-labels.js) instead of growing and shrinking with the picture.

The labeled map (liberty-county-labels-hd.jpg) is the plain 2D map (liberty-county-hd.jpg) with the labels painted on, pixel
for pixel, so whatever differs between the two is a label. Nearby letters are joined into one label, each label is cut out with
its outline and see-through around it, and all of them are packed into one picture (map-labels.webp) with a list of where each
one sits on the map (map-labels.json: [x, y, w, h, sx, sy] — its centre in map units, 0 to 2000, its size and its place in the
picture, in pixels of the 5355-pixel map). Run it again whenever the labeled map changes:  python3 preview/build-labels.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
PLAIN, LABELED = os.path.join(HERE, 'liberty-county-hd.jpg'), os.path.join(HERE, 'liberty-county-labels-hd.jpg')
OUT_IMG, OUT_JSON = os.path.join(HERE, 'map-labels.webp'), os.path.join(HERE, 'map-labels.json')
SIZE, WORLD = 5355, 2000
DIFF = 40          # how different a pixel has to be to count as label (JPEG noise stays well under this)
JOIN = 9           # letters and words closer than this (pixels) are one label
MIN_PIXELS = 80    # anything smaller is a speck, not a label
PAD = 3
SHEET_W = 2048

Image.MAX_IMAGE_PIXELS = None
plain = np.asarray(Image.open(PLAIN).convert('RGB'), dtype=np.int16)
labeled_img = Image.open(LABELED).convert('RGB')
labeled = np.asarray(labeled_img, dtype=np.int16)
assert plain.shape == labeled.shape == (SIZE, SIZE, 3), 'the two maps must be the same size'
diff = np.abs(labeled - plain).max(axis=2)
mask = diff > DIFF
del plain
mask = ndimage.binary_opening(mask, structure=np.ones((2, 2)))         # drop single-pixel noise
groups, n = ndimage.label(ndimage.binary_dilation(mask, structure=np.ones((JOIN, JOIN))))
print(f'{int(mask.sum())} label pixels in {n} groups')

# alpha: solid on the label (letters and their outline), soft at its edge
edge = ndimage.binary_dilation(mask, iterations=1)
alpha = np.clip((diff.astype(np.float32) - 18) * (255 / 30), 0, 255)
alpha[mask] = 255
alpha[~edge] = 0
rgba = np.dstack([labeled.astype(np.uint8), alpha.astype(np.uint8)])

cuts = []
for i, sl in enumerate(ndimage.find_objects(groups), start=1):
    if sl is None:
        continue
    own = (groups[sl] == i) & mask[sl]
    if own.sum() < MIN_PIXELS:
        continue
    y0, y1 = max(0, sl[0].start - PAD), min(SIZE, sl[0].stop + PAD)
    x0, x1 = max(0, sl[1].start - PAD), min(SIZE, sl[1].stop + PAD)
    piece = rgba[y0:y1, x0:x1].copy()
    piece[..., 3] = np.where((groups[y0:y1, x0:x1] == i) | (groups[y0:y1, x0:x1] == 0), piece[..., 3], 0)   # only this label, not a neighbour's edge
    cuts.append((x0, y0, piece))

# pack: tallest first, in shelves
cuts.sort(key=lambda c: -c[2].shape[0])
x = y = shelf = 0
spots = []
for x0, y0, piece in cuts:
    h, w = piece.shape[:2]
    if x + w > SHEET_W:
        x, y, shelf = 0, y + shelf + 1, 0
    spots.append((x, y))
    x += w + 1
    shelf = max(shelf, h)
sheet = Image.new('RGBA', (SHEET_W, y + shelf + 1), (0, 0, 0, 0))
out = []
for (x0, y0, piece), (sx, sy) in zip(cuts, spots):
    h, w = piece.shape[:2]
    sheet.paste(Image.fromarray(piece, 'RGBA'), (sx, sy))
    out.append([round((x0 + w / 2) / SIZE * WORLD, 1), round((y0 + h / 2) / SIZE * WORLD, 1), w, h, sx, sy])
sheet.save(OUT_IMG, 'WEBP', lossless=True, quality=100, method=6)
with open(OUT_JSON, 'w') as f:
    json.dump({'size': SIZE, 'world': WORLD, 'labels': out}, f, separators=(',', ':'))
print(f'{len(out)} labels, sheet {sheet.size[0]}x{sheet.size[1]}, {os.path.getsize(OUT_IMG) // 1024} KB')
