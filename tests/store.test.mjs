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
    const now = p.price + (v.extraCost || 0), was = (p.oldPrice || 0) + (v.extraCost || 0);
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

console.log('\n================ TESTS: hallroadlahore.com (built) ================\n');
let pass = 0;
for (const r of results) { if (r.pass) pass++; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? '  [' + r.d + ']' : ''}`); }
const fails = results.length - pass;
console.log(`\n--- ${pass} pass / ${fails} fail (of ${results.length}) ---`);
if (fails > 0) process.exitCode = 1;
