#!/usr/bin/env python3
"""Build the burger cut-outs in site/img/ from the photos in images/.

For each burger (hero, beefy, crunchy, hotbeef, dijon, smokey, looong):
  1. Take images/<name>.(jpg|jpeg|png|webp). If there is no photo yet, fall back to
     images/_placeholder/<name>.png (rendered by make_placeholders.mjs) and say so.
  2. Remove the background with rembg, unless the file already has transparency
     (so a cut-out exported from Photoshop or remove.bg is used as is).
  3. Trim to the burger, centre it on a square transparent canvas, and save
     site/img/<name>-<width>.webp at each width in WIDTHS (for srcset).

The hero burger splits into floating layers on scroll. The split lines come from
images/hero.cuts.json: a list of fractions of the burger's height, measured from
the top of the bun (0) to the bottom (1), one per gap between ingredients, e.g.
[0.32, 0.47, 0.60, 0.74, 0.86]. The script converts them to canvas positions and
writes them into site/index.html (data-cuts on #heroBurger).

Every image URL in site/index.html also gets a ?v=<content hash>, so the images can be
cached for a year and visitors still get new photos as soon as they change.

Usage:  python3 scripts/build_images.py            (needs Pillow; rembg for opaque photos)
        REMBG_MODEL=birefnet-general python3 scripts/build_images.py   (sharper, slower model)
"""
import hashlib
import io
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images")
PLACEHOLDER = os.path.join(SRC, "_placeholder")
OUT = os.path.join(ROOT, "site", "img")
HTML = os.path.join(ROOT, "site", "index.html")

NAMES = ["hero", "beefy", "crunchy", "hotbeef", "dijon", "smokey", "looong"]
WIDTHS = [400, 640, 960, 1280]
CANVAS = 1280
# The burger fills at most this share of the canvas width / height.
FIT_W, FIT_H = 0.94, 0.84
QUALITY = 80
DEFAULT_CUTS = [0.32, 0.47, 0.60, 0.74, 0.86]

_session = None


def remove_background(img):
    global _session
    try:
        from rembg import new_session, remove
    except ImportError:
        sys.exit("This photo has no transparency. Install rembg to cut it out:  pip install \"rembg[cpu]\"")
    if _session is None:
        _session = new_session(os.environ.get("REMBG_MODEL", "u2net"))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "PNG")
    return Image.open(io.BytesIO(remove(buf.getvalue(), session=_session, post_process_mask=True))).convert("RGBA")


def has_transparency(img):
    if img.mode not in ("RGBA", "LA", "PA") and not (img.mode == "P" and "transparency" in img.info):
        return False
    lo, _ = img.convert("RGBA").getchannel("A").getextrema()
    return lo < 250


def find_source(name):
    for ext in ("jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"):
        path = os.path.join(SRC, f"{name}.{ext}")
        if os.path.exists(path):
            return path, False
    path = os.path.join(PLACEHOLDER, f"{name}.png")
    if os.path.exists(path):
        return path, True
    return None, False


def cutout(path):
    img = Image.open(path)
    img.load()
    img = img.convert("RGBA") if has_transparency(img) else remove_background(img)
    # Ignore near-invisible fringe pixels when finding the burger's edges.
    alpha = img.getchannel("A").point(lambda a: 255 if a > 24 else 0)
    box = alpha.getbbox()
    if not box:
        sys.exit(f"{path}: nothing left after removing the background")
    return img.crop(box)


def place(burger):
    """Centre the burger on the square canvas. Returns the canvas and the burger's top/bottom in canvas fractions."""
    scale = min(CANVAS * FIT_W / burger.width, CANVAS * FIT_H / burger.height)
    w, h = round(burger.width * scale), round(burger.height * scale)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x, y = (CANVAS - w) // 2, (CANVAS - h) // 2
    canvas.alpha_composite(burger.resize((w, h), Image.LANCZOS), (x, y))
    return canvas, y / CANVAS, (y + h) / CANVAS


def load_cuts(used_placeholder):
    path = os.path.join(PLACEHOLDER if used_placeholder else SRC, "hero.cuts.json")
    if not os.path.exists(path):
        return DEFAULT_CUTS
    with open(path) as f:
        cuts = json.load(f)
    if not (isinstance(cuts, list) and cuts and all(0 < c < 1 for c in cuts) and cuts == sorted(cuts)):
        sys.exit(f"{path}: expected an ascending list of fractions between 0 and 1")
    return cuts


def update_html(cuts, versions):
    with open(HTML, encoding="utf-8") as f:
        html = f.read()
    new, n = re.subn(r'(id="heroBurger"[^>]*?data-cuts=")[^"]*(")', lambda m: m.group(1) + ",".join(f"{c:.4f}" for c in cuts) + m.group(2), html)
    if n != 1:
        sys.exit('site/index.html: could not find data-cuts="" on #heroBurger')
    for name, v in versions.items():
        new = re.sub(rf'(/img/{name}-\d+\.webp)(\?v=[0-9a-f]+)?', rf'\g<1>?v={v}', new)
    if new != html:
        with open(HTML, "w", encoding="utf-8") as f:
            f.write(new)


def main():
    os.makedirs(OUT, exist_ok=True)
    missing = []
    versions = {}
    cuts = None
    for name in NAMES:
        path, is_placeholder = find_source(name)
        if not path:
            sys.exit(f"No image for {name}: add images/{name}.jpg (or run make_placeholders.mjs)")
        if is_placeholder:
            missing.append(name)
        canvas, top, bottom = place(cutout(path))
        digest = hashlib.sha1()
        for w in WIDTHS:
            img = canvas if w == CANVAS else canvas.resize((w, w), Image.LANCZOS)
            out = os.path.join(OUT, f"{name}-{w}.webp")
            img.save(out, "WEBP", quality=QUALITY, method=6, alpha_quality=90)
            with open(out, "rb") as f:
                digest.update(f.read())
        versions[name] = digest.hexdigest()[:8]
        sizes = ", ".join(f"{os.path.getsize(os.path.join(OUT, f'{name}-{w}.webp')) // 1024} KB" for w in WIDTHS)
        print(f"{name:8} {'placeholder' if is_placeholder else 'photo'}  {os.path.relpath(path, ROOT)}  ->  {sizes}")
        if name == "hero":
            cuts = [top + c * (bottom - top) for c in load_cuts(is_placeholder)]
    update_html(cuts, versions)
    if missing:
        print(f"\nStill using placeholder illustrations for: {', '.join(missing)}.\nAdd the photos to images/ and run this again.")


if __name__ == "__main__":
    main()
