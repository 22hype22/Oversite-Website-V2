#!/usr/bin/env python3
"""Solve API (LocationX, LocationZ) → model world coordinates from calibration markers.

Reads survey/track.jsonl markers whose note starts with a stop number, matches them to survey/stops.json,
fits world = s * api + t (uniform scale, no rotation), writes survey/api-calibration.json and prints the fit.
Usage: python3 survey/calibrate.py [survey/track.jsonl]
"""
import json, sys, re, numpy as np
track = sys.argv[1] if len(sys.argv) > 1 else 'survey/track.jsonl'
stops = {s['stop']: s for s in json.load(open('survey/stops.json'))}
CAL = {3, 4}                                       # fountain plaza, water tower: the operator stands at the object
pairs = []
for line in open(track):
    r = json.loads(line)
    if not r.get('marker'): continue
    m = re.match(r'\s*(\d+)', r.get('note', ''))
    if not m: continue
    n = int(m.group(1))
    if n in stops and n in CAL and r.get('x') is not None:
        pairs.append(((r['x'], r['z']), stops[n]['world'], n))
if len(pairs) < 2:
    sys.exit('need markers at stops 3 and 4 (type "3 plaza" / "4 water tower" then Enter while standing there)')
A = np.array([[x, 1, 0] for (x, z), _, _ in pairs] + [[z, 0, 1] for (x, z), _, _ in pairs])
b = np.array([w[0] for _, w, _ in pairs] + [w[1] for _, w, _ in pairs])
(s, tx, ty), *_ = np.linalg.lstsq(A, b, rcond=None)
print(f'world = {s:.5f} * api + ({tx:.1f}, {ty:.1f})')
for (x, z), w, n in pairs: print(f'  stop {n}: api ({x:.1f},{z:.1f}) → model ({x*s+tx:.1f},{z*s+ty:.1f}) expected {w}')
json.dump({'scale': s, 'tx': tx, 'ty': ty, 'note': 'world = scale*api + (tx,ty); world grid is the 2000-unit model grid'}, open('survey/api-calibration.json', 'w'), indent=1)
print('wrote survey/api-calibration.json')
