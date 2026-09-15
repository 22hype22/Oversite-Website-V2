"""
Grade the flat ERLC render into a dark satellite basemap.

The source is an orthographic Roblox render: no relief, saturated grass,
mid-grey roads. The target look has landform depth, crushed near-black
water, bright road network and a desaturated olive cast.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

SRC = "erlc-map.png"
OUT = sys.argv[1] if len(sys.argv) > 1 else "graded.jpg"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 2560


def blur(arr, radius):
    """Gaussian blur a float array in [0,1] via PIL."""
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255.0


# ── load, flatten the transparent surround onto near-black ──
im = Image.open(SRC)
im = Image.alpha_composite(Image.new("RGBA", im.size, (9, 11, 13, 255)), im).convert("RGB")
im = im.resize((N, N), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255.0

lum = a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
mx, mn = a.max(-1), a.min(-1)
sat = (mx - mn) / (mx + 1e-6)

# ── masks ──
# water: dark, and blue at least as strong as green
water = ((lum < 0.24) & (a[..., 2] >= a[..., 1] - 0.012)).astype(np.float32)
water = blur(water, 2.0)

# roads and rooftops: mid-tone, near-neutral
road = ((lum > 0.26) & (lum < 0.72) & (sat < 0.20)).astype(np.float32)
road = blur(road, 1.0)

# ── landform relief ──
# A heavy blur keeps only the large forms, so roads and tree canopy don't
# emboss; that blurred luminance stands in for elevation.
elev = blur(lum, N / 150.0)
gy, gx = np.gradient(elev)
K = 120.0
nx, ny = -gx * K, -gy * K
inv = 1.0 / np.sqrt(nx * nx + ny * ny + 1.0)
L = np.array([-0.52, -0.52, 0.68])
L /= np.linalg.norm(L)
shade = (nx * L[0] + ny * L[1] + L[2]) * inv
relief = 0.62 + np.clip(shade, -1, 1) * 0.62

# ── local contrast (clarity) ──
detail = lum - blur(lum, N / 460.0)
a = a + detail[..., None] * 0.30

# ── micro texture, so flat grass reads as canopy ──
fine = lum - blur(lum, 1.6)
a = a + fine[..., None] * 0.18

# ── apply relief ──
a *= relief[..., None]

# ── desaturate toward the reference's olive-grey cast ──
g = (a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114)[..., None]
a = g + (a - g) * 0.66

# ── tone curve: darken mids, keep highlights so roads stay legible ──
a = np.clip(a, 0, 1) ** 1.85
a *= 0.70
a = np.clip(a - 0.012, 0, 1)

# ── split tone: cool the shadows, warm the highlights slightly ──
sh = np.clip(1.0 - a.mean(-1, keepdims=True) * 2.4, 0, 1)
hi = np.clip(a.mean(-1, keepdims=True) * 1.7 - 0.55, 0, 1)
a += sh * np.array([-0.012, 0.004, 0.036])
a += hi * np.array([0.016, 0.010, -0.004])

# ── water: crush to deep navy ──
wcol = np.array([0.028, 0.055, 0.085])
a = a * (1 - water[..., None] * 0.88) + wcol * (water[..., None] * 0.88)

# ── roads: lift the network so it reads like a vector overlay ──
a += road[..., None] * np.array([0.030, 0.032, 0.035])

# ── vignette ──
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
r = np.sqrt(((xx / N) - 0.5) ** 2 + ((yy / N) - 0.5) ** 2)
a *= (1.0 - np.clip((r - 0.30) * 1.15, 0, 1) * 0.62)[..., None]

out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
out = out.filter(ImageFilter.UnsharpMask(radius=1.8, percent=105, threshold=3))
out.save(OUT, quality=88, optimize=True, progressive=True)
out.resize((900, 900), Image.LANCZOS).save("check.png")
print("wrote", OUT, out.size)
