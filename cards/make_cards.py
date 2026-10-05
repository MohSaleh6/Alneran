#!/usr/bin/env python3
"""Build the printable QR + NFC table cards (13 x 7 cm, portrait, with 3 mm bleed).

Writes one HTML page per card into cards/build/, which cards/render.js turns into PDF and PNG:
  general  -> the menu link without a table number (works on any table)
  table-N  -> ?t=N, so the WhatsApp order already carries the table number

Usage: python3 cards/make_cards.py [number_of_tables]   (default 7; needs the `qrcode` package)
"""
import io
import os
import sys

import qrcode
import qrcode.image.svg

BASE = "https://alneran.mohalisal1.workers.dev/"
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")

# Physical size in mm. The design is always 70 x 130 mm (plus 3 mm bleed).
#   std: a 7 x 13 cm card
#   big: a 17 x 17 cm sheet for the larger stands, with the same design centred on a full fire
#        background, so it can be cut to the stand's size
TRIM_W, TRIM_H, BLEED = 70, 130, 3
DES_W, DES_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED
SIZES = {"std": (DES_W, DES_H), "big": (170 + 2 * BLEED, 170 + 2 * BLEED)}
# Tables on the larger stands
BIG_TABLES = {6, 7}


# Mask pattern per link, chosen so the code scans cleanly over the fire background (see README)
MASKS = {BASE: 3, BASE + "?t=1": 2, BASE + "?t=2": 4, BASE + "?t=3": 2, BASE + "?t=4": 4, BASE + "?t=5": 3, BASE + "?t=6": 0, BASE + "?t=7": 0}


def qr_svg(url):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, border=0, box_size=10, mask_pattern=MASKS.get(url))
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode()
    svg = svg[svg.index("<svg"):]
    # fill the tile, dark brown modules on white
    svg = svg.replace('width="', 'data-w="', 1).replace('height="', 'data-h="', 1)
    return svg.replace("<path ", '<path fill="#1a0805" ', 1)


def drips(width, spans, items, colors, band, gid, droplets=()):
    """Melting edge: one connected SVG shape hung under a shape's flat bottom edge.
    spans: (x0, x1) flat part of the edge (between rounded corners)
    items: [(x, w, L)] drip centre, neck width and length in mm (left to right)
    colors: (top, bottom) gradient; band: thickness of the sagging melted edge"""
    x0, x1 = spans
    H = max(L for _, _, L in items) + 3
    f = lambda v: f"{v:.2f}"
    d = [f"M{f(x0)} 0L{f(x0)} {f(band * .6)}"]
    cx = x0
    gloss = []
    for x, w, L in items:
        n, r = w * 0.5, w * 0.62
        start = x - w * 1.8
        mid = (cx + start) / 2
        d.append(f"Q{f(mid)} {f(band * 1.45)} {f(start)} {f(band)}")                       # sagging edge
        d.append(f"C{f(x - w * .95)} {f(band)} {f(x - n)} {f(band + w * .35)} {f(x - n)} {f(band + w * 1.3)}")  # neck
        d.append(f"L{f(x - n)} {f(L - r * 1.1)}")
        d.append(f"A{f(r)} {f(r)} 0 1 0 {f(x + n)} {f(L - r * 1.1)}")                      # round drop
        d.append(f"L{f(x + n)} {f(band + w * 1.3)}")
        d.append(f"C{f(x + n)} {f(band + w * .35)} {f(x + w * .95)} {f(band)} {f(x + w * 1.8)} {f(band)}")
        cx = x + w * 1.8
        gloss.append(f'<ellipse cx="{f(x - w * .2)}" cy="{f(L - r * .9)}" rx="{f(w * .15)}" ry="{f(w * .3)}"/>')
        gloss.append(f'<rect x="{f(x - n * .55)}" y="{f(band + w * 1.2)}" width="{f(w * .14)}" height="{f(max(0, L - band - w * 2.6))}" rx="{f(w * .07)}"/>')
    d.append(f"Q{f((cx + x1) / 2)} {f(band * 1.45)} {f(x1)} {f(band * .6)}L{f(x1)} 0Z")
    shapes = [f'<path d="{"".join(d)}"/>']
    for x, y, rr in droplets:
        shapes.append(f'<path d="M{f(x)} {f(y - rr * 2.2)}C{f(x + rr * .45)} {f(y - rr)} {f(x + rr)} {f(y - rr * .4)} {f(x + rr)} {f(y)}'
                      f'A{f(rr)} {f(rr)} 0 1 1 {f(x - rr)} {f(y)}C{f(x - rr)} {f(y - rr * .4)} {f(x - rr * .45)} {f(y - rr)} {f(x)} {f(y - rr * 2.2)}Z"/>')
        gloss.append(f'<ellipse cx="{f(x - rr * .32)}" cy="{f(y - rr * .1)}" rx="{f(rr * .22)}" ry="{f(rr * .34)}"/>')
    return (f'<svg class="drip" viewBox="0 0 {width} {H}" style="width:{width}mm;height:{H}mm" aria-hidden="true">'
            f'<defs><linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="{H - 3}"><stop offset="0" stop-color="{colors[0]}"/>'
            f'<stop offset="1" stop-color="{colors[1]}"/></linearGradient></defs>'
            f'<g fill="url(#{gid})">{"".join(shapes)}</g><g fill="#fff6d6" fill-opacity=".5">{"".join(gloss)}</g></svg>')


