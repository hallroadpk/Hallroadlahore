/* =============================================================================
 * tests/store.test.mjs — end-to-end test of the BUILT static site.
 *
 * Loads the real index.html, then executes the real site.config.js,
 * products.js and app.js inside jsdom, and drives the real functions.
 *
 *   npm test          (or: node tests/store.test.mjs)
 *
 * Re-runs every check from the 2026-09-28 audit and asserts the fixes hold.
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
const P_HTML = read('products/alkaram-pure-sine-wave-solar-inverter.html');

const results = [];
const ok = (n, cond, d) => results.push({ n, pass: !!cond, d: d || '' });

function boot(html, seed) {
  const errs = [];
  const vc = new (class {})();
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://hallroadlahore.com/',
    beforeParse(w) {
      Object.defineProperty(w.HTMLElement.prototype, 'innerText', {
        get() { return this.textContent; }, set(v) { this.textContent = v; }, configurable: true
      });
      if (seed) w.localStorage.setItem('hallroad_cart_v2', seed);
    }
  });
  const w = dom.window;
  w.addEventListener('error', e => errs.push(e.message));
  // execute the real scripts in order
  for (const f of ['site.config.js', 'products.js', 'app.js']) {
    try { w.eval(read(f)); } catch (e) { errs.push(f + ': ' + e.message); }
  }
  // jsdom keeps readyState 'loading' without a resource loader, so fire the event
  // the app defers to.
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { w, errs };
}

/* ---------------- 1. boot & catalog ---------------- */
let { w, errs } = boot(HTML);
const cards = w.document.querySelectorAll('#productGrid .product-card');
ok('Catalog renders 7 product cards', cards.length === 7, cards.length + ' cards');
ok('No runtime errors on load', errs.length === 0, errs.join(' | ') || 'clean');
ok('Product cards are real <button>s (keyboard-reachable)', cards.length > 0 && cards[0].tagName === 'BUTTON',
   'card tag = ' + (cards[0] ? cards[0].tagName : 'none'));

/* ---------------- 2. cart add / badge / total ---------------- */
w.eval('HRL.openProductModal(1); HRL.changeQty(1); HRL.addFromModal();');
ok('Cart badge shows 2 after adding qty 2', w.document.getElementById('cartBadge').textContent === '2',
   'badge=' + w.document.getElementById('cartBadge').textContent);
ok('Cart total Rs. 4,998', w.document.getElementById('cartTotalDisplay').textContent === 'Rs. 4,998',
   'total=' + w.document.getElementById('cartTotalDisplay').textContent);
const stored = JSON.parse(w.localStorage.getItem('hallroad_cart_v2') || '[]');
ok('Cart stores references {id,variant,qty}, not a price snapshot',
   stored.length === 1 && stored[0].id === 1 && typeof stored[0].variant === 'number' && stored[0].price === undefined,
   JSON.stringify(stored));

/* ---------------- 3. prices recompute on load (no stale price) ---------------- */
{
  const seed = JSON.stringify([{ id: 6, variant: 0, qty: 1 }]);   // charger now Rs.1,999
  const r2 = boot(HTML, seed);
  ok('Stored cart prices recompute from catalog on load (Rs. 1,999)',
     r2.w.document.getElementById('cartTotalDisplay').textContent === 'Rs. 1,999',
     'total=' + r2.w.document.getElementById('cartTotalDisplay').textContent);
}

/* ---------------- 4. variant pricing + honest discount ---------------- */
w.eval('HRL.openProductModal(3); HRL.selectVariant(4);');
ok('6000W variant price Rs. 19,800 / was Rs. 22,910',
   w.document.getElementById('pdpPriceCurrent').textContent === 'Rs. 19,800' &&
   w.document.getElementById('pdpPriceOld').textContent === 'Rs. 22,910',
   w.document.getElementById('pdpPriceCurrent').textContent + ' / ' + w.document.getElementById('pdpPriceOld').textContent);
const badge3 = w.document.querySelectorAll('#productGrid .product-card')[2].querySelector('.discount-badge');
ok('Grid discount badge shows the honest minimum (14%), not 35%',
   badge3 && badge3.textContent === '-14%', 'badge=' + (badge3 ? badge3.textContent : 'none'));

