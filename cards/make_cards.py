#!/usr/bin/env python3
"""Build the printable QR + NFC table cards (13 x 7 cm, portrait, with 3 mm bleed).

Writes one HTML page per card into cards/build/, which cards/render.js turns into PDF and PNG:
  general  -> the menu link without a table number (works on any table)
  table-N  -> ?t=N, so the WhatsApp order already carries the table number

Usage: python3 cards/make_cards.py [number_of_tables]   (default 20; needs the `qrcode` package)
"""
import io
import os
import sys

import qrcode
import qrcode.image.svg

BASE = "https://alneran.mohalisal1.workers.dev/"
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")

# Physical size in mm: trim 70 x 130, plus 3 mm bleed on every side
TRIM_W, TRIM_H, BLEED = 70, 130, 3
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED


def qr_svg(url):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, border=0, box_size=10)
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


NFC_ICON = """<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="6" width="20" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/><line x1="20" y1="37" x2="26" y2="37" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M37 17a9 9 0 0 1 0 14M41 13a15 15 0 0 1 0 22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>"""


def card_html(url, table=None):
    badge = f'<div class="c table">طاولة {table} <span>Table {table}</span></div>' if table else ""
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
html, body {{ width: {PAGE_W}mm; height: {PAGE_H}mm; }}
body {{ position: relative; overflow: hidden; background: #130705; color: #fcefe3; font-family: Tajawal, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.bg {{ position: absolute; inset: 0; background: url(../background.jpg) center bottom / cover no-repeat; }}
.shade {{ position: absolute; inset: 0; background:
  radial-gradient(60% 26% at 50% 20%, rgba(255,120,30,.28), transparent 70%),
  linear-gradient(180deg, rgba(19,7,5,.55) 0%, rgba(19,7,5,.2) 50%, rgba(19,7,5,0) 70%); }}
.c {{ position: absolute; left: 50%; transform: translateX(-50%); text-align: center; }}
.logo {{ top: 10mm; width: 23mm; filter: drop-shadow(0 0 2.2mm rgba(255,130,20,.55)); }}
.latin {{ top: 48.6mm; font-family: Georgia, "Times New Roman", serif; font-weight: 700; font-size: 3.1mm; letter-spacing: .9mm;
  padding-inline-start: .9mm; color: #ffc72e; white-space: nowrap; }}
.tile {{ top: 54.5mm; width: 38.5mm; height: 38.5mm; padding: 3.8mm; background: #fff; border-radius: 3.4mm;
  box-shadow: 0 0 0 .55mm #ffc72e, 0 0 4mm 1mm rgba(255,140,30,.45); }}
.tile svg {{ width: 100%; height: 100%; display: block; }}
.scan {{ top: 95.3mm; white-space: nowrap; }}
.scan b {{ display: block; font-family: Baloo, Tajawal, sans-serif; font-weight: 600; font-size: 4.6mm; line-height: 1.15; color: #fff;
  text-shadow: 0 .3mm 1.2mm rgba(0,0,0,.6); }}
.scan small {{ display: block; font-size: 2.6mm; font-weight: 500; color: #ffdcb8; letter-spacing: .1mm; }}
.nfc {{ top: 106mm; display: flex; align-items: center; gap: 2.2mm; padding: 1.9mm 3.6mm 1.9mm 3mm; border-radius: 99mm;
  background: rgba(19,7,5,.82); border: .35mm solid rgba(255,199,46,.75); white-space: nowrap; }}
.nfc svg {{ width: 7mm; height: 7mm; color: #ffc72e; flex: none; }}
.nfc div {{ text-align: start; }}
.nfc b {{ display: block; font-weight: 800; font-size: 3.2mm; line-height: 1.2; color: #fff; }}
.nfc small {{ display: block; font-size: 2.3mm; font-weight: 500; color: #ffdcb8; }}
.table {{ top: 119.5mm; padding: 1mm 3.4mm; border-radius: 99mm; background: linear-gradient(135deg, #ffc72e, #f57a1f 55%, #e2321f);
  color: #2a0d04; font-weight: 800; font-size: 3.2mm; white-space: nowrap; box-shadow: 0 .4mm 1.6mm rgba(0,0,0,.4); }}
.table span {{ font-weight: 500; font-size: 2.5mm; margin-inline-start: 1mm; }}
</style></head><body>
<div class="bg"></div><div class="shade"></div>
<img class="c logo" src="../../site/img/logo.webp" alt="">
<div class="c latin">ALNERAN</div>
<div class="c tile">{qr_svg(url)}</div>
<div class="c scan"><b>امسح الرمز لعرض المنيو</b><small>Scan to view the menu</small></div>
<div class="c nfc">{NFC_ICON}<div><b>أو قرّب هاتفك من البطاقة</b><small>or tap your phone on the card</small></div></div>
{badge}
</body></html>"""


def main():
    tables = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    os.makedirs(BUILD, exist_ok=True)
    cards = [("general", BASE, None)] + [(f"table-{n:02d}", f"{BASE}?t={n}", n) for n in range(1, tables + 1)]
    with open(os.path.join(BUILD, "cards.tsv"), "w") as f:
        for name, url, table in cards:
            with open(os.path.join(BUILD, f"{name}.html"), "w", encoding="utf-8") as h:
                h.write(card_html(url, table))
            f.write(f"{name}\t{url}\n")
    print(f"{len(cards)} cards -> {BUILD}")


if __name__ == "__main__":
    main()
