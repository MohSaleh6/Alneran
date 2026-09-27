"""Cut the Alneran logo out of its red background -> site/img/logo.webp, logo-mark.webp and icons.

The source is the restaurant's 678x678 logo (data/images/alneran-logo-original.webp).
Usage: python3 scripts/make_logo.py   (needs Pillow + numpy)
"""
import os, sys, numpy as np
from PIL import Image, ImageFilter, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'images', 'alneran-logo-original.webp')
OUT = os.path.join(ROOT, 'site', 'img')
K = 2
src = Image.open(SRC).convert('RGB')
big = src.resize((678*K, 678*K), Image.LANCZOS)
a = np.array(big.filter(ImageFilter.GaussianBlur(K))).astype(float)
gold = ((a[:, :, 1] > 122) & (a[:, :, 0] > 185)).astype('uint8') * 255
gm = Image.fromarray(gold, 'L')
close = lambda im, n: im.filter(ImageFilter.MaxFilter(n)).filter(ImageFilter.MinFilter(n))
emb = np.array(close(gm, 15).filter(ImageFilter.MaxFilter(3)))
wrd = np.array(close(gm, 5).filter(ImageFilter.MaxFilter(3)))
H = emb.shape[0]; rows = np.arange(H)[:, None]
sil = np.where(rows < 350 * K, emb, wrd)
# egg body (lower half) from the fitted ellipse
cx, cy, rx, ry, rot = 329*K, 232*K, 127*K, 161*K, np.radians(-16)
yy, xx = np.mgrid[0:H, 0:H]
u = (xx-cx)*np.cos(rot) + (yy-cy)*np.sin(rot); v = -(xx-cx)*np.sin(rot) + (yy-cy)*np.cos(rot)
egg = ((u/rx)**2 + (v/ry)**2 <= 1) & ((yy > 175*K) | ((xx > 332*K) & (xx < 378*K) & (yy > 127*K)))
sil = np.maximum(sil, egg * 255).astype('uint8')
# fill enclosed holes
inv = Image.fromarray(255 - sil, 'L').copy()
ImageDraw.floodfill(inv, (2, 2), 128)
f = np.array(inv); sil[f == 255] = 255
med = np.array(Image.fromarray(sil, 'L').filter(ImageFilter.MedianFilter(11)))
sil[:350*K] = med[:350*K]
alpha = Image.fromarray(sil, 'L').filter(ImageFilter.GaussianBlur(K * 0.8))
im = big.convert('RGBA'); im.putalpha(alpha)
box = (186*K, 16*K, 494*K, 502*K)
im.crop(box).save(f'{OUT}/logo.webp', 'WEBP', quality=90, method=6)
# emblem-only crop for small marks
emb_box = (196*K, 16*K, 480*K, 388*K)
eim = im.crop(emb_box); eim.save(f'{OUT}/logo-mark.webp', 'WEBP', quality=90, method=6)

# Icons from the original square artwork (its own red background)
src.resize((180, 180), Image.LANCZOS).save(f'{OUT}/apple-touch-icon.png')
src.resize((512, 512), Image.LANCZOS).save(f'{OUT}/icon-512.png')
fav = eim.copy(); fav.thumbnail((64, 64), Image.LANCZOS)
sq = Image.new('RGBA', (64, 64)); sq.alpha_composite(fav, ((64 - fav.width) // 2, (64 - fav.height) // 2))
sq.save(os.path.join(ROOT, 'site', 'favicon.png'))
# Share image: the logo on a matching red field
og = Image.new('RGB', (1200, 630))
g = np.linspace(0, 1, 1200)[None, :, None]
edge, mid = np.array([150, 18, 22]), np.array([214, 48, 26])
og = Image.fromarray((edge + (mid - edge) * (1 - np.abs(g * 2 - 1))).repeat(630, 0).astype('uint8'))
og.paste(src.resize((630, 630), Image.LANCZOS), (285, 0))
og.save(f'{OUT}/og.jpg', quality=88)
print('logo', im.crop(box).size, 'mark', eim.size)
