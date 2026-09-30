#!/usr/bin/env node
/* =============================================================================
 * build.mjs — generates everything derived from products.json.
 *
 *   node build.mjs
 *
 * Emits:
 *   products.js                 window.PRODUCTS   (loaded synchronously by index.html)
 *   products/<slug>.html        one crawlable page per product, with JSON-LD
 *   images/products/*.svg       placeholder artwork for products with no photo yet
 *   sitemap.xml
 *
 * Also validates the catalog and fails loudly on data problems.
 * ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://hallroadlahore.com';
const today = new Date().toISOString().slice(0, 10);

const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'));
const products = raw.products;
const categories = raw.categories;

const warnings = [];
const errors = [];

/* ---------------------------------------------------------------- validation */
const seenSlugs = new Set();
const seenSkus = new Set();
for (const p of products) {
  if (!p.slug) errors.push(`product ${p.id}: missing slug`);
  if (seenSlugs.has(p.slug)) errors.push(`duplicate slug: ${p.slug}`);
  seenSlugs.add(p.slug);
  if (seenSkus.has(p.sku)) errors.push(`duplicate sku: ${p.sku}`);
  seenSkus.add(p.sku);
  if (!categories.some(c => c.id === p.category)) errors.push(`product ${p.id}: unknown category "${p.category}"`);
  if (!p.warranty) warnings.push(`${p.slug}: no warranty field -> falls back to shop default`);
  if (!(p.images || []).length) errors.push(`${p.slug}: no images`);
  if (p.stock === undefined) warnings.push(`${p.slug}: no stock field`);
  if (p.oldPrice && p.oldPrice <= p.price) warnings.push(`${p.slug}: oldPrice ${p.oldPrice} is not above price ${p.price}`);
  const maxDisc = Math.max(...p.variants.map(v => discount(p, v)));
  const minDisc = Math.min(...p.variants.map(v => discount(p, v)));
  if (maxDisc > 55) warnings.push(`${p.slug}: advertised discount up to ${maxDisc}% - make sure the "was" price is a price you really sold at`);
  if (maxDisc - minDisc > 12) warnings.push(`${p.slug}: discount varies ${minDisc}%-${maxDisc}% across variants - the grid shows the honest minimum (${minDisc}%)`);
}

function discount(p, v) {
  const now = p.price + (v?.extraCost || 0);
  const was = p.oldPrice ? p.oldPrice + (v?.extraCost || 0) : 0; // no 'was' price -> no discount
  if (!was) return 0;
  return Math.round(((was - now) / was) * 100);
}
/* The badge must show a discount the buyer can actually get at the base variant. */
function honestDiscount(p) {
  return Math.min(...p.variants.map(v => discount(p, v)));
}

