import json, math
p='preview/liberty-county-3d.json'; g=json.load(open(p))
B=g['buildings']
def near(x,y,r=32):
    best=None
    for i,b in enumerate(B):
        d=math.hypot(b[0]-x,b[1]-y)
        if d<r and (best is None or d<best[0]): best=(d,i)
    return best[1] if best else None
# landmarks matched from the in-game shots: (world x, y) → storeys, wall colour, note
LM=[
 ((612,1492), 14, '#1C2027', 'dark glass tower'),
 ((615,1520), 3,  '#B8926A', 'tan brick office'),
 ((575,1425), 8,  '#2C4C80', 'blue glass office'),
 ((620,1425), 3,  '#D6D6D4', 'warehouse, white with red base'),
 ((530,1425), 4,  '#9A9DA3', 'parking garage'),
 ((330,1400), 3,  '#6E6A66', 'large hip-roof building'),
 ((600,1590), 2,  '#E4E4E2', 'supermarket'),
 ((630,1660), 1,  '#7A5A3A', 'brown-roof restaurant'),
]
for (x,y),st,col,note in LM:
    i=near(x,y)
    if i is None: print('no footprint near',note); continue
    B[i][5]=round(st*3.6,1); B[i][7]=col; B[i][6]=9   # kind 9 = pinned landmark (colour used as-is)
    print(f'{note:34s} → #{i} at ({B[i][0]},{B[i][1]}) h={B[i][5]}')
# yellow-roofed building the extractor dropped
B.append([592,1485,34,34,0.0,7.2,9,'#D9B85C']); print('added yellow-roof building')
json.dump(g,open(p,'w'),separators=(',',':'))
