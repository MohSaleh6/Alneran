# Alneran (النيران): menu extraction and site analysis

This is data pulled from the restaurant's online menu at
**https://menu.besmartjo.com/restaurant/alneran** (fetched 2026-09-27).

| File | What's in it |
|---|---|
| [`MENU.md`](MENU.md) | The full menu as readable tables (Arabic + English) |
| [`data/menu.json`](data/menu.json) | Structured data: restaurant info, categories, items, prices, extras, image URLs |
| [`data/images/`](data/images) | The cover image, logo and every item photo (74 files, about 3.5 MB) |
| [`data/translations_en.json`](data/translations_en.json) | English names for every category, item and extra, written for this extraction |
| [`scripts/extract_menu.py`](scripts/extract_menu.py) | Re-runs the whole extraction: `python3 scripts/extract_menu.py` (add `--no-images` to skip downloads) |

## Restaurant

- **Name:** alneran / النيران
- **Tagline:** جميع المقبلات و الوجبات الشامية ("All Levantine appetizers and meals")
- **Phone:** +962 79 606 6499
- **Address:** Amman, Jordan. No street address is given; the map link only searches "Amman -Jordan".
- **Hours:** the site only shows the next opening time ("Opens Monday 09:00"). It doesn't publish a weekly schedule.
- **Currency:** Jordanian dinar (JOD, د.ا), with prices to 3 decimals (fils)
- **Reviews:** none yet
- **Ordering:** a cart, checkout and "call the waiter" button with table selection (dine-in QR-menu style)

## Menu at a glance

There are **95 items in 10 categories**. 78 of them have a photo. The average price is about 3.79 JOD.

| Category | Items | Price range (JOD) |
|---|---:|---|
| شاورما الدجاج: Chicken Shawarma | 7 | 1.350 – 11.400 |
| شاورما لحمة: Beef Shawarma | 7 | 1.000 – 4.250 |
| سناكات: Snacks | 6 | 1.750 – 3.000 |
| عرض: Offers (grills & chicken) | 14 | 2.150 – 14.000 |
| المقبلات: Appetizers & Sides | 15 | 1.500 – 5.000 |
| معجنات: Pastries | 23 | 0.300 – 3.000 |
| الوجلات اليومية: Daily Meals | 13 | 2.750 – 40.000 |
| العروض الجمعات: Group Offers | 3 | 12.000 – 22.000 |
| الاضافات: Add-ons | 2 | 0.500 – 0.800 |
| مشروبات: Drinks | 5 | 0.500 – 1.500 |

- **Cheapest items:** the za'atar, za'atar & cheese and sujuk pastries, at 0.300 each.
- **Most expensive:** a whole turkey with nuts and salads (ديك رومي) at 40.000, then the Twenty Mixed Grill Meal at 22.000.
- **Items with choices:**
  - Beef shawarma samoon: large +0.600
  - Small beef wrap: large +0.500
  - Mashawi sandwich: shqaf / kebab / shish tawook
  - Manakish: za'atar / cheese / mixed cheeses / mortadella / egg
- **Day-specific dishes:** Mulukhiyah (Thursday). White beans and eggplant maqluba are marked for Friday.

## Things to know about the site's data

These are problems in the source data. The extraction keeps them exactly as the site has them.

1. **The site's English is mostly missing and partly wrong.** Only 6 items and 2 categories have English names on `?lang=en`, and the names are attached to the wrong items. For example, "وجبة شاورما عربي دجاج" is labelled "Super Chicken Shawarma Meal", and the beef samoon item is labelled "Double Chicken Shawarma Meal". The site's values are kept as `name_en_site`; `name_en` holds the corrected translations.
2. **Some descriptions were copied onto the wrong items.** The beef samoon shawarma (1547) and the Zinger sandwich (1556) both say "made from tender chicken, tangy sauce, cheese and vegetables".
3. **The ayran prices look swapped.** 100 ml costs 1.500 but 300 ml costs 0.650.
4. **The mashawi sandwich (1625) choices cost as much as the sandwich.** They are set up as paid add-ons (2.130–2.150) rather than as variants. That may double the price at checkout.
5. **Many descriptions are just "."** Those are stored as empty strings.
6. There is a small typo in a category name: "الوجلات اليومية" should be "الوجبات اليومية" (Daily Meals).

## How the site is built (technical notes)

- It is a **multi-restaurant SaaS menu platform** ("BE SMART MENU"). It looks like a white-labelled **Laravel QR-menu/ordering script** on the Creative Tim **Argon Design System** (Bootstrap 4), with Vue for the cart and a PWA manifest and service worker.
- The menu is rendered on the server. Each item's full data is embedded as JavaScript: `items[ID] = {name, price, priceNotFormated, image, description, extras, options, variants, has_variants, qty}`. The extractor reads this, because the visible cards cut descriptions short.
- Categories are `<div id="N"><h1>…</h1></div>` blocks followed by item cards that call `setCurrentItem(ID)`.
- Images are served from `/uploads/restorants/<uuid>_large.jpg`. The cover is `…_cover.jpg`.
- You can switch language with `?lang=ar` or `?lang=en`.