/* ------------------------------------------------------------- placeholder art */
const ART = {
  Inverters: `
    <rect x="180" y="230" width="440" height="300" rx="22" fill="#1e293b"/>
    <rect x="215" y="265" width="200" height="120" rx="10" fill="#0f172a"/>
    <text x="315" y="345" font-size="52" font-weight="800" fill="#25d366" text-anchor="middle" font-family="monospace">220V</text>
    <rect x="450" y="265" width="140" height="16" rx="8" fill="#334155"/>
    <rect x="450" y="297" width="140" height="16" rx="8" fill="#334155"/>
    <rect x="450" y="329" width="140" height="16" rx="8" fill="#334155"/>
    <circle cx="245" cy="450" r="26" fill="#ef4444"/><circle cx="330" cy="450" r="26" fill="#0f172a"/>
    <rect x="400" y="420" width="190" height="60" rx="10" fill="#0f172a"/>
    <text x="495" y="460" font-size="26" font-weight="800" fill="#94a3b8" text-anchor="middle" font-family="monospace">PURE SINE</text>`,
  Chargers: `
    <rect x="230" y="250" width="340" height="240" rx="20" fill="#1e293b"/>
    <rect x="270" y="290" width="260" height="90" rx="10" fill="#0f172a"/>
    <circle cx="330" cy="335" r="18" fill="#25d366"/><circle cx="400" cy="335" r="18" fill="#ffc107"/><circle cx="470" cy="335" r="18" fill="#334155"/>
    <path d="M400 490 C400 560 300 560 300 620" stroke="#0f172a" stroke-width="18" fill="none" stroke-linecap="round"/>
    <path d="M440 490 C440 570 540 570 540 620" stroke="#ef4444" stroke-width="18" fill="none" stroke-linecap="round"/>
    <rect x="262" y="612" width="76" height="34" rx="8" fill="#0f172a"/><rect x="502" y="612" width="76" height="34" rx="8" fill="#ef4444"/>`,
  Solar: `
    <g transform="rotate(-12 400 380)">
      <rect x="180" y="240" width="440" height="280" rx="10" fill="#1e3a8a"/>
      <g fill="#2563eb">
        <rect x="196" y="256" width="132" height="78" rx="4"/><rect x="336" y="256" width="132" height="78" rx="4"/><rect x="476" y="256" width="128" height="78" rx="4"/>
        <rect x="196" y="342" width="132" height="78" rx="4"/><rect x="336" y="342" width="132" height="78" rx="4"/><rect x="476" y="342" width="128" height="78" rx="4"/>
        <rect x="196" y="428" width="132" height="76" rx="4"/><rect x="336" y="428" width="132" height="76" rx="4"/><rect x="476" y="428" width="128" height="76" rx="4"/>
      </g>
      <rect x="168" y="520" width="464" height="26" rx="8" fill="#94a3b8"/>
      <rect x="240" y="508" width="54" height="52" rx="8" fill="#0f172a"/>
      <rect x="500" y="508" width="54" height="52" rx="8" fill="#0f172a"/>
    </g>`,
  Bundles: `
    <rect x="240" y="220" width="320" height="200" rx="16" fill="#1e293b"/>
    <rect x="270" y="250" width="260" height="40" rx="8" fill="#0f172a"/>
    <text x="400" y="275" font-size="18" font-weight="800" fill="#25d366" text-anchor="middle" font-family="monospace">BUNDLE SAVE</text>
    <rect x="270" y="300" width="120" height="90" rx="10" fill="#334155"/><rect x="410" y="300" width="120" height="90" rx="10" fill="#334155"/>
    <text x="330" y="345" font-size="12" font-weight="800" fill="#e2e8f0" text-anchor="middle">INVERTER</text>
    <text x="470" y="345" font-size="12" font-weight="800" fill="#e2e8f0" text-anchor="middle">CLIPS</text>
    <rect x="340" y="360" width="40" height="6" rx="3" fill="#25d366"/>`,
  WaterHeaters: `
    <rect x="330" y="200" width="140" height="120" rx="16" fill="#1e293b"/>
    <rect x="356" y="228" width="88" height="52" rx="8" fill="#0f172a"/>
    <text x="400" y="266" font-size="30" font-weight="800" fill="#ef4444" text-anchor="middle" font-family="monospace">60°C</text>
    <path d="M400 320 L400 400 Q400 440 440 440 L500 440 Q540 440 540 480 L540 520" stroke="#94a3b8" stroke-width="34" fill="none" stroke-linecap="round"/>
    <rect x="500" y="516" width="80" height="40" rx="12" fill="#64748b"/>
    <path d="M540 570 Q534 600 540 630" stroke="#00c6ff" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="400" cy="470" r="30" fill="#1e293b"/><rect x="378" y="462" width="44" height="16" rx="8" fill="#25d366"/>`
};

