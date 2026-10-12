#!/usr/bin/env python3
"""Road network for the CAD's GPS, built from the 4k map picture.

    python3 build-roadnet.py <road_mask.npy> <lot_mask.npy> <out roadnet.json>

road_mask: asphalt (build-road-mask.py). lot_mask: the parking lots within it (wide, blocky asphalt).
Steps: trace the centre line of all asphalt, split it into junctions (nodes) and road pieces (edges), drop
short stubs, then give every edge its length, width, speed, whether it is in a lot, and its travel direction:
a road with a median on one side only is one carriageway of a divided road, so it is one-way with the median
on the driver's left (ER:LC drives on the right). Everything is in map units (0..2000).

Output: {"v":1,"nodes":[[x,y],...],"edges":[[a,b,len,mph,lot,oneway,[x,y,x,y,...]],...]}
  lot: 0 on a road, else a lot number (routes may only use a lot to start or finish in it)
  oneway: 0 both ways, 1 only a->b, -1 only b->a
"""
import sys, json, math, numpy as np
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

road = np.load(sys.argv[1]); lotm = np.load(sys.argv[2]); OUT = sys.argv[3]
H, W = road.shape; K = 2000 / W                                    # map units per pixel
NB = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]

# ── centre lines ──
clean = ndi.binary_opening(ndi.binary_closing(road, iterations=2), iterations=1)
sk = skeletonize(clean)
dt = ndi.distance_transform_edt(clean)                             # half-width at each centre-line pixel
lotlab, nlots = ndi.label(lotm)

def neighbours(x, y):
    return [(x + dx, y + dy) for dx, dy in NB if 0 <= x + dx < W and 0 <= y + dy < H and sk[y + dy, x + dx]]

# prune stubs: ends shorter than ~10 map units are skeleton noise at road edges and lot corners
for _ in range(4):
    ys, xs = np.nonzero(sk); cnt = ndi.convolve(sk.astype(np.uint8), np.ones((3, 3), np.uint8), mode='constant') - sk
    ends = list(zip(xs[cnt[ys, xs] == 1], ys[cnt[ys, xs] == 1])); removed = 0
    for ex, ey in ends:
        path = [(ex, ey)]; cur = (ex, ey); prev = None
        while len(path) < 22:
            nb = [p for p in neighbours(*cur) if p != prev and p not in path]
            if len(nb) != 1: break
            prev, cur = cur, nb[0]
            if len(neighbours(*cur)) > 2: break
            path.append(cur)
        if len(path) < 22 and len(neighbours(*cur)) > 2:
            for px, py in path: sk[py, px] = False
            removed += 1
    if not removed: break

# ── junctions and road pieces ──
ys, xs = np.nonzero(sk); deg = (ndi.convolve(sk.astype(np.uint8), np.ones((3, 3), np.uint8), mode='constant') - sk)
isnode = sk & (deg != 2)
nlab, nn = ndi.label(isnode, structure=np.ones((3, 3)))
cent = ndi.center_of_mass(isnode, nlab, range(1, nn + 1))
node_of = {}; nodes = []
for i, (cy, cx) in enumerate(cent): nodes.append([cx, cy])
for y, x in zip(*np.nonzero(isnode)): node_of[(x, y)] = nlab[y, x] - 1

seen = set(); edges = []; edge_px = {}
def trace(a, first):
    """Walk from a junction along the centre line until the next junction (or a dead end)."""
    path = [first]; mine = {first}; prev = None; cur = first
    while True:
        nb = [p for p in neighbours(*cur) if p != prev]
        hit = [p for p in nb if p in node_of and not (node_of[p] == a and len(path) < 3)]
        if hit: return node_of[hit[0]], path
        nxt = [p for p in nb if p not in node_of and p not in mine]
        if not nxt: return None, path
        prev, cur = cur, nxt[0]; path.append(cur); mine.add(cur)
        if len(path) > 30000: return None, path

for (x, y), a in list(node_of.items()):
    for p in neighbours(x, y):
        if p in node_of or p in seen: continue
        b, path = trace(a, p)
        seen.update(path)
        if b is None: continue
        for q in path: edge_px[q] = len(edges)
        edges.append([a, b, [nodes[a]] + [[q[0], q[1]] for q in path] + [nodes[b]]])

# ── attributes ──
def rdp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]; dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L
        if d > dmax: dmax, idx = d, i
    if dmax <= eps: return [pts[0], pts[-1]]
    return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)

def side_divided(px, py, nx, ny):
    """Looking from (px,py) along normal (nx,ny): past this road's edge, a short gap and then more road that is not a lot.
    Returns (gap width in pixels, a point on the far road) for a median candidate, or 0."""
    gap = -1
    for o in range(1, 70):
        x, y = int(round(px + nx * o)), int(round(py + ny * o))
        if not (0 <= x < W and 0 <= y < H): return 0
        on = clean[y, x]
        if gap < 0:
            if not on: gap = o
        elif on:
            if o - gap < 4: gap = -1; continue                              # a pinhole in the asphalt (paint, a car), not the road's edge
            return ((o - gap), (x, y)) if o - gap <= 19 and not lotm[y, x] else 0   # wider than a median: a frontage road or the next street
    return 0

