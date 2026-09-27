#!/usr/bin/env python3
"""Extract the Alneran menu from menu.besmartjo.com into data/menu.json and MENU.md.

Usage: python3 scripts/extract_menu.py [--no-images]
"""
import html
import json
import os
import re
import sys
import urllib.request

BASE = "https://menu.besmartjo.com"
URL = BASE + "/restaurant/alneran"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "Mozilla/5.0"}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def parse_items(page):
    """Items are embedded as `items[ID]={...json...};` script assignments."""
    dec, items = json.JSONDecoder(), {}
    for m in re.finditer(r"items\[(\d+)\]=", page):
        items[int(m.group(1))], _ = dec.raw_decode(page, m.end())
    return items


def parse_categories(page):
    """Categories are <h1> headers followed by strips calling setCurrentItem(ID)."""
    body = page[page.find('id="restaurant-content"'):]
    cats = []
    for m in re.finditer(r'<div id="[^"]*?(\d+)" class="[^"]*">\s*<h1>(.*?)</h1>', body):
        cats.append({"index": int(m.group(1)), "name": html.unescape(m.group(2)).strip(), "start": m.end()})
    for i, c in enumerate(cats):
        end = cats[i + 1]["start"] if i + 1 < len(cats) else len(body)
        ids = re.findall(r"setCurrentItem\((\d+)\)", body[c["start"]:end])
        c["item_ids"] = list(dict.fromkeys(int(x) for x in ids))
        del c["start"]
    return cats


def first(pattern, page, default=None):
    m = re.search(pattern, page, re.S)
    return html.unescape(m.group(1)).strip() if m else default


def clean_desc(d):
    d = (d or "").strip()
    return "" if d in (".", "") else d


def main():
    ar = fetch(URL + "?lang=ar").decode("utf-8")
    en = fetch(URL + "?lang=en").decode("utf-8")
    items_ar, items_en = parse_items(ar), parse_items(en)
    cats_ar, cats_en = parse_categories(ar), parse_categories(en)

    restaurant = {
        "name": first(r"<title>(.*?)</title>", ar),
        "slug": "alneran",
        "url": URL,
        "description_ar": first(r'<meta name="description" content="(.*?)"', ar),
        "description_en": first(r'<meta name="description" content="(.*?)"', en),
        "phone": first(r'href="tel:([^"]+)"', ar),
        "address": first(r'query=[^"]*"><span class="notranslate">(.*?)</span>', ar),
        "google_maps": first(r'href="(https://www.google.com/maps/[^"]+)"', ar),
        "hours_note_ar": first(r'<span class="closed_time">(.*?)</span>', ar),
        "hours_note_en": first(r'<span class="closed_time">(.*?)</span>', en),
        "currency": "JOD (د.ا)",
        "cover_image": BASE + first(r'class="bg-image"[^>]*src="([^"]+)"', ar, ""),
        "og_image": BASE + first(r'<meta property="og:image" itemprop="image" content="([^"]+)"', ar, ""),
        "platform": "BE SMART MENU (menu.besmartjo.com), Laravel + Argon Design System",
        "reviews": "No reviews yet",
    }

    categories = []
    en_names = {c["index"]: c["name"] for c in cats_en}
    with open(os.path.join(ROOT, "data", "translations_en.json"), encoding="utf-8") as f:
        tr = json.load(f)
    for c_ar in cats_ar:
        cat = {"name_ar": c_ar["name"], "name_en": tr["categories"].get(str(c_ar["index"])),
               "name_en_site": en_names.get(c_ar["index"]) or None, "items": []}
        for iid in c_ar["item_ids"]:
            a, e = items_ar[iid], items_en.get(iid, {})
            cat["items"].append({
                "id": iid,
                "name_ar": a["name"].strip(),
                "name_en": tr["items"].get(str(iid)),
                "name_en_site": (e.get("name") or "").strip() or None,
                "description_ar": clean_desc(a.get("description")),
                "description_en": clean_desc(e.get("description")),
                "price": a["priceNotFormated"],
                "price_formatted": a["price"],
                "image": BASE + a["image"] if a.get("image") and "default" not in a["image"] else None,
                "extras": [{"name_ar": x["name"], "name_en": tr["extras"].get(x["name"]), "price": x["price"]} for x in a.get("extras", [])],
                "options": a.get("options", []),
                "variants": a.get("variants", []),
            })
        categories.append(cat)

    data = {"restaurant": restaurant, "categories": categories}
    with open(os.path.join(ROOT, "data", "menu.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    if "--no-images" not in sys.argv:
        img_dir = os.path.join(ROOT, "data", "images")
        os.makedirs(img_dir, exist_ok=True)
        urls = [restaurant["cover_image"], restaurant["og_image"]]
        urls += [i["image"] for c in categories for i in c["items"] if i["image"]]
        for u in dict.fromkeys(u for u in urls if u.startswith("http")):
            path = os.path.join(img_dir, os.path.basename(u))
            if not os.path.exists(path):
                try:
                    with open(path, "wb") as f:
                        f.write(fetch(u))
                except Exception as ex:  # keep going if one image fails
                    print("image failed:", u, ex)

    write_markdown(data)
    n = sum(len(c["items"]) for c in categories)
    print(f"{len(categories)} categories, {n} items")


def write_markdown(data):
    r = data["restaurant"]
    out = [
        f"# {r['name']} — المنيو / Menu",
        "",
        f"> {r['description_ar']}",
        "",
        f"- **Source:** {r['url']}",
        f"- **Phone:** {r['phone']}",
        f"- **Address:** {r['address']} ([Google Maps]({r['google_maps']}))",
        f"- **Hours (as shown on the site):** {r['hours_note_ar']} / {r['hours_note_en']}",
        f"- **Currency:** {r['currency']}",
        f"- **Reviews:** {r['reviews']}",
        f"- **Platform:** {r['platform']}",
        "",
        "## Categories",
        "",
    ]
    for c in data["categories"]:
        label = c["name_ar"] + (f" ({c['name_en']})" if c["name_en"] else "")
        out.append(f"- {label}: {len(c['items'])} items")
    for c in data["categories"]:
        label = c["name_ar"] + (f" — {c['name_en']}" if c["name_en"] else "")
        out += ["", f"## {label}", "", "| # | الصنف | Item (EN) | الوصف | Price (JOD) | Extras |", "|---|---|---|---|---|---|"]
        for n, i in enumerate(c["items"], 1):
            extras = "<br>".join(f"{x['name_ar']} ({x['name_en']}) {x['price']:.3f}" for x in i["extras"])
            desc = i["description_ar"] or i["description_en"]
            cells = [str(n), i["name_ar"], i["name_en"] or "", desc, f"{i['price']:.3f}", extras]
            out.append("| " + " | ".join(x.replace("|", "/").replace("\n", " ") for x in cells) + " |")
    with open(os.path.join(ROOT, "MENU.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