function placeholderSvg(p, index) {
  const name = p.title.en;
  const words = name.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 26) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  const text = lines.slice(0, 3).map((l, i) =>
    `<text x="400" y="${600 + i * 46}" font-size="34" font-weight="800" fill="#0f172a" text-anchor="middle" font-family="'Plus Jakarta Sans',system-ui,sans-serif">${escapeXml(l)}</text>`
  ).join('');
  const badge = p.images.length > 1 && index > 0
    ? `<text x="400" y="${600 + Math.min(lines.length,3) * 46 + 30}" font-size="24" font-weight="700" fill="#64748b" text-anchor="middle" font-family="'Plus Jakarta Sans',system-ui,sans-serif">View ${index + 1}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${escapeXml(name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <g opacity="0.05" stroke="#0f172a" stroke-width="1">
    ${Array.from({length: 15}, (_, i) => `<line x1="${i*56}" y1="0" x2="${i*56}" y2="800"/><line x1="0" y1="${i*56}" x2="800" y2="${i*56}"/>`).join('')}
  </g>
  ${ART[p.category] || ART.Inverters}
  <text x="400" y="130" font-size="26" font-weight="800" fill="#25d366" text-anchor="middle" letter-spacing="4" font-family="'Plus Jakarta Sans',system-ui,sans-serif">${escapeXml(p.brand.toUpperCase())}</text>
  ${text}
  ${badge}
  <text x="400" y="760" font-size="20" font-weight="700" fill="#94a3b8" text-anchor="middle" font-family="'Plus Jakarta Sans',system-ui,sans-serif">${escapeXml(p.sku)}</text>
</svg>`;
}

const toSrc = (x) => /^https?:/i.test(x) ? x : '/' + String(x).replace(/^\/+/, '');
const toAbsUrl = (x) => /^https?:/i.test(x) ? x : SITE + '/' + String(x).replace(/^\/+/, '');

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c]));
}
function escapeHtml(s) { return escapeXml(s); }

/* ------------------------------------------------------------ emit products.js */
fs.mkdirSync(path.join(ROOT, 'images', 'products'), { recursive: true });

let placeholderCount = 0;
for (const p of products) {
  p.images.forEach((img, i) => {
    if (/^https?:/i.test(img)) return;   // remote photo - nothing to generate
    const abs = path.join(ROOT, img);
    // Only generate artwork when the real photo is not there yet.
    if (!fs.existsSync(abs)) {
      fs.writeFileSync(abs, placeholderSvg(p, i));
      placeholderCount++;
    }
  });
}

fs.writeFileSync(
  path.join(ROOT, 'products.js'),
  '/* GENERATED by build.mjs from products.json — do not edit by hand. */\n' +
  'window.PRODUCTS = ' + JSON.stringify(products, null, 2) + ';\n' +
  'window.CATEGORIES = ' + JSON.stringify(categories, null, 2) + ';\n'
);

/* --------------------------------------------------------- shared page shell */
const PAGE_CSS = '<link rel="stylesheet" href="/styles.css">';
const FONT = ''; /* brand font is self-hosted in styles.css */

function head({ title, description, canonical, image, jsonLd, lang = 'en' }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hall Road Lahore">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_PK">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<meta name="theme-color" content="#0f172a">
<link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
${FONT}
${PAGE_CSS}
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head>`;
}

function siteHeader(active) {
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="header-content">
    <div class="header-top-row">
      <button class="menu-btn-head" type="button" data-action="open-sidebar" aria-label="Open menu and store information" aria-controls="infoSidebar" aria-expanded="false">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>
      </button>
      <a class="brand-link" href="/" aria-label="Hall Road Lahore - home">
        <img src="/images/logo.svg" alt="Hall Road Lahore" width="195" height="36" class="brand-logo-img">
      </a>
      <div class="header-actions">
        <button class="lang-toggle" id="langToggle" type="button" aria-label="Switch language">اردو</button>
        <button class="cart-btn-head" type="button" data-action="open-cart" aria-label="Open cart">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          <span data-i18n="cart">Cart</span> <span class="cart-count" id="cartBadge" aria-live="polite">0</span>
        </button>
      </div>
    </div>
  </div>
</header>`;
}

