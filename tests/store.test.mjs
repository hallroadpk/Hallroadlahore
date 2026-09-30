/* =============================================================================
 * tests/store.test.mjs — end-to-end test of the BUILT static site.
 *
 * Loads the real index.html, then executes the real site.config.js, products.js
 * and app.js inside jsdom and drives the real functions. Expected values are
 * derived from products.json, so the suite stays green as the catalog changes.
 *
 *   npm test          (or: node tests/store.test.mjs)
 * ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const req = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'noop.js'));
let JSDOM;
try { ({ JSDOM } = req('jsdom')); }
catch { ({ JSDOM } = createRequire('/home/user/tools/x.js')('jsdom')); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const HTML = read('index.html');
const CATALOG = JSON.parse(read('products.json')).products;
const FIRST = CATALOG[0];
const PKR = new Intl.NumberFormat('en-PK');
const money = n => 'Rs. ' + PKR.format(Math.round(n));
function honestDiscount(p) {
  return Math.min(...p.variants.map(v => {
    const now = p.price + (v.extraCost || 0), was = p.oldPrice ? p.oldPrice + (v.extraCost || 0) : 0;
    return was > 0 ? Math.round(((was - now) / was) * 100) : 0;
  }));
}

const results = [];
const ok = (n, cond, d) => results.push({ n, pass: !!cond, d: d || '' });

function boot(html, seed) {
  const errs = [];
  const dom = new JSDOM(html, {
    runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://hallroadlahore.com/',
    beforeParse(w) {
      Object.defineProperty(w.HTMLElement.prototype, 'innerText', {
        get() { return this.textContent; }, set(v) { this.textContent = v; }, configurable: true
      });
      if (seed) w.localStorage.setItem('hallroad_cart_v2', seed);
    }
  });
  const w = dom.window;
  w.addEventListener('error', e => errs.push(e.message));
  for (const f of ['site.config.js', 'products.js', 'app.js']) {
    try { w.eval(read(f)); } catch (e) { errs.push(f + ': ' + e.message); }
  }
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { w, errs };
}

/* ---------------- 1. boot & catalog ---------------- */
let { w, errs } = boot(HTML);
const d = w.document;
const cards = d.querySelectorAll('#productGrid .product-card');
ok(`Catalog renders ${CATALOG.length} product card(s)`, cards.length === CATALOG.length, cards.length + ' cards');
ok('No runtime errors on load', errs.length === 0, errs.join(' | ') || 'clean');
ok('Product cards are real <button>s', cards.length > 0 && cards[0].tagName === 'BUTTON');

/* category tabs: only categories that have products (+ All) */
const presentCats = ['All', ...new Set(CATALOG.map(p => p.category))];
ok('Category tabs only show populated categories', d.querySelectorAll('#categoryTabs .cat-btn').length === presentCats.length,
   'tabs=' + d.querySelectorAll('#categoryTabs .cat-btn').length + ' expected=' + presentCats.length);

/* ---------------- 2. cart add / badge / total ---------------- */
w.eval(`HRL.openProductModal(${FIRST.id}); HRL.changeQty(1); HRL.addFromModal();`);
ok('Cart badge = 2 after adding qty 2', d.getElementById('cartBadge').textContent === '2', 'badge=' + d.getElementById('cartBadge').textContent);
ok('Cart total = ' + money(FIRST.price * 2), d.getElementById('cartTotalDisplay').textContent === money(FIRST.price * 2),
   'total=' + d.getElementById('cartTotalDisplay').textContent);
const stored = JSON.parse(w.localStorage.getItem('hallroad_cart_v2') || '[]');
ok('Cart stores references {id,variant,qty}, not a price snapshot',
   stored.length === 1 && stored[0].id === FIRST.id && typeof stored[0].variant === 'number' && stored[0].price === undefined,
   JSON.stringify(stored));

/* ---------------- 3. prices recompute on load ---------------- */
{
  const r2 = boot(HTML, JSON.stringify([{ id: FIRST.id, variant: 0, qty: 1 }]));
  ok('Stored cart prices recompute from catalog on load', r2.w.document.getElementById('cartTotalDisplay').textContent === money(FIRST.price),
     'total=' + r2.w.document.getElementById('cartTotalDisplay').textContent);
}

