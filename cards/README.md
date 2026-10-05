# Table cards (QR + NFC)

These are printable 7 × 13 cm portrait cards for the table stands, in the restaurant's fire colours, with the logo, a QR code and a "tap your phone" NFC area.

| File | What |
|---|---|
| `print/alneran-cards-all.pdf` | All cards, one per page: page 1 is the general card, then tables 1–20 |
| `print/pdf/general.pdf`, `print/png/general.png` | The general card, which links to the menu with no table number |

- **Size:** each page is 76 × 136 mm. That is the 70 × 130 mm card plus 3 mm bleed on every side, so tell the printer *"trim to 70 × 130 mm, 3 mm bleed"*. All the text sits at least 4 mm inside the cut.
- **QR codes:** the general card links to `https://alneran.mohalisal1.workers.dev/`. Table card N links to `…/?t=N`, so the menu shows the table number and puts it in the WhatsApp order.
- **NFC:** write the same link as the card's QR code onto each NFC sticker (for example with the free "NFC Tools" app → Write → URL), then stick it behind the "tap your phone" area.
- **Background:** the fire background (`background.jpg`) was generated with Higgsfield.

To rebuild the cards, for example with a different number of tables:

```
python3 cards/make_cards.py 30        # 30 tables (needs: pip install qrcode)
python3 -m http.server 8799 &         # from the repo root
node cards/render.js                  # writes cards/print/pdf and cards/print/png
```

Every QR code was scanned and checked against its link after rendering.