const FOOTER = `<footer class="site-footer">
  <div class="footer-grid">
    <div>
      <div class="footer-brand">Hall Road Lahore</div>
      <p>Hall Road, Lahore, Punjab, Pakistan.</p>
    </div>
    <div>
      <h3>Shop</h3>
      <ul>
        <li><a href="/">All products</a></li>
        <li><a href="/#Inverters">Inverters</a></li>
        <li><a href="/#Chargers">Battery chargers</a></li>
        <li><a href="/#Solar">Solar &amp; MPPT</a></li>
        <li><a href="/#WaterHeaters">Water heaters</a></li>
        <li><a href="/tools/solar-calculator.html">Solar calculator</a></li>
      </ul>
    </div>
    <div>
      <h3>Help</h3>
      <ul>
        <li><a href="/track.html">Track your order</a></li>
        <li><a href="/blog/">Buying guides</a></li>
        <li><a href="/shipping.html">Shipping &amp; delivery</a></li>
        <li><a href="/returns.html">Returns &amp; warranty</a></li>
        <li><a href="/privacy.html">Privacy policy</a></li>
        <li><a href="/terms.html">Terms of sale</a></li>
      </ul>
    </div>
    <div>
      <h3>Contact</h3>
      <ul>
        <li><a href="tel:03396202062">0339 6202062</a></li>
        <li><a href="mailto:gpower.pk1@gmail.com">gpower.pk1@gmail.com</a></li>
        <li><a href="https://www.tiktok.com/@gpower.pk" rel="noopener" target="_blank">TikTok @gpower.pk</a></li>
        <li>Mon-Sat, 9:00am to 5:00pm</li>
      </ul>
    </div>
  </div>
  <p class="footer-legal">&copy; ${new Date().getFullYear()} hallroadlahore.com. Prices in PKR and subject to change. Warranty terms are listed on each product page.</p>
</footer>
<script src="/site.config.js"></script>
<script src="/products.js"></script>
<script src="/app.js" defer></script>`;

/* --------------------------------------------------------- product pages */
fs.rmSync(path.join(ROOT, 'products'), { recursive: true, force: true });
fs.mkdirSync(path.join(ROOT, 'products'), { recursive: true });