/* ---------------- 4. pricing + honest discount ---------------- */
w.eval(`HRL.openProductModal(${FIRST.id}); HRL.selectVariant(0);`);
ok('Base price shown correctly', d.getElementById('pdpPriceCurrent').textContent === money(FIRST.price),
   d.getElementById('pdpPriceCurrent').textContent);
const firstCard = d.querySelector('#productGrid .product-card');
const badge = firstCard && firstCard.querySelector('.discount-badge');
ok('Discount badge shows the honest minimum (' + honestDiscount(FIRST) + '%)',
   honestDiscount(FIRST) === 0 ? !badge : (badge && badge.textContent === '-' + honestDiscount(FIRST) + '%'),
   'badge=' + (badge ? badge.textContent : 'none'));

/* ---------------- 5. phone validation + WhatsApp + cart safety ---------------- */
function fillForm(phone) {
  d.getElementById('custName').value = 'Ali Khan';
  d.getElementById('custPhone').value = phone;
  d.getElementById('custCity').value = 'Lahore';
  d.getElementById('custAddress').value = 'House 1, Street 2, Model Town';
}
let opened = null;
w.open = () => { opened = 'x'; return {}; };
w.eval(`HRL.setCart([{id:${FIRST.id},variant:0,qty:2}]); HRL.saveCart(); HRL.updateCartUI(); HRL.openCheckoutModal();`);
fillForm('abc');
d.getElementById('orderForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
ok('Invalid phone blocks the order', opened === null && w.eval('HRL.getCart().length') === 1, 'opened=' + (opened ? 'yes' : 'no'));

opened = null;
w.open = () => null;   // blocked popup
w.eval('HRL.openCheckoutModal();');
fillForm('0300 1234567');
d.getElementById('orderForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
ok('Blocked popup -> copy-order fallback, sale not lost',
   d.getElementById('confirmModal').classList.contains('open') &&
   d.getElementById('confirmBody').textContent.indexOf('Copy order') !== -1);
ok('Order logged locally', w.eval('JSON.parse(localStorage.getItem("hallroad_orders")||"[]").length') >= 1);

let waUrl = null;
w.open = (u) => { waUrl = u; return {}; };
w.eval(`HRL.setCart([{id:${FIRST.id},variant:0,qty:1}]); HRL.saveCart(); HRL.updateCartUI(); HRL.openCheckoutModal();`);
fillForm('+92 300 1234567');
d.getElementById('orderForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
const decoded = waUrl ? decodeURIComponent(waUrl) : '';
ok('Valid phone opens WhatsApp with order ID + items',
   !!waUrl && waUrl.indexOf('wa.me/923396202062') !== -1 && /HRL-\d{6}/.test(decoded) && decoded.indexOf(FIRST.title.en.slice(0, 12)) !== -1,
   decoded.split('\n').slice(0, 3).join(' / '));
ok('Cart cleared only after handoff', w.eval('HRL.getCart().length') === 0);

/* ---------------- 6. search ---------------- */
const word = FIRST.title.en.split(' ')[0].toLowerCase();
d.getElementById('searchInput').value = word; w.eval('HRL.onSearchInput();');
await new Promise(r => setTimeout(r, 250));
ok('Search by title word matches', d.querySelectorAll('#productGrid .product-card').length >= 1, 'count=' + d.querySelectorAll('#productGrid .product-card').length);
d.getElementById('searchInput').value = 'zzz-not-here'; w.eval('HRL.onSearchInput();');
await new Promise(r => setTimeout(r, 250));
ok('No-result search shows a message', d.getElementById('productGrid').textContent.indexOf('No products found') !== -1);
d.getElementById('searchInput').value = ''; w.eval('HRL.onSearchInput();');
await new Promise(r => setTimeout(r, 250));

/* ---------------- 7. SEO / a11y ---------------- */
ok('<link rel=canonical>', !!d.querySelector('link[rel=canonical]'));
ok('og:image', !!d.querySelector('meta[property="og:image"]'));
ok('favicon', !!d.querySelector('link[rel="icon"]'));
ok('JSON-LD present', !!d.querySelector('script[type="application/ld+json"]'));
ok('homepage ItemList matches catalog size', (JSON.parse(d.getElementById('catalog-jsonld').textContent).itemListElement || []).length === CATALOG.length);
ok('images loading=lazy', d.querySelectorAll('#productGrid img[loading="lazy"]').length > 0);
ok('pinch-zoom allowed', !d.querySelector('meta[name=viewport]').content.includes('user-scalable=no'));
ok('dialogs labelled', d.querySelectorAll('[role=dialog][aria-modal="true"]').length >= 2);
ok('logo accessible', d.querySelector('.brand-logo-img').getAttribute('alt') !== null);
ok('styles.css linked', !!d.querySelector('link[rel="stylesheet"][href="/styles.css"]'));
w.eval(`HRL.openProductModal(${FIRST.id});`);
ok('modal opens', d.getElementById('pdpModal').classList.contains('open'));
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
ok('Escape closes modal', !d.getElementById('pdpModal').classList.contains('open'));

/* ---------------- 8. product page ---------------- */
{
  const pr = boot(read(`products/${FIRST.slug}.html`));
  const pd = pr.w.document;
  ok('product page <h1>', pd.querySelector('h1') && pd.querySelector('h1').textContent.indexOf(FIRST.title.en.slice(0, 10)) !== -1);
  ok('product page JSON-LD Product', pd.querySelector('script[type="application/ld+json"]').textContent.indexOf('"@type":"Product"') !== -1);
  ok('product page canonical + og:image', !!pd.querySelector('link[rel=canonical]') && !!pd.querySelector('meta[property="og:image"]'));
  ok('no runtime errors on product page', pr.errs.length === 0, pr.errs.join(' | ') || 'clean');
}

/* ---------------- 9. sorting, FAQ, order notes, breadcrumbs ---------------- */
{
  const cheapest = Math.min(...CATALOG.map(p => p.price));
  d.getElementById('sortSelect').value = 'price-asc';
  d.getElementById('sortSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  const firstLabel = d.querySelector('#productGrid .product-card')?.getAttribute('aria-label') || '';
  ok('Sort price-asc puts cheapest product first', firstLabel.includes(money(cheapest)), firstLabel);
  d.getElementById('sortSelect').value = 'featured';
  d.getElementById('sortSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
}
ok('FAQ section on homepage (>=6 questions)', d.querySelectorAll('#faq details').length >= 6,
   d.querySelectorAll('#faq details').length + ' questions');
ok('Cart shipping shows real regional "from" fee', d.getElementById('cartShippingDisplay').textContent.indexOf('Rs. 150') !== -1,
   d.getElementById('cartShippingDisplay').textContent);
ok('Product cards have WhatsApp quick-order button', d.querySelectorAll('#productGrid .product-card .wa-quick').length === CATALOG.length);

{
  const r4 = boot(HTML);
  const w4 = r4.w, d4 = r4.w.document;
  w4.eval(`HRL.setCart([{id:${FIRST.id},variant:0,qty:1}]); HRL.saveCart(); HRL.updateCartUI(); HRL.openCheckoutModal();`);
  d4.getElementById('custName').value = 'Ali Khan';
  d4.getElementById('custPhone').value = '0300 1234567';
  d4.getElementById('custCity').value = 'Lahore';
  d4.getElementById('custAddress').value = 'House 1, Street 2, Model Town';
  d4.getElementById('custNotes').value = 'Please call before delivery';
  let url4 = null;
  w4.open = (u) => { url4 = u; return {}; };
  d4.getElementById('orderForm').dispatchEvent(new w4.Event('submit', { cancelable: true, bubbles: true }));
  const dec4 = url4 ? decodeURIComponent(url4) : '';
  ok('Order notes reach the WhatsApp message', dec4.indexOf('*Notes:* Please call before delivery') !== -1,
     dec4.split('\n').filter(l => l.indexOf('Notes') !== -1).join(''));
}
{
  const pr2 = boot(read(`products/${FIRST.slug}.html`));
  const ld = pr2.w.document.querySelector('script[type="application/ld+json"]').textContent;
  ok('Product page JSON-LD has BreadcrumbList', ld.indexOf('"BreadcrumbList"') !== -1);
}

/* ---------------- 10. Info & Navigation Sidebar + Real Product Images ---------------- */
{
  const sb = d.getElementById('infoSidebar');
  const sbBtn = d.querySelector('[data-action="open-sidebar"]');
  ok('Header has Menu & Info sidebar button', !!sbBtn);
  ok('Info & Navigation Sidebar exists in DOM', !!sb);
  w.eval('HRL.toggleSidebar(true);');
  ok('Sidebar opens on toggleSidebar(true)', sb.classList.contains('open') && sbBtn.getAttribute('aria-expanded') === 'true');
  ok('Sidebar renders all present categories with product counts', d.querySelectorAll('#sidebarCategories [data-sidebar-cat]').length >= 5);
  ok('Sidebar includes complete store info cards (shipping, payment, warranty, sizing)', d.querySelectorAll('#sidebarInfoCards details').length >= 4);
  ok('Sidebar includes direct contact & WhatsApp support box', !!d.querySelector('.sidebar-contact-box'));
  w.eval('HRL.toggleSidebar(false);');
  ok('Sidebar closes on toggleSidebar(false)', !sb.classList.contains('open') && sbBtn.getAttribute('aria-expanded') === 'false');
  ok('No bundles in catalog (products only)', !CATALOG.some(p => p.category === 'Bundles') && CATALOG.length === 17, `${CATALOG.length} products`);
  ok('Every product image is a real photo (.jpg/.png, 0 .svg placeholders)', !CATALOG.some(p => p.images.some(img => img.endsWith('.svg'))));
}

/* ---------------- 11. Size selector + pack options (products.json "sizes" / "variantLabel") ---------------- */
{
  const byId = id => CATALOG.find(p => p.id === id);
  const clips = [16, 17].map(byId);
  const SIZED = CATALOG.filter(p => Array.isArray(p.sizes) && p.sizes.length);
  const packSummary = p => p.variants.map(v => `${v.name}=${p.price + v.extraCost}`).join(' / ');

  /* The requested update, pinned on purpose: both Solar Panel Water Drain Clips. */
  ok('Drain clips (ids 16, 17): price Rs. 99, was Rs. 100',
     clips.every(p => p && /Drain Clips/.test(p.title.en) && p.price === 99 && p.oldPrice === 100),
     clips.map(p => p && `${p.price}/${p.oldPrice}`).join(' '));
  ok('Drain clips: Size selector offers 30mm and 35mm',
     clips.every(p => p && JSON.stringify(p.sizes) === '[{"name":"30mm"},{"name":"35mm"}]'));
  ok('Drain clips: 1 / 10 / 20 Pcs at extraCost 0 / 800 / 1600 = Rs. 99 / 899 / 1,699',
     clips.every(p => p && JSON.stringify(p.variants.map(v => [v.name, v.extraCost])) === '[["1 Pcs",0],["10 Pcs",800],["20 Pcs",1600]]'),
     clips.map(p => p && packSummary(p)).join(' | '));
  ok('Drain clip titles/specs no longer claim a fixed "10 Pcs" pack',
     clips.every(p => p && !/10 Pcs/.test(p.title.en) && !/10 عدد/.test(p.title.ur) && p.specs.Pack !== '10 Pcs'));
  ok('Catalog: every product with sizes has unique, non-empty size names',
     SIZED.length >= 2 && SIZED.every(p => p.sizes.every(z => typeof z.name === 'string' && z.name.trim()) && new Set(p.sizes.map(z => z.name)).size === p.sizes.length),
     SIZED.map(p => p.id).join(','));

  const resetCart = () => w.eval('HRL.setCart([]); HRL.saveCart(); HRL.updateCartUI();');
  const storedCart = () => JSON.parse(w.localStorage.getItem('hallroad_cart_v2') || '[]');
  const sizeNames = () => [...d.querySelectorAll('#sizePills .variant-pill')].map(b => b.textContent.trim());

  /* Modal: Size selector + Pack group, for every product that defines sizes */
  for (const S of SIZED) {
    resetCart();
    w.eval(`HRL.openProductModal(${S.id});`);
    const legend = S.variantLabel ? S.variantLabel.en : 'Select option';
    ok(`Modal #${S.id}: Size selector shows the sizes from products.json, first one preselected`,
       !d.getElementById('sizeSet').hidden && JSON.stringify(sizeNames()) === JSON.stringify(S.sizes.map(z => z.name)) &&
       d.querySelector('#sizePills .variant-pill.selected').textContent.trim() === S.sizes[0].name &&
       d.getElementById('sizeLegend').textContent === 'Size', sizeNames().join(' | '));
    ok(`Modal #${S.id}: option group is headed "${legend}" and lists every pack`,
       d.getElementById('variantLegend').textContent === legend &&
       d.querySelectorAll('#variantPills .variant-pill').length === S.variants.length);
    const shown = S.variants.map((v, i) => { w.eval(`HRL.selectVariant(${i});`); return d.getElementById('pdpPriceCurrent').textContent; });
    ok(`Modal #${S.id}: each pack shows its own price`,
       JSON.stringify(shown) === JSON.stringify(S.variants.map(v => money(S.price + v.extraCost))), shown.join(' / '));
    w.eval('HRL.selectSize(1);');
    ok(`Modal #${S.id}: choosing a size highlights it and never changes the price`,
       d.querySelector('#sizePills .variant-pill.selected').textContent.trim() === S.sizes[1].name &&
       d.querySelectorAll('#sizePills .variant-pill[aria-checked="true"]').length === 1 &&
       d.getElementById('pdpPriceCurrent').textContent === shown[shown.length - 1]);
  }

  /* Cart: size is stored as an index next to the variant, never as a price */
  const S = clips[0];
  resetCart();
  w.eval(`HRL.openProductModal(${S.id}); HRL.selectSize(1); HRL.selectVariant(1); HRL.addFromModal();`);
  let cl = storedCart();
  ok('Cart stores {id, variant, size, qty} for a sized product - no price snapshot',
     cl.length === 1 && cl[0].id === S.id && cl[0].variant === 1 && cl[0].size === 1 && cl[0].qty === 1 && cl[0].price === undefined,
     JSON.stringify(cl));
  ok('Cart total uses the chosen pack price (' + money(S.price + S.variants[1].extraCost) + ')',
     d.getElementById('cartTotalDisplay').textContent === money(S.price + S.variants[1].extraCost),
     d.getElementById('cartTotalDisplay').textContent);
  ok('Cart line names the size and the pack',
     d.getElementById('cartDrawerItems').textContent.indexOf(`${S.title.en} — Size: ${S.sizes[1].name}, Pack: ${S.variants[1].name}`) !== -1);
  w.eval(`HRL.openProductModal(${S.id}); HRL.selectSize(1); HRL.selectVariant(1); HRL.addFromModal();`);   // same choice -> merge
  w.eval(`HRL.openProductModal(${S.id}); HRL.selectSize(0); HRL.selectVariant(1); HRL.addFromModal();`);   // other size -> own line
  cl = storedCart();
  ok('Same size + pack merges into one line; a different size is a separate line',
     cl.length === 2 && cl[0].size === 1 && cl[0].qty === 2 && cl[1].size === 0 && cl[1].qty === 1, JSON.stringify(cl));

  /* WhatsApp order text carries size + pack for every line */
  let waClip = null;
  w.open = u => { waClip = u; return {}; };
  w.eval('HRL.openCheckoutModal();');
  fillForm('+92 300 1234567');
  d.getElementById('orderForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  const msgClip = waClip ? decodeURIComponent(waClip) : '';
  ok('WhatsApp order lists "Size: .., Pack: .." for each clip line',
     msgClip.indexOf(`Size: ${S.sizes[1].name}, Pack: ${S.variants[1].name}`) !== -1 && msgClip.indexOf(`Size: ${S.sizes[0].name}, Pack: ${S.variants[1].name}`) !== -1,
     msgClip.split('\n').filter(l => l.indexOf('Size:') !== -1).join(' / '));

  /* Stored carts are validated on load (prices are recomputed, bad lines are dropped) */
  const seeded = boot(HTML, JSON.stringify([
    { id: S.id, variant: 1, qty: 2 },                   // saved before the product had sizes -> stale, dropped
    { id: S.id, variant: 0, qty: 1, size: 1 },          // valid
    { id: S.id, variant: 0, qty: 1, size: 9 },          // unknown size -> dropped
    { id: FIRST.id, variant: 0, qty: 1, size: 1 }       // product without sizes -> size ignored
  ]));
  ok('Stored cart: stale/invalid sized lines dropped, size ignored for unsized products',
     seeded.w.eval('JSON.stringify(HRL.getCart())') === JSON.stringify([{ id: S.id, variant: 0, qty: 1, size: 1 }, { id: FIRST.id, variant: 0, qty: 1 }]),
     seeded.w.eval('JSON.stringify(HRL.getCart())'));

  /* Products without sizes behave exactly as before */
  resetCart();
  w.eval(`HRL.openProductModal(${FIRST.id}); HRL.addFromModal();`);
  cl = storedCart();
  ok('Product without sizes: Size selector hidden, cart line has no size, title unchanged',
     d.getElementById('sizeSet').hidden === true && cl.length === 1 && !('size' in cl[0]) &&
     d.getElementById('cartDrawerItems').textContent.indexOf(`${FIRST.title.en} — ${FIRST.variants[0].name}`) !== -1);
  resetCart();

  /* Static product page: its own Size + Pack buttons */
  const pg = boot(read(`products/${S.slug}.html`));
  const pd = pg.w.document;
  const sizeBtns = [...pd.querySelectorAll('#sizePills .variant-pill')];
  ok('Product page: Size buttons come from products.json, first preselected',
     JSON.stringify(sizeBtns.map(b => b.textContent.trim())) === JSON.stringify(S.sizes.map(z => z.name)) && sizeBtns[0].classList.contains('selected'));
  ok('Product page: option group is headed "Pack" and lists every pack',
     pd.querySelector('#variantPills').closest('fieldset').querySelector('legend').textContent === 'Pack' &&
     pd.querySelectorAll('#variantPills .variant-pill').length === S.variants.length);
  sizeBtns[1].click();
  pd.querySelectorAll('#variantPills .variant-pill')[2].click();
  ok('Product page: picking a size + pack updates selection and price',
     pd.querySelector('#sizePills .variant-pill.selected').textContent.trim() === S.sizes[1].name &&
     pd.querySelector('#variantPills .variant-pill.selected').textContent.indexOf(S.variants[2].name) === 0 &&
     pd.getElementById('pdpPriceCurrent').textContent === money(S.price + S.variants[2].extraCost),
     pd.getElementById('pdpPriceCurrent').textContent);
  pd.querySelector('[data-action="add-from-page"]').click();
  ok('Product page: Add to Cart stores the chosen size + pack',
     pg.w.localStorage.getItem('hallroad_cart_v2') === JSON.stringify([{ id: S.id, variant: 2, qty: 1, size: 1 }]),
     pg.w.localStorage.getItem('hallroad_cart_v2'));
  ok('Product page JSON-LD lists the available sizes',
     pd.querySelector('script[type="application/ld+json"]').textContent.indexOf(`"Available sizes","value":"${S.sizes.map(z => z.name).join(', ')}"`) !== -1);
  ok('Product page: no runtime errors with the size selector', pg.errs.length === 0, pg.errs.join(' | ') || 'clean');
  ok('Product page has injected Cart Drawer & Checkout Modal (ensureCartAndCheckout)',
     !!pd.getElementById('cartDrawer') && !!pd.getElementById('checkoutModal') && !!pd.getElementById('confirmModal'));
  pd.querySelector('[data-action="buy-now"]').click();
  ok('Product page: clicking "Order directly on WhatsApp" (buy-now) opens Checkout Modal without error',
     pd.getElementById('checkoutModal').classList.contains('open') && pg.errs.length === 0, pg.errs.join(' | ') || 'open');
}

/* ---------------- 12. Moving ticker, promo bar + inline critical header CSS ---------------- */
{
  const src = new JSDOM(HTML).window.document;       // raw markup, before any script has run
  const header = src.querySelector('header.site-header');
  const promo = header && header.previousElementSibling;
  const ticker = promo && promo.previousElementSibling;
  ok('Promo bar (.promo-flash) sits directly above the header', !!promo && promo.classList.contains('promo-flash'));
  const laneB = ticker && ticker.querySelector('.ticker-move-container > .ticker-single-line#tickerB');
  ok('Moving ticker sits directly above the promo bar (#tickerA + aria-hidden #tickerB)',
     !!ticker && ticker.classList.contains('top-ticker-wrapper') &&
     !!ticker.querySelector('.ticker-move-container > .ticker-single-line#tickerA') &&
     !!laneB && laneB.getAttribute('aria-hidden') === 'true');

  const live = boot(HTML);
  const ld = live.w.document, cfgUi = live.w.SITE_CONFIG.ui || {};
  const tickerItems = (cfgUi.ticker && cfgUi.ticker.en) || [];
  ok(`Both ticker lanes are filled from site.config.js (${tickerItems.length} items each)`,
     tickerItems.length > 0 && ld.querySelectorAll('#tickerA .ticker-item').length === tickerItems.length &&
     ld.querySelectorAll('#tickerB .ticker-item').length === tickerItems.length &&
     ld.querySelector('#tickerA .ticker-item').textContent === tickerItems[0]);
  const promoTxt = cfgUi.promo && cfgUi.promo.en, promoEl = ld.querySelector('.promo-flash');
  ok('Promo bar shows the configured text (and is removed when that text is empty)',
     promoTxt ? !!promoEl && promoEl.textContent.indexOf(promoTxt) !== -1 : !promoEl);
  ok('No runtime errors with ticker + promo', live.errs.length === 0, live.errs.join(' | ') || 'clean');

  /* inline critical CSS for the header */
  const styleEl = src.querySelector('head > style');
  const rules = styleEl && styleEl.sheet ? [...styleEl.sheet.cssRules] : [];
  const selectors = rules.map(r => r.selectorText);
  const need = ['.header-content', '.header-top-row', '.menu-btn-head', '.brand-link', '.brand-logo-img', '.header-actions',
                '.lang-toggle', '.cart-btn-head', '.cart-count', '.search-bar', '.search-icon'];
  const missing = need.filter(sel => selectors.indexOf(sel) === -1);
  ok('Inline critical <style> defines all 11 header components', !!styleEl && missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : need.length + '/' + need.length);
  const cssLink = src.querySelector('link[rel="stylesheet"][href="/styles.css"]');
  ok('Critical <style> is placed BEFORE /styles.css, so the full stylesheet still wins',
     !!styleEl && !!cssLink && (styleEl.compareDocumentPosition(cssLink) & 4) !== 0);   // 4 = DOCUMENT_POSITION_FOLLOWING

  /* Shop identity, comparison table, FAQPage schema, clean sitemap */
  const sitemapXml = read('sitemap.xml');
  ok('sitemap.xml contains no fragment (#) URLs', sitemapXml.indexOf('#') === -1);
  ok('Store identity includes G Power & Electronics and Shop No. 1, Sarwar Centre, Hall Road, Lahore',
     live.w.SITE_CONFIG.brand.legalName === 'G Power & Electronics' &&
     ld.body.textContent.indexOf('Shop No. 1, Sarwar Centre, Hall Road') !== -1);
  ok('Homepage includes Quick Comparison table (#compareSection) and FAQPage JSON-LD',
     !!ld.getElementById('compareSection') && HTML.indexOf('"@type": "FAQPage"') !== -1);
}

console.log('\n================ TESTS: hallroadlahore.com (built) ================\n');
let pass = 0;
for (const r of results) { if (r.pass) pass++; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? '  [' + r.d + ']' : ''}`); }
const fails = results.length - pass;
console.log(`\n--- ${pass} pass / ${fails} fail (of ${results.length}) ---`);
if (fails > 0) process.exitCode = 1;