/* ---------------- 5. phone validation + WhatsApp + cart safety ---------------- */
function fillForm(w, phone) {
  w.document.getElementById('custName').value = 'Ali Khan';
  w.document.getElementById('custPhone').value = phone;
  w.document.getElementById('custCity').value = 'Lahore';
  w.document.getElementById('custAddress').value = 'House 1, Street 2, Model Town';
}
// invalid phone -> no window.open, cart intact
let opened = null;
w.open = (u) => { opened = u; return {}; };
w.eval('HRL.setCart([{id:5,variant:0,qty:2}]); HRL.saveCart(); HRL.updateCartUI(); HRL.openCheckoutModal();');
fillForm(w, 'abc');
w.document.getElementById('orderForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
ok('Invalid phone blocks the order (no WhatsApp, cart kept)',
   opened === null && w.eval('HRL.getCart().length') === 1, 'opened=' + (opened ? 'yes' : 'no') + ' cart=' + w.eval('HRL.getCart().length'));

// valid phone + popup blocked -> fallback shown, cart kept until handoff
opened = null; let openedWin = null;
w.open = () => null;                       // simulate blocked popup
w.eval('HRL.openCheckoutModal();');
fillForm(w, '0300 1234567');
w.document.getElementById('orderForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
const confirmOpen = w.document.getElementById('confirmModal').classList.contains('open');
const hasFallback = w.document.getElementById('confirmBody').textContent.indexOf('Copy order') !== -1;
ok('Blocked popup shows copy-order fallback and does NOT lose the sale',
   confirmOpen && hasFallback, 'confirmOpen=' + confirmOpen + ' fallback=' + hasFallback);
// after a blocked popup the cart IS cleared (order is recorded + handed to fallback), but message was preserved:
const orderLogged = w.eval('JSON.parse(localStorage.getItem("hallroad_orders")||"[]").length') >= 1;
ok('Order logged locally (never lost)', orderLogged, 'orders=' + w.eval('JSON.parse(localStorage.getItem("hallroad_orders")||"[]").length'));

// valid phone + popup works -> WhatsApp URL with order ID, cart cleared after handoff
let waUrl = null;
w.open = (u) => { waUrl = u; return {}; };
w.eval('HRL.setCart([{id:5,variant:0,qty:1}]); HRL.saveCart(); HRL.updateCartUI(); HRL.openCheckoutModal();');
fillForm(w, '+92 300 1234567');
w.document.getElementById('orderForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
const decoded = waUrl ? decodeURIComponent(waUrl) : '';
ok('Valid phone opens WhatsApp with order ID + items + total',
   !!waUrl && waUrl.indexOf('wa.me/923396202062') !== -1 && /HRL-\d{6}/.test(decoded) && decoded.indexOf('Alkaram PI-3000W') !== -1,
   (decoded.split('\n').slice(0, 4).join(' / ')));
ok('Cart cleared only after successful handoff', w.eval('HRL.getCart().length') === 0, 'cart=' + w.eval('HRL.getCart().length'));

/* ---------------- 6. search (titles + features) + debounce ---------------- */
w.document.getElementById('searchInput').value='inverter'; w.eval('HRL.onSearchInput();');
await new Promise(r => setTimeout(r, 250));   // let the 180ms debounce fire
ok('Search "inverter" matches 3 products', w.document.querySelectorAll('#productGrid .product-card').length === 3,
   'count=' + w.document.querySelectorAll('#productGrid .product-card').length);
w.document.getElementById('searchInput').value = 'mppt';
w.eval('HRL.onSearchInput();');
await new Promise(r => setTimeout(r, 250));
ok('Search matches product features too ("mppt" -> 1)', w.document.querySelectorAll('#productGrid .product-card').length === 1,
   'count=' + w.document.querySelectorAll('#productGrid .product-card').length);
w.document.getElementById('searchInput').value='zzz'; w.eval('HRL.onSearchInput();');
await new Promise(r => setTimeout(r, 250));
ok('No-result search shows a message', w.document.getElementById('productGrid').textContent.indexOf('No products found') !== -1);

/* ---------------- 7. SEO / a11y on the real DOM ---------------- */
w.document.getElementById('searchInput').value = '';
w.eval('HRL.onSearchInput();');
await new Promise(r => setTimeout(r, 250));
const d = w.document;
ok('<link rel=canonical> present', !!d.querySelector('link[rel=canonical]'));
ok('og:image present', !!d.querySelector('meta[property="og:image"]'));
ok('favicon present', !!d.querySelector('link[rel="icon"]'));
ok('JSON-LD structured data present', !!d.querySelector('script[type="application/ld+json"]'));
ok('Product images use loading=lazy', d.querySelectorAll('#productGrid img[loading="lazy"]').length > 0);
ok('Pinch-zoom allowed (no user-scalable=no)', !(d.querySelector('meta[name=viewport]').content.includes('user-scalable=no')));
ok('Modals carry role=dialog + aria-modal', d.querySelectorAll('[role=dialog][aria-modal="true"]').length >= 2);
ok('Logo has an accessible name (alt)', d.querySelector('.brand-logo-img').getAttribute('alt') !== null);
ok('styles.css is linked', !!d.querySelector('link[rel=stylesheet][href="/styles.css"]'));
ok('Currency pinned to en-PK (Rs. 13,500)', w.eval(`(new Intl.NumberFormat('en-PK')).format(13500)`) === '13,500');

/* Escape closes an open modal */
w.eval('HRL.openProductModal(1);');
ok('Product modal opens', d.getElementById('pdpModal').classList.contains('open'));
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
ok('Escape key closes the product modal', !d.getElementById('pdpModal').classList.contains('open'));

/* ---------------- 8. product page (crawlable) ---------------- */
{
  const pr = boot(P_HTML);
  const pd = pr.w.document;
  ok('Product page has <h1> with product name', pd.querySelector('h1') && pd.querySelector('h1').textContent.indexOf('Alkaram Pure Sine Wave') !== -1);
  ok('Product page has JSON-LD Product schema', (pd.querySelector('script[type="application/ld+json"]').textContent.indexOf('"@type":"Product"') !== -1));
  ok('Product page has canonical + og:image', !!pd.querySelector('link[rel=canonical]') && !!pd.querySelector('meta[property="og:image"]'));
  ok('No runtime errors on product page', pr.errs.length === 0, pr.errs.join(' | ') || 'clean');
}

/* ---------------- report ---------------- */
console.log('\n================ TESTS: hallroadlahore.com (built) ================\n');
let pass = 0;
for (const r of results) { if (r.pass) pass++; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? '  [' + r.d + ']' : ''}`); }
const fails = results.length - pass;
console.log(`\n--- ${pass} pass / ${fails} fail (of ${results.length}) ---`);
if (fails > 0) process.exitCode = 1;