# Where each shape melts (mm, measured from the shape's left edge)
TILE_W, NFC_W, NFC_H, BADGE_W = 38.5, 54, 11.6, 32
TILE_DRIPS = drips(TILE_W, (2.6, TILE_W - 2.6),
                   [(6.4, 1.9, 4.4), (12.0, 1.3, 2.6), (17.6, 2.4, 5.6), (23.6, 1.4, 3.0), (28.4, 2.0, 4.6), (33.4, 1.3, 2.4)],
                   ("#ffc72e", "#f07a1c"), 1.1, "gTile", droplets=[(12.0, 4.7, 0.55)])
NFC_DRIPS = drips(NFC_W, (NFC_H / 2, NFC_W - NFC_H / 2),
                  [(11.5, 1.2, 2.5), (18.5, 1.6, 3.4), (26, 1.0, 1.9), (33, 1.5, 3.0), (40.5, 1.1, 2.2)],
                  ("#ffc72e", "#e8701c"), 0.75, "gNfc")
BADGE_DRIPS = drips(BADGE_W, (3, BADGE_W - 3),
                    [(8.6, 1.1, 2.0), (15.4, 1.4, 2.6), (22.6, 1.0, 1.7)],
                    ("#f2731e", "#c92a17"), 0.7, "gBadge")


NFC_ICON = """<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="6" width="20" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/><line x1="20" y1="37" x2="26" y2="37" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M37 17a9 9 0 0 1 0 14M41 13a15 15 0 0 1 0 22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>"""


