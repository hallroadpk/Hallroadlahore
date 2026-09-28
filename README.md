# hallroadlahore.com

Static storefront for **Hall Road Lahore** — solar inverters, battery chargers and solar accessories, deployed on GitHub Pages.

There is **no runtime dependency and no build server**. Everything a visitor needs is plain HTML/CSS/JS served from this repo.

---

## Everyday task: change a price or add a product

1. Open `products.json`.
2. Edit the `price` / `oldPrice` / `stock` of a product, or copy an existing product object and change it.
3. Run:
   ```bash
   npm run build
   ```
   This regenerates `products.js`, the per-product pages in `products/`, `sitemap.xml`, and placeholder artwork for any product that has no photo yet.
4. Commit and push. GitHub Pages picks it up automatically.

> If you forget step 3, the GitHub Action (`build-and-test`) will fail the build and tell you to run it.

### Product fields (products.json)

| Field | Meaning |
|---|---|
| `id`, `slug`, `sku` | unique identifiers; `slug` is the URL, `sku` shows on the page |
| `brand`, `category`, `stock` | for display and filtering |
| `warranty` | **the exact warranty you will honour** — shown on the product page |
| `price`, `oldPrice` | current and "was" price in PKR. Keep `oldPrice` a price you really sold at. |
| `title/summary/features` | `{ "en": …, "ur": … }` bilingual text |
| `specs` | key/value table on the product page |
| `images` | paths under `images/`. Put real photos here. |
| `variants` | options with `extraCost` added to the base price |

### Adding real product photos

Put your compressed photos in `images/products/` (e.g. `my-inverter-1.webp`), then point the product's `images` array at them in `products.json` and `npm run build`. The build only generates a placeholder when the file does **not** exist, so your photo wins. Compress first (e.g. squoosh.app → WebP, ~800px wide).

---

## Business settings (site.config.js)

Everything the shop needs to know lives in `site.config.js`, and every place you must make a real decision is marked `TODO: CONFIRM`:

- `contact.whatsapp` / `phoneDisplay` — where orders and enquiries go
- `payment.advanceAccount` — the JazzCash/EasyPaisa account (shown only after an order is confirmed, never publicly)
- `shipping.freeShipping` / `rates` — the old site said "Free Shipping Nationwide". Decide if that is true.
- `policy.*` — warranty default, return window, who pays return shipping
- `orderEndpoint` — paste your Cloudflare Worker URL (see below) so orders are also logged server-side
- `analytics.*` — paste GA4 / Meta / TikTok IDs to switch tracking on (off by default)

---

## Never losing an order

Orders travel through three channels, in this order:

1. **WhatsApp** — the checkout builds a pre-filled message with an order ID and opens `wa.me`.
2. **Browser log** — every order is saved in the visitor's `localStorage`, so even a blocked popup shows a "copy your order" fallback instead of silently dying.
3. **Server log (optional, free)** — set `orderEndpoint` to the Worker in `functions/order-log-worker.js` and every order is also POSTed and stored in Cloudflare KV. Deploy steps are at the top of that file.

---

## What changed in the September 2026 rebuild

A full audit found 16 concrete defects (broken product images, lost orders, no SEO, no accessibility, stale cart prices, unvalidated phone, inflated discount badges, missing favicon/og-image/robots/sitemap, dead `styles.css`, …). All are fixed. The changes:

- **Catalog** moved out of the HTML into `products.json`; product data is inserted with `textContent` (no injection risk), images have `width/height` + `loading="lazy"`, and a local SVG fallback replaces the dead placeholder service.
- **Cart** stores `{id, variant, qty}` and recomputes prices from the catalog on every load — a price change can never leave a customer at an old price.
- **Checkout** validates the phone, only clears the cart after a successful handoff, logs every order, and shows an order-confirmation screen with an order ID and an advance-payment step.
- **SEO**: `robots.txt`, `sitemap.xml`, canonical + `og:*`/`twitter:*` tags, `favicon`, an `og-cover.png`, JSON-LD (`Store`, `WebSite`, `ItemList`, and `Product` per page), and one crawlable URL per product.
- **Accessibility**: pinch-zoom re-enabled, skip link, real `<button>` product cards, `role="dialog"`/`aria-modal`, focus trap + restore, Escape closes overlays, visible focus ring, `prefers-reduced-motion` support.
- **New pages**: About, Shipping, Returns & Warranty, Privacy, Terms, a branded 404, and a solar/inverter sizing calculator that ends in a WhatsApp enquiry.
- **English/Urdu toggle** with RTL support.
- `styles.css` is now the real stylesheet (it was a dead file before).

## Scripts

```bash
npm run build   # regenerate products.js, product pages, sitemap, placeholder art
npm test        # end-to-end tests of the built site (needs jsdom)
npm run dev     # local preview on http://localhost:8080
npm run check   # build + test
```

## Testing

`tests/store.test.mjs` loads the real built files into jsdom and drives the real cart/checkout/search code — the same checks that failed in the original audit must now pass.

## Deploying

This repo is wired to **GitHub Pages (deploy from branch: main)** with a `CNAME` of `hallroadlahore.com`. Pushing to `main` publishes the site. If you later migrate to Cloudflare Pages, the same files work unchanged and you additionally get custom headers and analytics.
