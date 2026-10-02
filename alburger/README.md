# ĀL BURGER: one-page restaurant site

A one-page site for **ĀL BURGER** (Airport Road, Amman), with an Arabic/English toggle and right-to-left layout for Arabic. It is a static site in [`site/`](site), deployed to **Cloudflare Workers** (static assets only) at `alburger.mohalisal1.workers.dev`.

## What's on the page

- **Hero:** "Made right. / Tastes right." The hero pins while you scroll. The burger photo splits into floating layers, the headline swaps, and the layers stack back together.
- **Signature meals:** this section pins too. Scrolling crossfades and zooms through the six burger photos, and the name, description and price change with each one. The dots jump straight to a burger.
- **Full menu:** every item and price, with tabs and meal sizes.
- **Also on the page:**
  - the services band
  - opening hours
  - the Talabat, Instagram, call and directions links
  - #دايماً_زابط
- **Motion:** smooth scrolling uses [Lenis](https://github.com/darkroomengineering/lenis), and the scroll scenes use [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/). Both are self-hosted in `site/js/`.
- **Reduced motion:** if the phone or computer asks for reduced motion, there is no smooth scrolling, pinning or animation. The signature meals show as a normal list of cards. Turning the setting on mid-visit undoes the motion straight away.
- **Performance:**
  - WebP images with `srcset` (400–1280 px), with lazy loading below the hero.
  - Self-hosted fonts.
  - No third-party requests.
  - Images are cached for a year, with a content hash in each URL.
  - Lighthouse mobile in local testing: performance 94, accessibility 100, best practices 100, SEO 100. That run used `wrangler dev`, which doesn't compress files; Cloudflare's edge does.

## Photos

Put the photos in [`images/`](images), named:

| File | Used for |
| --- | --- |
| `hero.jpg` | the hero burger that splits into layers |
| `beefy.jpg`, `crunchy.jpg`, `hotbeef.jpg`, `dijon.jpg`, `smokey.jpg`, `looong.jpg` | the six signature meals |

`.png` and `.webp` work too. Side-on shots of the whole burger work best. Then run:

```sh
pip install pillow "rembg[cpu]"
python3 scripts/build_images.py
```

The script:

1. removes each photo's background, so the burger sits on the green. It skips photos that are already transparent.
2. trims the photo and centres it on a square.
3. writes `site/img/<name>-{400,640,960,1280}.webp`.
4. updates the image links in `site/index.html`.

Any burger that doesn't have a photo yet uses a stand-in image instead. The stand-ins are the original illustrations, rendered by `scripts/make_placeholders.mjs` into `images/_placeholder/`, and the script lists which burgers still use one.

**Hero layer lines.** The hero photo is cut into horizontal bands where the ingredients meet. Set the lines in `images/hero.cuts.json` as fractions of the burger's height, from the top of the bun (0) to the bottom (1). For example, `[0.32, 0.47, 0.60, 0.74, 0.86]` makes six layers. Run the script again after changing them.

## Run and deploy

```sh
npm install
npx wrangler dev        # http://localhost:8787
npx wrangler deploy     # needs CLOUDFLARE_API_TOKEN (Workers edit) and CLOUDFLARE_ACCOUNT_ID
```

`wrangler.jsonc` names the Worker `alburger`, so it deploys to `alburger.<your-subdomain>.workers.dev`. `site/_headers` sets the cache and security headers. If you change the small inline script in the `<head>` of `index.html`, update its `sha256` hash in the Content-Security-Policy.