for (const p of products) {
  const url = `${SITE}/products/${p.slug}.html`;
  const ogImg = toAbsUrl(p.images[0]);
  const offers = p.variants.map(v => ({
    '@type': 'Offer',
    name: v.name,
    priceCurrency: 'PKR',
    price: p.price + v.extraCost,
    availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    seller: { '@type': 'Organization', name: 'Hall Road Lahore' }
  }));
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: p.title.en,
        sku: p.sku,
        brand: { '@type': 'Brand', name: p.brand },
        image: p.images.map(i => toAbsUrl(i)),
        description: p.summary.en,
        category: p.category,
        offers: offers.length === 1 ? offers[0] : { '@type': 'AggregateOffer', lowPrice: Math.min(...offers.map(o => o.price)), highPrice: Math.max(...offers.map(o => o.price)), priceCurrency: 'PKR', offerCount: offers.length, offers },
        additionalProperty: Object.entries(p.specs || {}).map(([k, v]) => ({ '@type': 'PropertyValue', name: k, value: String(v) }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: p.title.en, item: url }
        ]
      }
    ]
  });

  const html = `${head({
    title: `${p.title.en} - Price in Pakistan | Hall Road Lahore`,
    description: `${p.summary.en} Price Rs. ${p.price.toLocaleString('en-PK')} with Cash on Delivery. ${p.warranty}`,
    canonical: url, image: ogImg, jsonLd
  })}
<body class="page-product">
${siteHeader('shop')}
<main id="main" class="pdp-page" data-product-id="${p.id}">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/#${p.category}">${escapeHtml((categories.find(c => c.id === p.category) || {}).en || p.category)}</a></li>
      <li aria-current="page">${escapeHtml(p.title.en)}</li>
    </ol>
  </nav>

  <div class="pdp-page-grid">
    <div class="pdp-page-media">
      <img id="pdpMainImg" class="pdp-main-img" src="${toSrc(p.images[0])}" alt="${escapeHtml(p.title.en)}" width="800" height="800" fetchpriority="high">
      ${p.images.length > 1 ? `<div class="pdp-thumbs" role="group" aria-label="Product images">
        ${p.images.map((img, i) => `<button type="button" class="pdp-thumb${i === 0 ? ' active' : ''}" data-image-index="${i}" aria-label="Show image ${i + 1}"><img src="${toSrc(img)}" alt="" width="80" height="80" loading="lazy"></button>`).join('\n        ')}
      </div>` : ''}
    </div>

    <div class="pdp-page-info">
      <p class="pdp-brand">${escapeHtml(p.brand)} &middot; SKU ${escapeHtml(p.sku)}</p>
      <h1 class="pdp-title">${escapeHtml(p.title.en)}</h1>
      <p class="pdp-summary">${escapeHtml(p.summary.en)}</p>

      <div class="pdp-price-row">
        <span class="pdp-price-current" id="pdpPriceCurrent">Rs. ${p.price.toLocaleString('en-PK')}</span>
        ${p.oldPrice ? `<span class="pdp-price-old">Rs. ${p.oldPrice.toLocaleString('en-PK')}</span>` : ''}
        ${honestDiscount(p) > 0 ? `<span class="pdp-save">Save ${honestDiscount(p)}%</span>` : ''}
      </div>

      <div class="stock-line" data-stock="${p.stock}">
        ${p.stock > 0 ? `<span class="stock-dot in"></span> In stock - ${p.stock} available, dispatched within 24 hours`
                      : `<span class="stock-dot out"></span> Out of stock - message us on WhatsApp for availability`}
      </div>

      <div class="pdp-buybox">
        <fieldset class="variant-set">
          <legend>Select option</legend>
          <div class="variant-pills" id="variantPills" role="radiogroup" aria-label="Product options">
            ${p.variants.map((v, i) => `<button type="button" role="radio" aria-checked="${i === 0}" class="variant-pill${i === 0 ? ' selected' : ''}" data-variant-index="${i}">${escapeHtml(v.name)}${v.extraCost ? ` <span class="variant-up">+Rs. ${v.extraCost.toLocaleString('en-PK')}</span>` : ''}</button>`).join('\n            ')}
          </div>
        </fieldset>

        <div class="pdp-qty-row">
          <span class="pdp-section-label" id="qtyLabel">Quantity</span>
          <div class="qty-stepper" role="group" aria-labelledby="qtyLabel">
            <button type="button" class="qty-btn" data-action="qty-dec" aria-label="Decrease quantity">&minus;</button>
            <span class="qty-display" id="qtyDisplay" aria-live="polite">1</span>
            <button type="button" class="qty-btn" data-action="qty-inc" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button type="button" class="checkout-btn add-to-cart-btn" data-action="add-from-page">Add to Cart</button>
        <a class="whatsapp-order-link" href="#" data-action="buy-now" rel="nofollow">Order directly on WhatsApp</a>
        <p class="buybox-note">Cash on Delivery available nationwide. Pay cash when the parcel reaches you.</p>
      </div>

      <dl class="spec-table">
        ${Object.entries(p.specs || {}).map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('\n        ')}
      </dl>
    </div>
  </div>

  <section class="pdp-page-details">
    <h2>Key features</h2>
    <ul class="feature-list">
      ${p.features.en.map(f => `<li>${escapeHtml(f)}</li>`).join('\n      ')}
    </ul>

    <div class="detail-cards">
      <div class="detail-card">
        <h3>Warranty</h3>
        <p>${escapeHtml(p.warranty)}</p>
        <p><a href="/returns.html">Full returns &amp; warranty policy</a></p>
      </div>
      <div class="detail-card">
        <h3>Delivery</h3>
        <p>Dispatched within 24 hours (Mon-Sat). 2-5 working days nationwide.</p>
        <p><a href="/shipping.html">Shipping details</a></p>
      </div>
      <div class="detail-card">
        <h3>Payment</h3>
        <p>Cash on Delivery, or JazzCash / EasyPaisa advance.</p>
        <p><a href="/terms.html">Terms of sale</a></p>
      </div>
    </div>
  </section>

  <section class="related-section">
    <h2>You may also like</h2>
    <div class="related-grid">
      ${products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4).map(r => `
      <a class="related-card" href="/products/${r.slug}.html">
        <img src="${toSrc(r.images[0])}" alt="${escapeHtml(r.title.en)}" width="200" height="200" loading="lazy">
        <div class="related-title">${escapeHtml(r.title.en)}</div>
        <div class="related-price">Rs. ${r.price.toLocaleString('en-PK')}</div>
      </a>`).join('\n      ')}
    </div>
  </section>
</main>
${FOOTER}
</body>
</html>`;
  fs.writeFileSync(path.join(ROOT, 'products', `${p.slug}.html`), html);
}

