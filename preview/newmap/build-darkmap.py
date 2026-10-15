#!/usr/bin/env python3
"""The 2D dark map: a monochrome blueprint of Liberty County. White roads and coastline, grey building blocks, faint
contour lines, textured dark land on a near-black sea. Drawn from Oversite's own data, so it lines up exactly with
the light map and with player positions.

    python3 build-darkmap.py <out.jpg> [size]

Inputs (all in preview/): liberty-county-4k.jpg (land, water and ground texture), liberty-county-height.png
(contours, 16-bit as written by tame-terrain.py), liberty-county-3d.json (building footprints), newmap/roadnet.json (roads).
"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

OUT = sys.argv[1]; S = int(sys.argv[2]) if len(sys.argv) > 2 else 4096
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(HERE, '..')
W = 2000.0; k = S / W                                   # pixels per world unit
SS = 2; K = k * SS                                        # line work is drawn at 2x and scaled down, for clean edges

SEA = np.array([17, 17, 19], np.float32)                 # same as the page background behind the map (#111113)
LAND = np.array([30, 31, 35], np.float32)

# ── land and water from the light map: water is the teal of the sea and lakes ──
src = np.asarray(Image.open(os.path.join(P, 'liberty-county-4k.jpg')).convert('RGB').resize((S, S), Image.LANCZOS)).astype(np.float32)
r, g, b = src[..., 0], src[..., 1], src[..., 2]
water = ((b - r) > 22) & ((g - r) > 16) & (b > 70)
water = ndi.binary_opening(water, iterations=2); water = ndi.binary_closing(water, iterations=2)
lab, n = ndi.label(~water); sizes = ndi.sum(np.ones_like(lab), lab, range(n + 1))
land = np.isin(lab, np.nonzero(sizes > (S / 400) ** 2)[0]) & (lab > 0)      # drop specks of "land" in the water
lab, n = ndi.label(~land); sizes = ndi.sum(np.ones_like(lab), lab, range(n + 1))
land |= np.isin(lab, np.nonzero(sizes < (S / 300) ** 2)[0]) & (lab > 0)     # and fill specks of "water" on land
soft = ndi.gaussian_filter(land.astype(np.float32), 1.0)

# ground texture: the light map's fine detail (trees, rock, fields), kept faint
lum = src @ np.array([0.3, 0.59, 0.11], np.float32)
detail = lum - ndi.gaussian_filter(lum, 3)
shade = ndi.gaussian_filter(lum, 12); shade = (shade - shade[land].mean()) / (shade[land].std() + 1e-6)
ground = LAND[None, None, :] + (detail * 0.22 + shade * 2.0)[..., None]

# contours from the terrain: a thin line every 2.5 units (about 9 studs) of height
hm = np.asarray(Image.open(os.path.join(P, 'liberty-county-height.png')).convert('RGB')).astype(np.float32)
h = (hm[..., 0] * 256 + hm[..., 1]) / 65535 * 150
h = ndi.zoom(ndi.gaussian_filter(h, 1.2), S / h.shape[0], order=1)
step = 2.5; f = h / step; gy, gx = np.gradient(f); gm = np.hypot(gx, gy) + 1e-6
dist = np.abs(f - np.round(f)) / gm                     # pixels to the nearest contour level
contour = np.clip(1.1 - dist, 0, 1) * (h > 1.8) * land
ground += contour[..., None] * 34

img = SEA[None, None, :] * (1 - soft[..., None]) + ground * soft[..., None]

# ── line work at 2x: coastline, buildings, roads ──
def layer(): return Image.new('L', (S * SS, S * SS), 0)
coast = Image.fromarray((land * 255).astype(np.uint8)).resize((S * SS, S * SS), Image.BILINEAR).filter(ImageFilter.FIND_EDGES)
coast = coast.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(3))
ImageDraw.Draw(coast).rectangle([0, 0, S * SS - 1, S * SS - 1], outline=0, width=4 * SS)   # FIND_EDGES marks the image border too

geo = json.load(open(os.path.join(P, 'liberty-county-3d.json')))
bfill, bedge = layer(), layer(); df, de = ImageDraw.Draw(bfill), ImageDraw.Draw(bedge)
tone = {}                                                 # each block's grey follows its roof brightness on the light map
for i, bl in enumerate(geo['buildings']):
    x, y, L, Wd, ang = bl[:5]; c, s = np.cos(ang), np.sin(ang)
    pts = [((x + u * c - v * s) * K, (y + u * s + v * c) * K) for u, v in ((-L / 2, -Wd / 2), (L / 2, -Wd / 2), (L / 2, Wd / 2), (-L / 2, Wd / 2))]
    px, py = int(min(S - 1, max(0, x * k))), int(min(S - 1, max(0, y * k)))
    t = 70 + int(np.clip(lum[py, px] / 255, 0, 1) * 85)
    df.polygon(pts, fill=t); de.line(pts + [pts[0]], fill=255, width=max(1, int(SS * 1.2)))

net = json.load(open(os.path.join(HERE, 'roadnet.json')))
WIDTH = {10: 2.0, 25: 3.6, 35: 4.6, 45: 5.4}            # road width in units by speed class (parking 10, streets 25, roads 35, highway 45)
# the network was traced from the map, so its lines wobble: straighten (Douglas-Peucker, 1.2 units) then round the corners (Chaikin)
def simplify(P, eps=1.2):
    if len(P) < 3: return P
    a, b = np.array(P[0]), np.array(P[-1]); ab = b - a; L = np.hypot(*ab) or 1e-9
    d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L for p in P[1:-1]]; i = int(np.argmax(d)) + 1
    return simplify(P[:i + 1], eps)[:-1] + simplify(P[i:], eps) if d[i - 1] > eps else [P[0], P[-1]]
def chaikin(P, n=2):
    for _ in range(n):
        if len(P) < 3: return P
        Q = [P[0]]
        for p, q in zip(P, P[1:]): Q += [(0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]), (0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1])]
        P = Q + [P[-1]]
    return P
roads, gaps = layer(), layer(); dr, dg = ImageDraw.Draw(roads), ImageDraw.Draw(gaps)
for e in sorted(net['edges'], key=lambda e: e[3]):
    pts = e[6]; xy = [(x * K, y * K) for x, y in chaikin(simplify([(pts[i], pts[i + 1]) for i in range(0, len(pts), 2)]))]
    if len(xy) < 2: continue
    wpx = WIDTH.get(e[3], 4.6) * K
    dr.line(xy, fill=255, width=int(wpx), joint='curve')
    for p in (xy[0], xy[-1]): dr.ellipse([p[0] - wpx / 2, p[1] - wpx / 2, p[0] + wpx / 2, p[1] + wpx / 2], fill=255)
    if e[3] >= 45: dg.line(xy, fill=255, width=max(1, int(wpx * 0.34)), joint='curve')   # the highway reads as a double line, like a divided road

down = lambda im, blur=0: np.asarray((im.filter(ImageFilter.GaussianBlur(blur)) if blur else im).resize((S, S), Image.LANCZOS)).astype(np.float32) / 255
bf, be, rd, gp, co = down(bfill), down(bedge), down(roads), down(gaps), down(coast)
glow = down(roads, 6 * SS)                                # a faint halo round the roads

def over(img, a, col): return img * (1 - a[..., None]) + np.array(col, np.float32)[None, None, :] * a[..., None]
img = over(img, np.clip(co * 1.15, 0, 1), (226, 228, 231))
bmask = (bf > 0.02).astype(np.float32) * np.clip(bf * 3, 0, 1)
tones = np.asarray(bfill.resize((S, S), Image.NEAREST)).astype(np.float32)
img = img * (1 - bmask[..., None]) + np.stack([tones] * 3, -1) * bmask[..., None]
img = over(img, be * 0.55, (150, 153, 158))
img = over(img, glow * 0.18, (235, 236, 238))
img = over(img, rd, (236, 237, 239))
img = over(img, gp * 0.9, (40, 41, 45))

Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT, quality=88, optimize=True, progressive=True)
print(f'{OUT}: {S}px, land {land.mean() * 100:.1f}%, {len(geo["buildings"])} buildings, {len(net["edges"])} road segments')