out_edges = []; cands = []; oi_of = {}                              # oi_of: traced edge number -> output edge number
for ri, (a, b, pts) in enumerate(edges):
    P = np.array(pts, float); seg = np.hypot(*np.diff(P, axis=0).T); L = float(seg.sum()) * K
    if L < 1.5 and a == b: continue
    ix = np.clip(P[:, 0].astype(int), 0, W - 1); iy = np.clip(P[:, 1].astype(int), 0, H - 1)
    width = float(np.median(dt[iy, ix])) * 2 * K                     # road width in map units
    lots = lotlab[iy, ix]; lot = int(np.bincount(lots).argmax()) if (lots > 0).mean() > 0.5 else 0
    if lot and L >= 40 and math.dist(P[0], P[-1]) * K >= 0.9 * L: lot = 0       # a long straight run through wide asphalt is a boulevard, not a lot aisle
    mph = 10 if lot else 25 if width < 13 else 35 if width < 22 else 45
    ow = 0
    cand = None
    if not lot and len(P) >= 3 and L >= 12:
        # a median runs the length of the road at a steady width, with another road beyond it
        side, gaps, far, n = [], [], [], 0
        for i in range(1, len(P) - 1, max(1, len(P) // 16)):
            tx, ty = P[min(len(P) - 1, i + 2)] - P[max(0, i - 2)]; m = math.hypot(tx, ty) or 1; tx, ty = tx / m, ty / m
            rx, ry = -ty, tx                                             # right of travel a->b (y grows downward)
            r, l = side_divided(P[i][0], P[i][1], rx, ry), side_divided(P[i][0], P[i][1], -rx, -ry); n += 1
            if r and not l: side.append(-1); gaps.append(r[0]); far.append(r[1])
            elif l and not r: side.append(1); gaps.append(l[0]); far.append(l[1])
        if n and len(side) / n >= 0.5 and abs(sum(side)) == len(side) and np.std(gaps) <= 0.5 * np.mean(gaps) and np.mean(gaps) <= 19:
            # medians here are 8-19px of grass or kerb; a wider strip with road beyond it is a city block between two streets
            cand = (side[0], far, float(np.mean(gaps)), len(side) / n)
    simp = rdp([tuple(p) for p in P.tolist()], 1.6)
    flat = [round(v * K, 1) for p in simp for v in p]
    oi_of[ri] = len(out_edges); cands.append(cand); out_edges.append([a, b, round(L, 1), mph, lot, ow, flat])

# divided roads come in pairs: keep a carriageway only if the road across its median sees the median too
ys_, xs_ = np.nonzero(sk); skel_idx = ndi.distance_transform_edt(~sk, return_distances=False, return_indices=True)
def edge_at(pt):
    x, y = pt; ny_, nx_ = skel_idx[0][y, x], skel_idx[1][y, x]; return oi_of.get(edge_px.get((nx_, ny_)))
pair = {}
for oi, c in enumerate(cands):
    if not c: continue
    partners = [edge_at(f) for f in c[1]]; partners = [q for q in partners if q is not None and q != oi]
    if partners and sum(1 for q in partners if cands[q]) >= 0.5 * len(partners):
        out_edges[oi][5] = 1 if c[0] > 0 else -1                       # median on the left going a->b: legal a->b only
        pair[oi] = partners
# the two carriageways of a divided road run opposite ways; a pair that agrees means one side was misread, so both stay two-way
def way(e):
    f = e[6]; v = (f[-2] - f[0], f[-1] - f[1]); return (v[0] * e[5], v[1] * e[5])
drop = set()
for oi, ps in pair.items():
    if not out_edges[oi][5]: continue
    for q in ps:
        if out_edges[q][5]:
            a, b = way(out_edges[oi]), way(out_edges[q])
            if a[0] * b[0] + a[1] * b[1] > 0: drop |= {oi, q}
for oi in drop: out_edges[oi][5] = 0

used = sorted({e[0] for e in out_edges} | {e[1] for e in out_edges}); remap = {o: i for i, o in enumerate(used)}
for e in out_edges: e[0], e[1] = remap[e[0]], remap[e[1]]
out = {'v': 1, 'nodes': [[round(nodes[o][0] * K, 1), round(nodes[o][1] * K, 1)] for o in used], 'edges': out_edges}
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('nodes', len(out['nodes']), 'edges', len(out_edges), 'lot edges', sum(1 for e in out_edges if e[4]), 'one-way', sum(1 for e in out_edges if e[5]),
      'size KB', round(len(json.dumps(out, separators=(',', ':'))) / 1024))
if len(sys.argv) > 4:
    for oi, c in enumerate(cands):
        if c and out_edges[oi][5]: print('OW', oi, out_edges[oi][2], round(c[2], 1), round(c[3], 2), out_edges[oi][6][:2])