/* --------------------------------------------------------------- sitemap.xml */
const urls = [
  { loc: `${SITE}/`, pri: '1.0' },
  ...products.map(p => ({ loc: `${SITE}/products/${p.slug}.html`, pri: '0.8' })),
  { loc: `${SITE}/track.html`, pri: '0.7' },
  { loc: `${SITE}/tools/solar-calculator.html`, pri: '0.7' },
  { loc: `${SITE}/blog/`, pri: '0.6' },
  { loc: `${SITE}/blog/how-to-choose-a-solar-inverter-in-pakistan.html`, pri: '0.6' },
  { loc: `${SITE}/blog/pure-sine-wave-vs-modified-sine-wave.html`, pri: '0.6' },
  { loc: `${SITE}/about.html`, pri: '0.5' },
  { loc: `${SITE}/shipping.html`, pri: '0.5' },
  { loc: `${SITE}/returns.html`, pri: '0.5' },
  { loc: `${SITE}/#faq`, pri: '0.4' },
  { loc: `${SITE}/privacy.html`, pri: '0.3' },
  { loc: `${SITE}/terms.html`, pri: '0.3' }
];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`);

/* ------------------------------------------------- homepage ItemList JSON-LD */
/* The homepage embeds an ItemList of product URLs. Regenerate it from the
   catalog so it never goes stale as products are added or removed. */
const indexPath = path.join(ROOT, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  '@id': `${SITE}/#catalog`,
  name: 'Featured catalog',
  numberOfItems: products.length,
  itemListElement: products.map((p, i) => ({
    '@type': 'ListItem', position: i + 1, name: p.title.en,
    url: `${SITE}/products/${p.slug}.html`
  }))
};
indexHtml = indexHtml.replace(
  /(<script type="application\/ld\+json" id="catalog-jsonld">)[\s\S]*?(<\/script>)/,
  (m, a, b) => a + '\n' + JSON.stringify(itemList, null, 2) + '\n' + b
);
fs.writeFileSync(indexPath, indexHtml);

/* ------------------------------------------------------- prune orphaned art */
/* Remove generated placeholder artwork (.svg) that no product references any
   more, so the repo does not accumulate dead files when products are trimmed.
   Real photos are NEVER auto-deleted: an unreferenced photo is only reported,
   so removing a product from products.json cannot silently destroy an image. */
const referenced = new Set();
products.forEach(p => (p.images || []).forEach(i => referenced.add(path.join(ROOT, i))));
const artDir = path.join(ROOT, 'images', 'products');
const orphanedPhotos = [];
for (const f of fs.readdirSync(artDir)) {
  const abs = path.join(artDir, f);
  if (referenced.has(abs)) continue;
  if (f.toLowerCase().endsWith('.svg')) fs.rmSync(abs);  // generated placeholder art
  else orphanedPhotos.push(f);                           // real photo - keep it
}
if (orphanedPhotos.length) {
  console.log(`\nNote: ${orphanedPhotos.length} unreferenced photo(s) kept in images/products/:`);
  orphanedPhotos.forEach(f => console.log('   - ' + f));
  console.log('  (not used by any product - delete by hand if you are sure)');
}

/* ------------------------------------------------------------------- report */
console.log(`\nBuilt ${products.length} product pages, sitemap.xml, products.js, ${placeholderCount} placeholder image(s).\n`);
if (warnings.length) { console.log('WARNINGS:'); warnings.forEach(w => console.log('  ! ' + w)); console.log(); }
if (errors.length) { console.error('ERRORS:'); errors.forEach(e => console.error('  x ' + e)); process.exit(1); }
console.log('Catalog data OK.\n');
