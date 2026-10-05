# Table cards (QR + NFC)

These are printable table cards in the restaurant's fire colours, with the logo, a QR code and a "tap your phone" NFC area. The restaurant has **7 tables**:

- **Tables 1–5 (small stands):** a 7 × 13 cm card.
- **Tables 6–7 (large stands):** a 17 × 17 cm sheet with the same 7 × 13 cm design in the centre and the fire background filling the whole sheet. Cut it down to the stand's size.

| File | What |
|---|---|
| `print/alneran-cards-all.pdf` | Everything, one per page: page 1 general card (7×13), page 2 general sheet (17×17), pages 3–7 tables 1–5 (7×13), pages 8–9 tables 6–7 (17×17) |
| `print/pdf/table-06-17x17.pdf`, `table-07-17x17.pdf` | The two large-stand sheets on their own |
| `print/png/general-17x17.png`, `print/pdf/general-17x17.pdf` | A 17 × 17 cm general sheet (no table number) |
| `print/pdf/general.pdf`, `print/png/general.png` | The general card, which links to the menu with no table number |

- **Size:** the 7 × 13 cm pages are 76 × 136 mm. That is the 70 × 130 mm card plus 3 mm bleed on every side, so tell the printer *"trim to 70 × 130 mm, 3 mm bleed"*. All the text sits at least 4 mm inside the cut. The 17 × 17 cm pages are 176 × 176 mm, with the same 3 mm bleed.
- **QR codes:** the general card links to `https://alneran.mohalisal1.workers.dev/`. Table card N links to `…/?t=N`, so the menu shows the table number and puts it in the WhatsApp order.
- **NFC:** write the same link as the card's QR code onto each NFC sticker (for example with the free "NFC Tools" app → Write → URL), then stick it behind the "tap your phone" area.
- **Background:** the fire background (`background.jpg`) was generated with Higgsfield.

To rebuild the cards, for example with a different number of tables:

```
python3 cards/make_cards.py 7         # tables 1..7; BIG_TABLES in the script sets which get 17x17 (needs: pip install qrcode)
python3 -m http.server 8799 &         # from the repo root
node cards/render.js                  # writes cards/print/pdf and cards/print/png
```

Every QR code was scanned with two different QR decoders, at full size, reduced sizes, blurred and tilted, and checked against its link. `MASKS` in `make_cards.py` fixes the QR pattern for each link, chosen to scan most reliably over the fire background. If you add a new table, its code still works with the default pattern.
