#!/usr/bin/env python3
"""Demo patrol routes along real roads. Skeletonises the road mask from build-masks.py and
walks it from a few seed points, preferring to keep straight at junctions.

    python3 build-routes.py <height_masks.npy> <out routes.json>
Output: {"R0": [[x,y],...], ...} in world units (0..2000)."""
import sys, json, random, math
import numpy as np
from scipy import ndimage as ndi
from skimage.morphology import skeletonize
masks = np.load(sys.argv[1]); RD = masks[4].astype(bool); N = RD.shape[0]; K = 2000 / N
road = ndi.binary_opening(ndi.binary_closing(RD, iterations=2), iterations=1)
lab, n = ndi.label(road); sz = ndi.sum(road, lab, range(1, n + 1)); road = np.isin(lab, [i + 1 for i, z in enumerate(sz) if z >= 400])
dt = ndi.distance_transform_edt(road)
sk = skeletonize(road) & (dt <= 8)          # drop the medial lines of parking lots (wide grey areas), keep roads
# prune short spurs so walks do not dead-end in lot stubs
for _ in range(3):
    nb = ndi.convolve(sk.astype(int), np.ones((3, 3), int), mode='constant') - sk
    ends = sk & (nb == 1)
    sk = sk & ~ends
ys, xs = np.nonzero(sk); pix = set(zip(xs.tolist(), ys.tolist()))
NB8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]
def neigh(p): return [(p[0] + dx, p[1] + dy) for dx, dy in NB8 if (p[0] + dx, p[1] + dy) in pix]
def nearest(wx, wy):
    px, py = wx / K, wy / K; i = np.argmin((xs - px) ** 2 + (ys - py) ** 2); return (int(xs[i]), int(ys[i]))
def walk(start, steps, rng):
    path = [start]; recent = {start}; prev = None; cur = start
    for _ in range(steps):
        opts = [q for q in neigh(cur) if q != prev and q not in recent]
        if not opts: opts = [q for q in neigh(cur) if q != prev]
        if not opts: opts = [prev] if prev else []; recent = set()      # dead end: turn around
        if not opts: break
        if prev is None: nxt = rng.choice(opts)
        else:
            hx, hy = cur[0] - prev[0], cur[1] - prev[1]
            def score(q): dx, dy = q[0] - cur[0], q[1] - cur[1]; return (hx * dx + hy * dy) / (math.hypot(hx, hy) * math.hypot(dx, dy)) + rng.random() * 0.12
            nxt = max(opts, key=score)
        prev, cur = cur, nxt; path.append(cur); recent.add(cur)
        if len(recent) > 1500: recent.discard(path[-1500])
    return path
def simplify(pts, tol):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); d = b - a; L = np.hypot(*d) or 1
    dist = [abs((p[0] - a[0]) * d[1] - (p[1] - a[1]) * d[0]) / L for p in pts]
    i = int(np.argmax(dist))
    if dist[i] > tol: return simplify(pts[:i + 1], tol)[:-1] + simplify(pts[i:], tol)
    return [pts[0], pts[-1]]
SEEDS = [(560, 1620), (1000, 1430), (1420, 250), (1050, 980), (640, 760), (330, 1500), (1700, 1300), (1120, 870)]
rng = random.Random(7); out = {}
for i, (wx, wy) in enumerate(SEEDS):
    p = walk(nearest(wx, wy), 1300 + i * 80, rng)
    out[f'R{i}'] = [[round(x * K, 1), round(y * K, 1)] for x, y in simplify(p, 1.2)]
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))
print({k: (len(v), round(sum(math.hypot(v[j][0] - v[j - 1][0], v[j][1] - v[j - 1][1]) for j in range(1, len(v)))) ) for k, v in out.items()})
