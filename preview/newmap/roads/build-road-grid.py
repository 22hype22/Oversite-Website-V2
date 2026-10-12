# Turn the road mask into the in-page routing grid (G x G bits) and store it in routes.json as _grid
import sys, json, base64, numpy as np
from PIL import Image
from scipy import ndimage as ndi
SC = sys.argv[1]; G = 1024
keep = np.load(SC + '/roads/mask.npy')
lab, n = ndi.label(keep); sz = ndi.sum(keep, lab, range(1, n + 1)); big = sz.max()
print('component sizes', sorted((int(x) for x in sz), reverse=True)[:12])
net = np.isin(lab, np.nonzero(sz >= big * 0.02)[0] + 1)                  # the road network, not stray grey cliffs
cov = np.asarray(Image.fromarray((net * 255).astype(np.uint8)).resize((G, G), Image.BOX)) / 255
grid = cov > 0.6
glab, gn = ndi.label(grid, structure=np.ones((3, 3))); gsz = ndi.sum(grid, glab, range(1, gn + 1))
grid = glab == (np.argmax(gsz) + 1)   # one connected network, so every snapped point can reach every other
print('grid', G, 'road cells', int(grid.sum()), 'pieces', int((gsz >= 40).sum()))
R = json.load(open('preview/newmap/routes.json'))
R['_grid'] = {'n': G, 'bits': base64.b64encode(np.packbits(grid.astype(np.uint8).ravel()).tobytes()).decode()}
json.dump(R, open('preview/newmap/routes.json', 'w'), separators=(',', ':'))
im = Image.open('preview/liberty-county.jpg').convert('RGB').resize((1536, 1536)); red = Image.new('RGB', im.size, (255, 0, 0))
Image.composite(red, im, Image.fromarray((grid * 130).astype(np.uint8)).resize((1536, 1536), Image.NEAREST)).save(SC + '/roads/grid.jpg', quality=78)