def card_html(url, table=None, size="std"):
    PAGE_W, PAGE_H = SIZES[size]
    ox, oy = (PAGE_W - DES_W) / 2, (PAGE_H - DES_H) / 2
    badge = f'<div class="c table">طاولة {table} <span>Table {table}</span>{BADGE_DRIPS}</div>' if table else ""
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>
@font-face {{ font-family: Tajawal; font-weight: 500; src: url(../../site/fonts/Tajawal-500-arabic.woff2) format("woff2"); unicode-range: U+0600-06FF, U+FE70-FEFF; }}
@font-face {{ font-family: Tajawal; font-weight: 500; src: url(../../site/fonts/Tajawal-500-latin.woff2) format("woff2"); }}
@font-face {{ font-family: Tajawal; font-weight: 800; src: url(../../site/fonts/Tajawal-800-arabic.woff2) format("woff2"); unicode-range: U+0600-06FF, U+FE70-FEFF; }}
@font-face {{ font-family: Tajawal; font-weight: 800; src: url(../../site/fonts/Tajawal-800-latin.woff2) format("woff2"); }}
@font-face {{ font-family: Baloo; font-weight: 600; src: url(../../site/fonts/BalooBhaijaan2-600-arabic.woff2) format("woff2"); unicode-range: U+0600-06FF, U+FE70-FEFF; }}
@font-face {{ font-family: Baloo; font-weight: 600; src: url(../../site/fonts/BalooBhaijaan2-600-latin.woff2) format("woff2"); }}
@page {{ size: {PAGE_W}mm {PAGE_H}mm; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ width: {PAGE_W}mm; height: {PAGE_H}mm; overflow: hidden; }}
body {{ position: relative; overflow: hidden; background: #130705; color: #fcefe3; font-family: Tajawal, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.bg {{ position: absolute; inset: 0; background: url(../background.jpg) center bottom / cover no-repeat; }}
.shade {{ position: absolute; inset: 0; background:
  radial-gradient({60 * DES_W / PAGE_W:.1f}% {26 * DES_H / PAGE_H:.1f}% at 50% {(oy + 0.2 * DES_H) / PAGE_H * 100:.1f}%, rgba(255,120,30,.28), transparent 70%),
  linear-gradient(180deg, rgba(19,7,5,.55) 0%, rgba(19,7,5,.2) 50%, rgba(19,7,5,0) 70%); }}
.design {{ position: absolute; left: {ox}mm; top: {oy}mm; width: {DES_W}mm; height: {DES_H}mm; }}
.c {{ position: absolute; left: 50%; transform: translateX(-50%); text-align: center; }}
.logo {{ top: 8mm; width: 21mm; }}
.glow {{ top: 5.5mm; width: 42mm; height: 42mm; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,140,30,.42), rgba(255,110,20,.16) 55%, rgba(255,110,20,0)); }}
.latin {{ top: 43mm; font-family: Georgia, "Times New Roman", serif; font-weight: 700; font-size: 3.1mm; letter-spacing: .9mm;
  padding-inline-start: .9mm; color: #ffc72e; white-space: nowrap; }}
.tile {{ top: 49mm; width: {TILE_W}mm; height: {TILE_W}mm; padding: 3.8mm; background: #fff; border-radius: 3.4mm;
  border: .55mm solid #ffc72e; }}
.qr, .qr svg {{ width: 100%; height: 100%; display: block; }}
.drip {{ position: absolute; left: 50%; top: 100%; transform: translateX(-50%); display: block; overflow: visible; }}
.scan {{ top: 93.8mm; white-space: nowrap; }}
.scan b {{ display: block; font-family: Baloo, Tajawal, sans-serif; font-weight: 600; font-size: 4.6mm; line-height: 1.15; color: #fff; }}
.scan small {{ display: block; font-size: 2.6mm; font-weight: 500; color: #ffdcb8; letter-spacing: .1mm; }}
.nfc {{ top: 104mm; width: {NFC_W}mm; height: {NFC_H}mm; justify-content: center; display: flex; align-items: center; gap: 2.2mm; padding: 1.9mm 3.6mm 1.9mm 3mm; border-radius: 99mm;
  background: rgba(19,7,5,.82); border: .35mm solid rgba(255,199,46,.75); white-space: nowrap; }}
.nfc > svg:first-child {{ width: 7mm; height: 7mm; color: #ffc72e; flex: none; }}
.nfc div {{ text-align: start; }}
.nfc b {{ display: block; font-weight: 800; font-size: 3.2mm; line-height: 1.2; color: #fff; }}
.nfc small {{ display: block; font-size: 2.3mm; font-weight: 500; color: #ffdcb8; }}
.table {{ top: 119.6mm; width: {BADGE_W}mm; padding: 1mm 0; border-radius: 99mm; background: linear-gradient(135deg, #ffc72e, #f57a1f 55%, #e2321f);
  color: #2a0d04; font-weight: 800; font-size: 3.2mm; white-space: nowrap; }}
.table span {{ font-weight: 500; font-size: 2.5mm; margin-inline-start: 1mm; }}
</style></head><body>
<div class="bg"></div><div class="shade"></div>
<div class="design">
<div class="c glow"></div>
<img class="c logo" src="../../site/img/logo.webp" alt="">
<div class="c latin">ALNERAN</div>
<div class="c tile"><div class="qr">{qr_svg(url)}</div>{TILE_DRIPS}</div>
<div class="c scan"><b>امسح الرمز لعرض المنيو</b><small>Scan to view the menu</small></div>
<div class="c nfc">{NFC_ICON}<div><b>أو قرّب هاتفك من البطاقة</b><small>or tap your phone on the card</small></div>{NFC_DRIPS}</div>
{badge}
</div>
</body></html>"""


def main():
    if os.environ.get("QR_MASK"):  # testing: QR_MASK=<url>=<0..7>
        u, m = os.environ["QR_MASK"].rsplit("=", 1)
        MASKS[u] = int(m)
    tables = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    os.makedirs(BUILD, exist_ok=True)
    cards = [("general", BASE, None, "std")] + [
        (f"table-{n:02d}" + ("-17x17" if n in BIG_TABLES else ""), f"{BASE}?t={n}", n, "big" if n in BIG_TABLES else "std")
        for n in range(1, tables + 1)]
    with open(os.path.join(BUILD, "cards.tsv"), "w") as f:
        for name, url, table, size in cards:
            with open(os.path.join(BUILD, f"{name}.html"), "w", encoding="utf-8") as h:
                h.write(card_html(url, table, size))
            w, hh = SIZES[size]
            f.write(f"{name}\t{url}\t{w}\t{hh}\n")
    print(f"{len(cards)} cards -> {BUILD}")


if __name__ == "__main__":
    main()
