#!/usr/bin/env python3
"""Build site/menu.json and site/img/*.webp from the extracted data.

data/menu.json (from extract_menu.py) is the raw source. This script applies the
curated content below: fixed/added Arabic + English descriptions, clearer category
names, merged size variants and proper choice options. After the first build,
site/menu.json can also be edited directly.

Usage: python3 scripts/build_site.py   (needs Pillow for the WebP images)
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "menu.json")
IMG_SRC = os.path.join(ROOT, "data", "images")
OUT = os.path.join(ROOT, "site")

RESTAURANT = {
    "name_ar": "مطعم النيران",
    "name_en": "Alneran Restaurant",
    "tagline_ar": "أشهى الوجبات والمقبلات الشامية بجميع أشكالها",
    "tagline_en": "The finest Levantine meals & mezze, in every form",
    "phone": "+962796066499",
    "whatsapp": "962796066499",
    "address_ar": "أول شارع وصفي التل، مقابل كباب النايا — عمّان",
    "address_en": "Start of Wasfi At-Tall St., opposite Kebab Al-Naya — Amman",
    "maps_url": "https://maps.app.goo.gl/n7hkCoT417FGWTZ1A",
    "lat": 31.98354,
    "lng": 35.89203,
    "plus_code": "XVMR+CH Amman",
    # Google Maps: 08:00–02:00 every day. Times are Asia/Amman.
    "hours": {"open": "08:00", "close": "02:00"},
    "rating": 4.0,
    "reviews": 511,
    "price_range": "1–20",
    "timezone": "Asia/Amman",
}

# index -> (key, Arabic, English)
CATEGORIES = {
    0: ("chicken-shawarma", "شاورما الدجاج", "Chicken Shawarma"),
    1: ("beef-shawarma", "شاورما اللحمة", "Beef Shawarma"),
    2: ("snacks", "سناكات", "Snacks"),
    3: ("grills", "المشاوي والدجاج", "Grills & Chicken"),
    4: ("mezze", "المقبلات", "Mezze & Sides"),
    5: ("pastries", "المعجنات", "Pastries"),
    6: ("daily", "الوجبات اليومية", "Daily Dishes"),
    7: ("family", "عروض العائلة", "Family Offers"),
    8: ("addons", "الإضافات", "Add-ons"),
    9: ("drinks", "المشروبات", "Drinks"),
}

# id -> (description_ar, description_en). Empty strings keep the item without a description.
DESC = {
    1543: ("ساندويش شاورما مقطّع مع مثومة، كولسلو، خضار وبطاطا مقلية", "Sliced shawarma sandwich with garlic sauce, coleslaw, vegetables and fries"),
    1544: ("2 ساندويش شاورما مقطّع مع مثومة، كولسلو، خضار وبطاطا مقلية", "2 sliced shawarma sandwiches with garlic sauce, coleslaw, vegetables and fries"),
    1545: ("شاورما دجاج مع خضار، مثومة، بطاطا مقلية وخبز شراك", "Chicken shawarma with vegetables, garlic sauce, fries and shrak bread"),
    1546: ("1.5 ساندويش شاورما دجاج مع مثومة، كولسلو، خضار وبطاطا مقلية", "1.5 chicken shawarma sandwiches with garlic sauce, coleslaw, vegetables and fries"),
    1613: ("شاورما دجاج بخبز الصمون العراقي", "Chicken shawarma in Iraqi samoon bread"),
    1673: ("كيلو شاورما دجاج", "A full kilo of chicken shawarma"),
    1959: ("8 ساندويشات + بطاطا + مخلل + مثومة", "8 sandwiches + fries + pickles + garlic sauce"),
    1547: ("شاورما لحمة بخبز الصمون العراقي", "Beef shawarma in Iraqi samoon bread"),
    1548: ("خبز عادي مع شاورما لحمة وبصل وطحينية", "Beef shawarma in regular bread with onion and tahini"),
    1550: ("ساندويش شاورما لحمة مقطّع مع طحينية، كولسلو، خضار وبطاطا مقلية", "Sliced beef shawarma sandwich with tahini, coleslaw, vegetables and fries"),
    1551: ("1.5 ساندويش شاورما لحمة مع طحينية، كولسلو، خضار وبطاطا مقلية", "1.5 beef shawarma sandwiches with tahini, coleslaw, vegetables and fries"),
    1552: ("2 ساندويش شاورما لحمة مقطّع مع طحينية، كولسلو، خضار وبطاطا مقلية", "2 sliced beef shawarma sandwiches with tahini, coleslaw, vegetables and fries"),
    1553: ("شاورما لحمة مع خضار، طحينية، بطاطا مقلية وخبز شراك", "Beef shawarma with vegetables, tahini, fries and shrak bread"),
    1674: ("", ""),
    1556: ("دجاج زنجر مقرمش مع صلصة، جبنة وخضار", "Crispy zinger chicken with sauce, cheese and vegetables"),
    1557: ("فيليه دجاج مقلي مقرمش مع مايونيز وخبز محمّص", "Crispy fried chicken fillet with mayonnaise in toasted bread"),
    1558: ("برجر لحمة مع خضار مقرمشة وصلصة", "Beef burger with crisp vegetables and sauce"),
    1559: ("وجبة برجر لحمة", "Beef burger meal"),
    1560: ("اسكالوب دجاج بالبقسماط مع خضار طازجة وصلصة", "Breaded chicken escalope with fresh vegetables and sauce"),
    1561: ("اسكالوب دجاج مع مايونيز، خس وبندورة", "Chicken escalope with mayonnaise, lettuce and tomato"),
    1615: ("كفتة بالصينية — كيلو", "Kofta baked in a tray — 1 kg"),
    1617: ("دجاجة كاملة مع بطاطا، مثومة، مخلل وخبز", "Whole chicken with fries, garlic sauce, pickles and bread"),
    1618: ("دجاجة محشية بالأرز والفريكة", "Chicken stuffed with rice and freekeh"),
    1619: ("دجاجة على الفحم مع بطاطا، مثومة، مخلل وخبز", "Charcoal chicken with fries, garlic sauce, pickles and bread"),
    1620: ("نص دجاجة مع بطاطا، مثومة، مخلل وخبز", "Half chicken with fries, garlic sauce, pickles and bread"),
    1621: ("نص دجاجة على الفحم مع بطاطا، مثومة، مخلل وخبز", "Half charcoal chicken with fries, garlic sauce, pickles and bread"),
    1622: ("8 قطع", "8 pieces"),
    1623: ("4 قطع", "4 pieces"),
    1624: ("شرحات بالعجين", "Sliced meat baked in dough"),
    1625: ("اختر نوع المشاوي", "Choose your grill"),
    1968: ("ربع كيلو مشاوي", "250 g of grills"),
    1969: ("نص كيلو مشاوي", "500 g of grills"),
    1970: ("كيلو إلا ربع مشاوي", "750 g of grills"),
    1971: ("كيلو مشاوي مشكّلة", "1 kg of mixed grills"),
    1563: ("حمص بالطحينية وزيت الزيتون", "Chickpeas with tahini and olive oil"),
    1564: ("باذنجان مشوي بالطحينية", "Grilled eggplant with tahini"),
    1565: ("بقدونس، برغل، بندورة وليمون", "Parsley, bulgur, tomato and lemon"),
    1566: ("لبن مجفف، دقيق القمح، ماء وملح", "Dried yogurt, wheat flour, water and salt"),
    1567: ("فلفل أحمر محمّص مع الجوز", "Roasted red pepper with walnuts"),
    1568: ("باذنجان مشوي مع الخضار", "Grilled eggplant with vegetables"),
    1569: ("بندورة، خيار، بصل وبقدونس", "Tomato, cucumber, onion and parsley"),
    1570: ("خضار طازجة مع الخبز المحمّص والسماق", "Fresh vegetables with toasted bread and sumac"),
    1574: ("تشكيلة مقبلات — 1200 مل", "Assorted mezze — 1200 ml"),
    1575: ("تشكيلة مقبلات — 1800 مل", "Assorted mezze — 1800 ml"),
    1610: ("ورق عنب محشي", "Stuffed vine leaves"),
    1962: ("", ""),
    1963: ("", ""),
    1579: ("", ""),
    1580: ("", ""),
    1581: ("", ""),
    1582: ("", ""),
    1583: ("معجنات محشوة بالزعتر", "Pastry filled with za'atar"),
    1584: ("", ""),
    1585: ("معجنات محشوة بالجبنة الصفراء", "Pastry filled with yellow cheese"),
    1586: ("", ""),
    1587: ("", ""),
    1588: ("", ""),
    1589: ("معجنات بحشوة البيتزا", "Pastry with a pizza-style filling"),
    1590: ("", ""),
    1591: ("", ""),
    1592: ("", ""),
    1593: ("", ""),
    1594: ("", ""),
    1595: ("عجينة مغطاة بصلصة البندورة والجبنة", "Dough topped with tomato sauce and cheese"),
    1596: ("عجينة محشوة بالبطاطا المهروسة", "Pastry filled with mashed potato"),
    1626: ("", ""),
    1627: ("", ""),
    1628: ("", ""),
    1629: ("", ""),
    1630: ("اختر الحشوة", "Choose your topping"),
    1631: ("مع لبن بخيار", "Served with yogurt & cucumber"),
    1632: ("", ""),
    1633: ("5 حبات", "5 pieces"),
    1634: ("", ""),
    1635: ("", ""),
    1636: ("مع أرز بالشعيرية", "With vermicelli rice"),
    1637: ("", ""),
    1638: ("", ""),
    1639: ("", ""),
    1640: ("مع لبن بخيار", "Served with yogurt & cucumber"),
    1641: ("", ""),
    1729: ("مع المكسرات والسلطات", "With nuts and salads"),
    1964: ("", ""),
    1600: ("1 كيلو مشاوي مشكّل، بطاطا مقلية، خبز، بصل، بندورة، 5 عرايس، مخلل، خضار و4 مشروبات غازية", "1 kg mixed grill, fries, bread, onion, tomato, 5 arayes, pickles, vegetables and 4 soft drinks"),
    1601: ("دجاجة كاملة مشوية، صحن أرز وسط، علبتين خيار باللبن أو سلطة عربية، صحن مقبلات صغير و2 مشروب غازي", "Whole grilled chicken, medium rice, 2 yogurt-cucumber or Arabic salad, small mezze plate and 2 soft drinks"),
    1602: ("20 قطعة دجاج بروستد، 5 علب مثومة، 5 علب كولسلو، صحن مقبلات وسط، خبز، صحن بطاطا كبير و4 مشروبات غازية", "20 pieces broasted chicken, 5 garlic sauce, 5 coleslaw, medium mezze plate, bread, large fries and 4 soft drinks"),
    1966: ("", ""),
    1967: ("", ""),
    1605: ("عصير برتقال", "Orange soda"),
    1606: ("", "Lemon-lime soda"),
    1607: ("", "Cola"),
    1608: ("", ""),
    1609: ("", ""),
}

# Items served only on some days: id -> weekday (0 = Sunday ... 6 = Saturday)
SERVED_ON = {1636: 5, 1640: 5, 1641: 4}

# How many people a group offer serves.
SERVES = {1600: "4–6", 1601: "2–3", 1602: "5–7", 1959: "4+"}

# Popular dishes (Google Maps: "Visitors highlight the mansaf", "People say the meat shawarma is delicious").
POPULAR = {1634, 1550, 1971, 1543, 1622, 1600}

# Extras that are really a required choice (every option is a full price, not an add-on).
CHOICES = {
    1625: {"ar": "النوع", "en": "Type", "options": [("شقف", "Shqaf (meat cubes)", 2.15), ("كباب", "Kebab", 2.13), ("شيش طاووق / سيخين", "Shish tawook (2 skewers)", 2.15)]},
    1630: {"ar": "الحشوة", "en": "Topping", "options": [("زعتر", "Za'atar", 1.0), ("جبنة", "Cheese", 1.0), ("مكس أجبان", "Mixed cheeses", 1.0), ("مرتديلا", "Mortadella", 1.0), ("بيض", "Egg", 1.0)]},
}

# Size options added on top of the base price.
SIZES = {
    1547: [("عادي", "Regular", 0.0), ("كبير", "Large", 0.6)],
    1548: [("صغير", "Small", 0.0), ("كبير", "Large", 0.5)],
}

# Two separate items merged into one with size choices: kept id -> (merged ids, labels)
MERGE = {1960: {"ids": [1960, 1961], "labels": [("صغير", "Small"), ("كبير", "Large")]}}

NAME_FIX_AR = {1548: "شاورما لف لحمة", 1960: "بطاطا مقلية", 1586: "معجنات كشكوان ومرتديلا", 1609: "لبن عيران 1 لتر"}
NAME_FIX_EN = {1548: "Beef Shawarma Wrap", 1960: "French Fries", 1609: "Ayran Yogurt Drink (1 L)"}


def webp(src_name, item_id):
    """Convert one source JPG to WebP; return its site-relative path."""
    from PIL import Image

    os.makedirs(os.path.join(OUT, "img"), exist_ok=True)
    rel = f"img/{item_id}.webp"
    with Image.open(os.path.join(IMG_SRC, src_name)) as im:
        im = im.convert("RGB")
        if im.width > 800:
            im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, rel), "WEBP", quality=80, method=6)
    return rel


def main():
    src = json.load(open(SRC, encoding="utf-8"))
    tr = json.load(open(os.path.join(ROOT, "data", "translations_en.json"), encoding="utf-8"))
    raw = {i["id"]: i for c in src["categories"] for i in c["items"]}
    merged_away = {i for m in MERGE.values() for i in m["ids"][1:]}

    categories = []
    for idx, c in enumerate(src["categories"]):
        key, ar, en = CATEGORIES[idx]
        items = []
        for it in c["items"]:
            iid = it["id"]
            if iid in merged_away:
                continue
            d_ar, d_en = DESC.get(iid, (it["description_ar"], ""))
            item = {
                "id": iid,
                "ar": NAME_FIX_AR.get(iid) or " ".join(it["name_ar"].split()),
                "en": NAME_FIX_EN.get(iid) or tr["items"][str(iid)],
                "desc_ar": d_ar,
                "desc_en": d_en,
                "price": it["price"],
            }
            if it["image"]:
                item["img"] = webp(os.path.basename(it["image"]), iid)
            if iid in MERGE:
                m = MERGE[iid]
                item["choice"] = {"ar": "الحجم", "en": "Size", "options": [
                    {"ar": la, "en": le, "price": raw[i]["price"]} for i, (la, le) in zip(m["ids"], m["labels"])]}
            if iid in CHOICES:
                ch = CHOICES[iid]
                item["choice"] = {"ar": ch["ar"], "en": ch["en"], "options": [
                    {"ar": a, "en": e, "price": p} for a, e, p in ch["options"]]}
                item["price"] = min(p for _, _, p in ch["options"])
            if iid in SIZES:
                item["choice"] = {"ar": "الحجم", "en": "Size", "options": [
                    {"ar": a, "en": e, "price": round(it["price"] + p, 3)} for a, e, p in SIZES[iid]]}
            if iid in SERVED_ON:
                item["day"] = SERVED_ON[iid]
            if iid in SERVES:
                item["serves"] = SERVES[iid]
            if iid in POPULAR:
                item["popular"] = True
            items.append(item)
        categories.append({"key": key, "ar": ar, "en": en, "items": items})

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "menu.json"), "w", encoding="utf-8") as f:
        json.dump({"restaurant": RESTAURANT, "categories": categories}, f, ensure_ascii=False, separators=(",", ":"))
    n = sum(len(c["items"]) for c in categories)
    print(f"site/menu.json: {len(categories)} categories, {n} items")


if __name__ == "__main__":
    main()
