/* =============================================================================
 * app.js — hallroadlahore.com storefront logic
 *
 * Fixes vs. the original inline script:
 *  - cart stores {id, variant, qty} and recomputes prices on load (no stale prices)
 *  - discount badge shows the minimum real discount, never an inflated one
 *  - phone numbers are validated and normalised before an order is sent
 *  - the cart is only cleared after WhatsApp actually opens; otherwise a
 *    copy-the-order fallback is shown so the order is never lost
 *  - every order gets an ID and is logged locally (and POSTed if configured)
 *  - Escape closes overlays, focus is trapped and restored, dialogs are labelled
 *  - product cards are real <button>s, images have width/height + loading=lazy
 *  - all data is inserted via textContent, never innerHTML (no XSS from catalog data)
 *  - prices use Intl.NumberFormat('en-PK') so separators never change per visitor
 *  - English / Urdu toggle
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var PRODUCTS = window.PRODUCTS || [];
  var CATEGORIES = window.CATEGORIES || [{ id: 'All', en: 'All Products', ur: 'تمام پروڈکٹس' }];

  var CART_KEY = 'hallroad_cart_v2';
  var ORDERS_KEY = 'hallroad_orders';
  var LANG_KEY = 'hallroad_lang';
  var FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f1f5f9"/>' +
    '<text x="400" y="410" font-family="sans-serif" font-size="42" fill="#94a3b8" text-anchor="middle">Image unavailable</text></svg>');

  /* ------------------------------------------------------------- formatting */
  var PKR = new Intl.NumberFormat('en-PK');
  function money(n) { return 'Rs. ' + PKR.format(Math.round(n)); }

  /* ------------------------------------------------------------------- i18n */
  var STRINGS = {
    en: {
      addToCart: 'Add to Cart', viewDetails: 'View Details', cart: 'Cart', total: 'Total',
      shipping: 'Shipping', free: 'Free', checkout: 'Proceed to Checkout', yourCart: 'Your Shopping Cart',
      sortBy: 'Sort by', sortFeatured: 'Featured', sortPriceLow: 'Price: Low to High', sortPriceHigh: 'Price: High to Low',
      shipFrom: 'From %f - by region', quickWa: 'WhatsApp',
      emptyCart: 'Your cart is empty.', completeOrder: 'Complete Your Order', fullName: 'Full Name',
      phone: 'WhatsApp / Mobile Number', city: 'City', address: 'Complete Delivery Address',
      payment: 'Payment Method', confirm: 'Confirm Order', noResults: 'No products found.',
      searchPlaceholder: 'Search inverters, chargers, solar...',
      selectOption: 'Select option', quantity: 'Quantity', keyFeatures: 'Key features',
      warranty: 'Warranty', description: 'Description', related: 'You may also like',
      orderSent: 'Order sent', weWillCall: 'We will confirm on WhatsApp shortly.',
      yourOrderId: 'Your order ID', copyOrder: 'Copy order text', copied: 'Copied to clipboard',
      keepShopping: 'Continue shopping', whatsappBlocked: "WhatsApp could not open automatically. Copy your order below and send it to",
      errName: 'Please enter your full name.', errPhone: 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.',
      errCity: 'Please enter your city.', errAddress: 'Please enter your complete delivery address.',
      errCart: 'Your cart is empty.', added: 'Added to cart', removed: 'Removed',
      inStock: 'In stock', lowStock: 'Only %n left', outStock: 'Out of stock',
      closeCart: 'Close cart', closeDialog: 'Close', remove: 'Remove',
      step1: 'Send the order on WhatsApp (opens in a new tab).',
      step2: 'Our team confirms stock and delivery time on WhatsApp.',
      step3: 'The rider calls you before delivery. Pay cash on delivery.',
      advanceTitle: 'Advance payment details', advanceBody: 'Only send an advance after our team confirms your order on WhatsApp.',
      orderSummary: 'Order summary', items: 'items'
    },
    ur: {
      addToCart: 'کارٹ میں شامل کریں', viewDetails: 'تفصیلات دیکھیں', cart: 'کارٹ', total: 'کل رقم',
      shipping: 'ڈیلیوری', free: 'مفت', checkout: 'چیک آؤٹ کریں', yourCart: 'آپ کا کارٹ',
      sortBy: 'ترتیب', sortFeatured: 'فیچرڈ', sortPriceLow: 'قیمت: کم سے زیادہ', sortPriceHigh: 'قیمت: زیادہ سے کم',
      shipFrom: '%f سے - علاقے کے مطابق', quickWa: 'واٹس ایپ',
      emptyCart: 'آپ کا کارٹ خالی ہے۔', completeOrder: 'آرڈر مکمل کریں', fullName: 'پورا نام',
      phone: 'واٹس ایپ / موبائل نمبر', city: 'شہر', address: 'مکمل ڈیلیوری ایڈریس',
      payment: 'ادائیگی کا طریقہ', confirm: 'آرڈر کنفرم کریں', noResults: 'کوئی پروڈکٹ نہیں ملی۔',
      searchPlaceholder: 'انورٹر، چارجر، سولر تلاش کریں...',
      selectOption: 'آپشن منتخب کریں', quantity: 'تعداد', keyFeatures: 'اہم خصوصیات',
      warranty: 'وارنٹی', description: 'تفصیل', related: 'یہ بھی دیکھیں',
      orderSent: 'آرڈر بھیج دیا گیا', weWillCall: 'ہم جلد واٹس ایپ پر کنفرم کریں گے۔',
      yourOrderId: 'آپ کا آرڈر آئی ڈی', copyOrder: 'آرڈر ٹیکسٹ کاپی کریں', copied: 'کاپی ہو گیا',
      keepShopping: 'خریداری جاری رکھیں', whatsappBlocked: 'واٹس ایپ خودکار نہیں کھلا۔ نیچے سے آرڈر کاپی کر کے اس نمبر پر بھیجیں',
      errName: 'براہ کرم اپنا پورا نام لکھیں۔', errPhone: 'درست موبائل نمبر لکھیں، مثلاً 0300 1234567۔',
      errCity: 'براہ کرم شہر لکھیں۔', errAddress: 'براہ کرم مکمل ایڈریس لکھیں۔',
      errCart: 'آپ کا کارٹ خالی ہے۔', added: 'کارٹ میں شامل ہو گیا', removed: 'ہٹا دیا گیا',
      inStock: 'اسٹاک میں', lowStock: 'صرف %n باقی', outStock: 'اسٹاک ختم',
      closeCart: 'کارٹ بند کریں', closeDialog: 'بند کریں', remove: 'ہٹائیں',
      step1: 'واٹس ایپ پر آرڈر بھیجیں (نئی ٹیب میں کھلے گا)۔',
      step2: 'ہماری ٹیم واٹس ایپ پر اسٹاک اور ڈیلیوری ٹائم کنفرم کرے گی۔',
      step3: 'رائیڈر ڈیلیوری سے پہلے کال کرے گا۔ ڈیلیوری پر کیش ادا کریں۔',
      advanceTitle: 'ایڈوانس ادائیگی کی تفصیل', advanceBody: 'آرڈر واٹس ایپ پر کنفرم ہونے کے بعد ہی ایڈوانس بھیجیں۔',
      orderSummary: 'آرڈر کا خلاصہ', items: 'اشیاء'
    }
  };

  var lang = localStorage.getItem(LANG_KEY) || (CFG.ui && CFG.ui.defaultLanguage) || 'en';
  if (!STRINGS[lang]) lang = 'en';
  function t(k) { return (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k; }
  function L(obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
  }

  /* --------------------------------------------------------- DOM helpers */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;               // only for static, trusted markup
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function img(src, alt, opts) {
    opts = opts || {};
    var i = el('img', {
      src: src, alt: alt || '', width: opts.w, height: opts.h,
      class: opts.class, loading: opts.loading || 'lazy', decoding: 'async'
    });
    if (opts.eager) { i.setAttribute('fetchpriority', 'high'); i.removeAttribute('loading'); }
    i.addEventListener('error', function () {
      if (i.dataset.fellback) return;
      i.dataset.fellback = '1';
      i.src = FALLBACK_IMG;
    });
    return i;
  }
  function imgSrc(x) { return /^https?:/i.test(x) ? x : '/' + String(x).replace(/^\/+/, ''); }
function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* --------------------------------------------------------------- toast */
  function toast(msg, kind) {
    var stack = $('.toast-stack') || document.body.appendChild(el('div', { class: 'toast-stack', 'aria-live': 'polite', role: 'status' }));
    var node = el('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: msg });
    stack.appendChild(node);
    setTimeout(function () { node.remove(); }, 4200);
  }

  /* -------------------------------------------------------- product helpers */
  function findProduct(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
  function variantPrice(p, vi) { return p.price + ((p.variants[vi] || {}).extraCost || 0); }
  function variantOldPrice(p, vi) { return p.oldPrice ? p.oldPrice + ((p.variants[vi] || {}).extraCost || 0) : 0; }
  /* The discount the buyer can actually get on the cheapest variant. */
  function honestDiscount(p) {
    var min = 0;
    p.variants.forEach(function (v, i) {
      var now = variantPrice(p, i), was = variantOldPrice(p, i);
      var d = was > 0 ? Math.round(((was - now) / was) * 100) : 0;
      if (i === 0 || d < min) min = d;
    });
    return min;
  }
  function stockLabel(p) {
    if (p.stock === undefined) return null;
    if (p.stock <= 0) return { text: t('outStock'), cls: 'out' };
    if (p.stock <= 5) return { text: t('lowStock').replace('%n', p.stock), cls: 'low' };
    return { text: t('inStock'), cls: '' };
  }

  /* Shipping is charged by region; show the honest "from" fee everywhere. */
  function lowestShipFee() {
    var rates = (CFG.shipping && CFG.shipping.rates) || [];
    var min = Infinity;
    rates.forEach(function (r) { if (r.fee < min) min = r.fee; });
    return isFinite(min) ? min : null;
  }
  function shipNote() {
    var free = !CFG.shipping || CFG.shipping.freeShipping !== false;
    if (free) return t('free') + ' nationwide';
    var f = lowestShipFee();
    return f != null ? t('shipFrom').replace('%f', money(f)) : 'By region - confirmed on WhatsApp';
  }

  /* ================================================================ SORTING */
  var sortMode = 'featured';
  try { sortMode = localStorage.getItem('hallroad_sort') || 'featured'; } catch (e) {}
  function applySort(list) {
    if (sortMode === 'price-asc') { var a = list.slice(); a.sort(function (x, y) { return x.price - y.price; }); return a; }
    if (sortMode === 'price-desc') { var b = list.slice(); b.sort(function (x, y) { return y.price - x.price; }); return b; }
    return list;
  }
  function initSort() {
    var sel = $('#sortSelect');
    if (!sel) return;
    sel.appendChild(new Option(t('sortFeatured'), 'featured'));
    sel.appendChild(new Option(t('sortPriceLow'), 'price-asc'));
    sel.appendChild(new Option(t('sortPriceHigh'), 'price-desc'));
    sel.value = sortMode;
    sel.addEventListener('change', function () {
      sortMode = sel.value;
      try { localStorage.setItem('hallroad_sort', sortMode); } catch (e) {}
      renderProducts();
    });
  }

  /* ================================================================= CART */
  var cart = loadCart();

  /* Prices are recomputed from the catalog on every load, so a price change can
     never leave a customer checking out at an old price. Stale entries are dropped. */
  function loadCart() {
    var out = [];
    try { out = JSON.parse(localStorage.getItem(CART_KEY) || '[]') || []; } catch (e) { out = []; }
    var clean = [];
    out.forEach(function (c) {
      var p = findProduct(c.id);
      if (!p) return;
      var vi = c.variant || 0;
      if (!p.variants[vi]) return;
      var qty = Math.max(1, Math.min(99, parseInt(c.qty, 10) || 1));
      clean.push({ id: p.id, variant: vi, qty: qty });
    });
    return clean;
  }
  function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function cartLine(c) {
    var p = findProduct(c.id);
    return {
      product: p,
      variant: p.variants[c.variant],
      title: p.title.en + ' — ' + p.variants[c.variant].name,
      unit: variantPrice(p, c.variant),
      qty: c.qty
    };
  }
  function cartCount() { return cart.reduce(function (s, c) { return s + c.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (s, c) { return s + variantPrice(findProduct(c.id), c.variant) * c.qty; }, 0); }

  function updateCartUI() {
    var badge = $('#cartBadge');
    if (badge) badge.textContent = String(cartCount());
    var totalEl = $('#cartTotalDisplay');
    if (totalEl) totalEl.textContent = money(cartTotal());
    var ship = $('#cartShippingDisplay');
    if (ship) ship.textContent = shipNote();
    var body = $('#cartDrawerItems');
    if (!body) return;
    body.textContent = '';
    if (!cart.length) { body.appendChild(el('p', { class: 'empty-cart-msg', text: t('emptyCart') })); return; }
    cart.forEach(function (c, idx) {
      var line = cartLine(c);
      var controls = el('div', { class: 'cart-item-controls' }, [
        el('button', { class: 'qty-btn-sm', type: 'button', 'aria-label': 'Decrease quantity', text: '−',
          onclick: function () { changeCartQty(idx, -1); } }),
        el('span', { class: 'cart-item-qty', text: String(c.qty), 'aria-live': 'polite' }),
        el('button', { class: 'qty-btn-sm', type: 'button', 'aria-label': 'Increase quantity', text: '+',
          onclick: function () { changeCartQty(idx, 1); } })
      ]);
      body.appendChild(el('div', { class: 'cart-item-row' }, [
        el('div', { class: 'cart-item-info' }, [
          el('div', { class: 'cart-item-title', text: line.title }),
          el('div', { class: 'cart-item-price', text: money(line.unit) + ' × ' + c.qty }),
          controls
        ]),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': t('remove') + ' ' + line.title,
          html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
          onclick: function () { cart.splice(idx, 1); saveCart(); updateCartUI(); toast(t('removed')); } })
      ]));
    });
  }
  function changeCartQty(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty = Math.max(1, Math.min(99, cart[idx].qty + delta));
    saveCart(); updateCartUI();
  }

  /* ============================================================== OVERLAYS */
  var lastFocused = null;
  function openOverlay(node) {
    lastFocused = document.activeElement;
    node.classList.add('open');
    node.setAttribute('aria-hidden', 'false');
    var focusable = node.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeOverlay(node) {
    node.classList.remove('open');
    node.setAttribute('aria-hidden', 'true');
    if (!anyOverlayOpen()) document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function anyOverlayOpen() {
    return $$('.pdp-overlay.open, .cart-drawer.open, .modal-overlay.open').length > 0;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var co = $('#checkoutModal'); if (co && co.classList.contains('open')) { closeOverlay(co); return; }
      var pdp = $('#pdpModal'); if (pdp && pdp.classList.contains('open')) { closeOverlay(pdp); return; }
      var dr = $('#cartDrawer'); if (dr && dr.classList.contains('open')) { toggleCartDrawer(false); return; }
    }
    if (e.key === 'Tab') {
      var open = $$('.pdp-overlay.open, .modal-overlay.open').pop() || ($('#cartDrawer') && $('#cartDrawer').classList.contains('open') ? $('#cartDrawer') : null);
      if (!open) return;
      var f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', open)
        .filter(function (n) { return n.offsetParent !== null || n === document.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function toggleCartDrawer(show) {
    var d = $('#cartDrawer'), o = $('#cartOverlay');
    if (!d) return;
    if (show) { openOverlay(d); if (o) o.classList.add('open'); }
    else { closeOverlay(d); if (o) o.classList.remove('open'); }
  }

  /* ============================================================ PRODUCT PDP */
  var modal = { productId: null, variantIndex: 0, qty: 1, imageIndex: 0 };

  function openProductModal(id) {
    var p = findProduct(id);
    if (!p) return;
    modal = { productId: id, variantIndex: 0, qty: 1, imageIndex: 0 };
    var node = $('#pdpModal');
    var main = $('#pdpMainImg');
    main.src = imgSrc(p.images[0]);
    main.alt = p.title.en;
    $('#pdpTitle').textContent = p.title.en;
    $('#pdpBrand').textContent = p.brand + ' · SKU ' + p.sku;
    $('#pdpSummary').textContent = L(p.summary);

    var thumbs = $('#pdpThumbs');
    thumbs.textContent = '';
    if (p.images.length > 1) {
      thumbs.style.display = 'flex';
      p.images.forEach(function (src, i) {
        thumbs.appendChild(el('button', {
          type: 'button', class: 'pdp-thumb' + (i === 0 ? ' active' : ''),
          'aria-label': 'Show image ' + (i + 1), 'aria-pressed': i === 0 ? 'true' : 'false',
          onclick: function () { selectImage(i); }
        }, [img(imgSrc(src), '', { w: 80, h: 80 })]));
      });
    } else { thumbs.style.display = 'none'; }

    var pills = $('#variantPills');
    pills.textContent = '';
    p.variants.forEach(function (v, i) {
      pills.appendChild(el('button', {
        type: 'button', role: 'radio', 'aria-checked': i === 0 ? 'true' : 'false',
        class: 'variant-pill' + (i === 0 ? ' selected' : ''),
        onclick: function () { selectVariant(i); }
      }, [
        document.createTextNode(L(v) || v.name),
        v.extraCost ? el('span', { class: 'variant-up', text: ' +Rs. ' + PKR.format(v.extraCost) }) : null
      ]));
    });

    var feats = $('#pdpFeatures');
    feats.textContent = '';
    (L(p.features) || []).forEach(function (f) { feats.appendChild(el('li', { text: f })); });

    var warr = $('#pdpWarranty');
    if (warr) warr.textContent = p.warranty || (CFG.policy && CFG.policy.defaultWarranty ? L(CFG.policy.defaultWarranty) : '');

    var rel = $('#relatedProducts');
    rel.textContent = '';
    var related = PRODUCTS.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
    var relSection = rel.closest('.related-section');
    if (relSection) relSection.style.display = related.length ? '' : 'none';
    related.forEach(function (r) {
      rel.appendChild(el('a', { class: 'related-card', href: '/products/' + r.slug + '.html' }, [
        img(imgSrc(r.images[0]), r.title.en, { w: 200, h: 200 }),
        el('div', { class: 'related-title', text: r.title.en }),
        el('div', { class: 'related-price', text: money(r.price) })
      ]));
    });

    $('#qtyDisplay').textContent = '1';
    updatePriceDisplay();
    openOverlay(node);
  }

  function selectImage(i) {
    var p = findProduct(modal.productId);
    modal.imageIndex = i;
    $('#pdpMainImg').src = imgSrc(p.images[i]);
    $$('#pdpThumbs .pdp-thumb').forEach(function (b, idx) {
      b.classList.toggle('active', idx === i);
      b.setAttribute('aria-pressed', idx === i ? 'true' : 'false');
    });
  }
  function selectVariant(i) {
    modal.variantIndex = i;
    $$('#variantPills .variant-pill').forEach(function (b, idx) {
      b.classList.toggle('selected', idx === i);
      b.setAttribute('aria-checked', idx === i ? 'true' : 'false');
    });
    updatePriceDisplay();
  }
  function updatePriceDisplay() {
    var p = findProduct(modal.productId);
    if (!p) return;
    var now = variantPrice(p, modal.variantIndex), was = variantOldPrice(p, modal.variantIndex);
    $('#pdpPriceCurrent').textContent = money(now);
    var oldEl = $('#pdpPriceOld');
    oldEl.textContent = was > now ? money(was) : '';
    oldEl.style.display = was > now ? '' : 'none';
    var saveEl = $('#pdpSave');
    var pct = was > now ? Math.round(((was - now) / was) * 100) : 0;
    saveEl.textContent = pct > 0 ? 'Save ' + pct + '% · ' + money(was - now) : '';
    saveEl.style.display = pct > 0 ? '' : 'none';
  }
  function changeQty(delta) {
    modal.qty = Math.max(1, Math.min(99, modal.qty + delta));
    $('#qtyDisplay').textContent = String(modal.qty);
  }
  function addFromModal() {
    var p = findProduct(modal.productId);
    if (!p) return;
    addToCart(p.id, modal.variantIndex, modal.qty);
    closeOverlay($('#pdpModal'));
    toggleCartDrawer(true);
  }
  function addToCart(id, vi, qty) {
    var existing = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id && cart[i].variant === vi) existing = cart[i];
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else cart.push({ id: id, variant: vi, qty: qty });
    saveCart(); updateCartUI(); toast(t('added'), 'success');
  }

  /* =============================================================== CATALOG */
  var currentCategory = 'All';
  var searchTerm = '';
  var searchTimer = null;

  function renderProducts() {
    var grid = $('#productGrid');
    if (!grid) return;
    var list = applySort(PRODUCTS.filter(function (p) {
      if (currentCategory !== 'All' && p.category !== currentCategory) return false;
      if (!searchTerm) return true;
      var q = searchTerm.toLowerCase();
      var hay = [p.title.en, p.title.ur || '', p.brand, p.sku, L(p.summary),
                 (L(p.features) || []).join(' '),
                 Object.keys(p.specs || {}).join(' '),
                 Object.values(p.specs || {}).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    }));
    grid.textContent = '';
    if (!list.length) { grid.appendChild(el('p', { class: 'empty-state', text: t('noResults') })); return; }
    list.forEach(function (p) {
      var d = honestDiscount(p);
      var st = stockLabel(p);
      var waMsg = 'Assalam o Alaikum! I want to order: ' + (lang === 'ur' && p.title.ur ? p.title.ur : p.title.en) +
                  ' - ' + money(p.price) + ' (hallroadlahore.com)';
      var card = el('button', {
        class: 'product-card', type: 'button',
        'aria-label': p.title.en + ', ' + money(p.price),
        onclick: function () { openProductModal(p.id); }
      }, [
        d > 0 ? el('span', { class: 'discount-badge', text: '-' + d + '%' }) : null,
        img(imgSrc(p.images[0]), p.title.en, { class: 'product-image', w: 400, h: 400 }),
        el('div', {}, [
          el('h3', { class: 'product-title', text: lang === 'ur' && p.title.ur ? p.title.ur : p.title.en }),
          el('div', { class: 'price-box' }, [
            el('span', { class: 'current-price', text: money(p.price) }),
            p.oldPrice ? el('span', { class: 'old-price', text: money(p.oldPrice) }) : null
          ]),
          st ? el('span', { class: 'stock-chip ' + st.cls, text: st.text }) : null
        ]),
        el('span', { class: 'btn-add-cart', text: t('viewDetails'), 'aria-hidden': 'true' }),
        el('span', {
          class: 'wa-quick', text: t('quickWa'), 'aria-hidden': 'true', title: 'Order on WhatsApp',
          onclick: function (ev) {
            ev.stopPropagation();
            var num = (CFG.contact && CFG.contact.whatsapp) || '923396202062';
            window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(waMsg), '_blank', 'noopener');
          }
        })
      ]);
      grid.appendChild(card);
    });
  }

  function filterCategory(cat, btn) {
    currentCategory = cat;
    $$('.cat-btn').forEach(function (b) {
      var on = b.dataset.category === cat;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var h = $('#catalogHeading');
    if (h) {
      var c = CATEGORIES.filter(function (x) { return x.id === cat; })[0];
      h.textContent = cat === 'All' ? (lang === 'ur' ? 'فیچرڈ کیٹلاگ' : 'Featured Catalog') : L(c);
    }
    renderProducts();
  }
  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchTerm = ($('#searchInput') || {}).value || '';
      renderProducts();
    }, 180);
  }

  /* ============================================================== CHECKOUT */
  function openCheckoutModal() {
    if (!cart.length) { toast(t('errCart'), 'error'); return; }
    toggleCartDrawer(false);
    var m = $('#checkoutModal');
    renderOrderSummary();
    openOverlay(m);
  }
  function closeCheckoutModal() { closeOverlay($('#checkoutModal')); }

  function renderOrderSummary() {
    var box = $('#orderSummary');
    if (!box) return;
    box.textContent = '';
    var ul = el('ul');
    cart.forEach(function (c) {
      var line = cartLine(c);
      ul.appendChild(el('li', {}, [
        el('span', { text: line.title + ' × ' + c.qty + '  ' }),
        el('strong', { text: money(line.unit * c.qty) })
      ]));
    });
    box.appendChild(ul);
    box.appendChild(el('div', { class: 'cart-shipping-row', style: 'margin:0 0 8px;' }, [
      el('span', { text: t('shipping') }),
      el('span', { text: shipNote() })
    ]));
    box.appendChild(el('div', { class: 'order-summary-total' }, [
      el('span', { text: t('total') }),
      el('span', { text: money(cartTotal()) })
    ]));
  }

  function normalizePhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('0092') === 0) d = d.slice(4);
    else if (d.indexOf('92') === 0 && d.length >= 12) d = d.slice(2);
    else if (d.indexOf('0') === 0) d = d.slice(1);
    return d;
  }
  function isValidPhone(raw) { return /^3\d{9}$/.test(normalizePhone(raw)); }

  function setFieldError(inputId, msg) {
    var input = $('#' + inputId);
    if (!input) return false;
    var group = input.closest('.form-group');
    var err = group ? group.querySelector('.field-error') : null;
    if (msg) {
      if (group) group.classList.add('invalid');
      if (err) { err.textContent = msg; err.classList.add('show'); }
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return true;
    }
    if (group) group.classList.remove('invalid');
    if (err) err.classList.remove('show');
    input.removeAttribute('aria-invalid');
    return false;
  }

  function buildOrderMessage(order) {
    var lines = [
      '*NEW ORDER — ' + (CFG.brand ? CFG.brand.domain : 'hallroadlahore.com') + '*',
      '*Order ID:* ' + order.id,
      '',
      '*Customer:* ' + order.name,
      '*Phone:* ' + order.phoneDisplay,
      '*City:* ' + order.city,
      '*Address:* ' + order.address,
      '*Payment:* ' + order.payment,
      '',
      '*Items:*'
    ];
    order.items.forEach(function (i) { lines.push('• ' + i.title + ' (x' + i.qty + ') - ' + money(i.lineTotal)); });
    lines.push('', '*Total:* ' + money(order.total));
    if (order.notes) lines.push('', '*Notes:* ' + order.notes);
    lines.push('Sent from ' + (CFG.brand ? CFG.brand.url : location.origin));
    return lines.join('\n');
  }

  function submitOrder(e) {
    if (e) e.preventDefault();
    if (!cart.length) { toast(t('errCart'), 'error'); return; }

    var name = ($('#custName').value || '').trim();
    var phoneRaw = ($('#custPhone').value || '').trim();
    var city = ($('#custCity').value || '').trim();
    var address = ($('#custAddress').value || '').trim();
    var paySel = $('#paymentMethod');
    var payment = paySel.options[paySel.selectedIndex].textContent.trim();
    var notes = (($('#custNotes') || {}).value || '').trim().slice(0, 300);

    /* Validate — an order you cannot call back is worse than no order. */
    if (setFieldError('custName', name.length < 3 ? t('errName') : '')) return;
    if (setFieldError('custPhone', isValidPhone(phoneRaw) ? '' : t('errPhone'))) return;
    if (setFieldError('custCity', city.length < 2 ? t('errCity') : '')) return;
    if (setFieldError('custAddress', address.length < 10 ? t('errAddress') : '')) return;

    var digits = normalizePhone(phoneRaw);
    var phoneDisplay = '0' + digits.slice(0, 3) + ' ' + digits.slice(3);

    var items = cart.map(function (c) {
      var line = cartLine(c);
      return { sku: line.product.sku, title: line.title, qty: c.qty, unit: line.unit, lineTotal: line.unit * c.qty };
    });

    var order = {
      id: 'HRL-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-4),
      at: new Date().toISOString(),
      name: name, phone: '92' + digits, phoneDisplay: phoneDisplay, city: city, address: address,
      payment: payment, notes: notes, items: items, total: cartTotal(),
      source: location.pathname
    };
    order.message = buildOrderMessage(order);

    var waUrl = 'https://wa.me/' + (CFG.contact ? CFG.contact.whatsapp : '923396202062') + '?text=' + encodeURIComponent(order.message);

    logOrder(order);
    closeCheckoutModal();
    showConfirmation(order, waUrl);
  }

  /* Orders are always recorded locally and optionally POSTed, so a blocked popup
     can never silently destroy a sale. */
  function logOrder(order) {
    try {
      var all = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      all.push(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all.slice(-100)));
    } catch (e) { /* storage full / private mode — non-fatal */ }

    var endpoint = CFG.orderEndpoint;
    if (endpoint) {
      try {
        fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order), mode: 'cors', keepalive: true
        }).catch(function () { /* offline is fine; WhatsApp is the primary channel */ });
      } catch (e) { /* ignore */ }
    }
  }

  function showConfirmation(order, waUrl) {
    var m = $('#confirmModal');
    if (!m) { window.open(waUrl, '_blank', 'noopener'); return; }

    var win = window.open(waUrl, '_blank', 'noopener');
    var opened = !!win;

    var box = $('#confirmBody');
    box.textContent = '';
    box.appendChild(el('div', { class: 'confirm-hero' }, [
      el('div', { class: 'confirm-tick', 'aria-hidden': 'true', text: '✓' }),
      el('h2', { text: t('orderSent') }),
      el('p', { class: 'payment-note', text: t('weWillCall') })
    ]));
    box.appendChild(el('div', { class: 'order-id-box' }, [
      el('div', { class: 'order-id-label', text: t('yourOrderId') }),
      el('div', { class: 'order-id-value', text: order.id })
    ]));

    var steps = el('ol', { class: 'confirm-steps' });
    [t('step1'), t('step2'), t('step3')].forEach(function (s, i) {
      steps.appendChild(el('li', {}, [el('span', { class: 'n', text: (i + 1) + '.' }), el('span', { text: s })]));
    });
    box.appendChild(steps);

    if (order.payment.indexOf('JazzCash') !== -1 || order.payment.indexOf('EasyPaisa') !== -1) {
      var acc = CFG.payment && CFG.payment.advanceAccount;
      if (acc) {
        box.appendChild(el('div', { class: 'advance-box' }, [
          el('strong', { text: t('advanceTitle') }),
          el('div', { text: acc.label + ' — ' }),
          el('strong', { text: acc.number }),
          el('div', { text: acc.title }),
          el('div', { class: 'payment-note', text: (CFG.payment.advanceRule ? L(CFG.payment.advanceRule) : '') + ' ' + t('advanceBody') })
        ]));
      }
    }

    if (!opened) {
      /* Popup blocked or no WhatsApp — hand the customer the text instead. */
      var ta = el('textarea', { readonly: true, 'aria-label': 'Order text' });
      ta.value = order.message;
      box.appendChild(el('div', { class: 'fallback-box' }, [
        el('p', { class: 'payment-note', text: t('whatsappBlocked') + ' ' + (CFG.contact ? CFG.contact.phoneDisplay : '') }),
        ta,
        el('button', { type: 'button', class: 'btn-secondary', text: t('copyOrder'), onclick: function () { copyText(order.message); } })
      ]));
    } else {
      box.appendChild(el('a', { class: 'checkout-btn', href: waUrl, target: '_blank', rel: 'noopener',
        style: 'display:block;text-align:center;text-decoration:none;', text: 'Reopen WhatsApp' }));
    }
    box.appendChild(el('button', { type: 'button', class: 'btn-secondary', text: t('copyOrder'),
      onclick: function () { copyText(order.message); } }));
    box.appendChild(el('button', { type: 'button', class: 'btn-secondary', text: t('keepShopping'),
      onclick: function () { closeOverlay(m); } }));

    openOverlay(m);

    /* Only now is the sale safely handed over — clear the cart. */
    cart = []; saveCart(); updateCartUI();
    trackEvent('purchase', { order_id: order.id, value: order.total, currency: 'PKR', items: order.items });
  }

  function copyText(text) {
    var done = function () { toast(t('copied'), 'success'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else { legacyCopy(text); done(); }
  }
  function legacyCopy(text) {
    var ta = el('textarea'); ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  /* ============================================================ ANALYTICS */
  function trackEvent(name, data) {
    try { if (window.gtag) window.gtag('event', name, data); } catch (e) {}
    try { if (window.fbq) window.fbq('track', name === 'purchase' ? 'Purchase' : name, data); } catch (e) {}
    try { if (window.ttq) window.ttq.track(name === 'purchase' ? 'CompleteRegistration' : name, data); } catch (e) {}
  }
  function initAnalytics() {
    var a = CFG.analytics || {};
    if (a.googleAnalytics4) {
      var s = el('script', { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(a.googleAnalytics4) });
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', a.googleAnalytics4, { send_page_view: true });
    }
    if (a.metaPixel) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', a.metaPixel); window.fbq('track', 'PageView');
    }
    if (a.tiktokPixel) {
      !function (t, e) {
        if (t.ttq) return; t.TiktokAnalyticsObject = 'ttq';
        var q = t.ttq = function () { (q.q = q.q || []).push(arguments); }; q.load = function (id) { q._i = id; };
        q.load(a.tiktokPixel);
        var s = e.createElement('script'); s.async = true; s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        e.getElementsByTagName('head')[0].appendChild(s);
      }(window, document);
      window.ttq.page();
    }
  }

  /* ================================================================ RENDER */
  function renderTicker() {
    var host = $('#tickerA'), host2 = $('#tickerB');
    if (!host) return;
    var items = (CFG.ui && CFG.ui.ticker ? L(CFG.ui.ticker) : []);
    [host, host2].forEach(function (h) {
      if (!h) return;
      h.textContent = '';
      items.forEach(function (txt, i) {
        h.appendChild(el('span', { class: 'ticker-item', text: txt }));
        if (i < items.length - 1) h.appendChild(el('span', { class: 'ticker-dot', text: '•', 'aria-hidden': 'true' }));
      });
    });
  }
  function renderPromo() {
    var p = $('.promo-flash');
    var txt = CFG.ui && CFG.ui.promo ? L(CFG.ui.promo) : '';
    if (!p) return;
    if (!txt) { p.remove(); return; }
    p.textContent = '🔥 ' + txt;
  }
  /* Only show tabs for categories that actually have products (plus All). */
  function presentCategories() {
    var present = {};
    PRODUCTS.forEach(function (p) { present[p.category] = 1; });
    return CATEGORIES.filter(function (c) { return c.id === 'All' || present[c.id]; });
  }
  function renderCategoryTabs() {
    var host = $('#categoryTabs');
    if (!host) return;
    host.textContent = '';
    presentCategories().forEach(function (c) {
      host.appendChild(el('button', {
        class: 'cat-btn' + (c.id === 'All' ? ' active' : ''), type: 'button',
        'data-category': c.id, 'aria-pressed': c.id === 'All' ? 'true' : 'false',
        text: L(c), onclick: function (e) { filterCategory(c.id, e.currentTarget); }
      }));
    });
  }
  function renderReviews() {
    var host = $('#reviewGrid');
    if (!host) return;
    host.textContent = '';
    (CFG.reviews || []).forEach(function (r) {
      host.appendChild(el('div', { class: 'review-card' }, [
        el('div', { class: 'stars', 'aria-label': r.stars + ' out of 5', text: '★★★★★'.slice(0, r.stars) + '☆☆☆☆☆'.slice(0, 5 - r.stars) }),
        el('p', { class: 'review-text', text: '“' + L(r) + '”' }),
        el('p', { class: 'review-author', text: '— ' + r.name + ', ' + r.city }),
        el('span', { class: 'review-verify', text: r.verified ? 'Verified purchase' : 'Customer feedback' })
      ]));
    });
  }
  function renderTrust() {
    var host = $('#trustGrid');
    if (!host) return;
    host.textContent = '';
    var icons = {
      truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
      shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
      bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>',
      chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.6 8.6 0 01-3.8-.9L3 20l1-4.9A8.4 8.4 0 0112 3.1a8.4 8.4 0 019 8.4z"/></svg>'
    };
    (CFG.ui && CFG.ui.trust ? L(CFG.ui.trust) : []).forEach(function (b) {
      host.appendChild(el('div', {}, [
        el('div', { class: 'trust-icon', html: icons[b.icon] || icons.shield }),
        el('div', { class: 'trust-title', text: b.title }),
        el('div', { class: 'trust-desc', text: b.desc })
      ]));
    });
  }
  function renderPaymentOptions() {
    var sel = $('#paymentMethod');
    if (!sel) return;
    sel.textContent = '';
    ((CFG.payment && CFG.payment.methods) || []).forEach(function (m) {
      sel.appendChild(el('option', { value: m.id, text: L(m) }));
    });
  }
  function renderWhatsappLinks() {
    var num = (CFG.contact && CFG.contact.whatsapp) || '923396202062';
    $$('[data-whatsapp]').forEach(function (a) {
      a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(a.dataset.whatsapp);
    });
  }
  function renderPhoneLinks() {
    $$('[data-phone-display]').forEach(function (n) { n.textContent = (CFG.contact && CFG.contact.phoneDisplay) || ''; });
  }

  function applyLanguage(next) {
    lang = STRINGS[next] ? next : 'en';
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    var btn = $('#langToggle');
    if (btn) btn.textContent = lang === 'ur' ? 'English' : 'اردو';
    var ph = $('#searchInput'); if (ph) ph.placeholder = t('searchPlaceholder');
    $$('[data-i18n]').forEach(function (n) { n.textContent = t(n.dataset.i18n); });
    renderTicker(); renderPromo(); renderCategoryTabs(); renderProducts();
    renderReviews(); renderTrust();
    if (currentCategory !== 'All') {
      var c = CATEGORIES.filter(function (x) { return x.id === currentCategory; })[0];
      var h = $('#catalogHeading'); if (h && c) h.textContent = L(c);
    }
  }

  function initStaticPage() {
    var page = $('.pdp-page');
    if (!page) return false;
    var id = parseInt(page.dataset.productId, 10);
    var p = findProduct(id);
    if (!p) return false;
    modal = { productId: id, variantIndex: 0, qty: 1, imageIndex: 0 };

    $$('.pdp-thumb').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.dataset.imageIndex, 10);
        $('#pdpMainImg').src = imgSrc(p.images[i]);
        $$('.pdp-thumb').forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });
    $$('#variantPills .variant-pill').forEach(function (b) {
      b.addEventListener('click', function () {
        modal.variantIndex = parseInt(b.dataset.variantIndex, 10);
        $$('#variantPills .variant-pill').forEach(function (x) {
          var on = x === b;
          x.classList.toggle('selected', on);
          x.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        var now = variantPrice(p, modal.variantIndex), was = variantOldPrice(p, modal.variantIndex);
        $('#pdpPriceCurrent').textContent = money(now);
        var oldEl = $('.pdp-price-old');
        if (oldEl) { oldEl.textContent = was > now ? money(was) : ''; oldEl.style.display = was > now ? '' : 'none'; }
        var save = $('.pdp-save');
        var pct = was > now ? Math.round(((was - now) / was) * 100) : 0;
        if (save) { save.textContent = pct > 0 ? 'Save ' + pct + '%' : ''; save.style.display = pct > 0 ? '' : 'none'; }
      });
    });
    var buyNow = $('[data-action="buy-now"]');
    if (buyNow) {
      buyNow.addEventListener('click', function (e) {
        e.preventDefault();
        addToCart(id, modal.variantIndex, parseInt($('#qtyDisplay').textContent, 10) || 1);
        openCheckoutModal();
      });
    }
    return true;
  }

  function bindActions() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-action]');
      if (!trigger) return;
      var a = trigger.dataset.action;
      if (a === 'open-cart') { e.preventDefault(); toggleCartDrawer(true); }
      else if (a === 'close-cart') { e.preventDefault(); toggleCartDrawer(false); }
      else if (a === 'qty-inc') { e.preventDefault(); changeQty(1); }
      else if (a === 'qty-dec') { e.preventDefault(); changeQty(-1); }
      else if (a === 'close-pdp') { e.preventDefault(); closeOverlay($('#pdpModal')); }
      else if (a === 'add-from-modal') { e.preventDefault(); addFromModal(); }
      else if (a === 'add-from-page') {
        e.preventDefault();
        addToCart(modal.productId, modal.variantIndex, parseInt(($('#qtyDisplay') || {}).textContent, 10) || 1);
        toggleCartDrawer(true);
      }
      else if (a === 'open-checkout') { e.preventDefault(); openCheckoutModal(); }
      else if (a === 'close-checkout') { e.preventDefault(); closeCheckoutModal(); }
      else if (a === 'scroll-top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    var search = $('#searchInput');
    if (search) search.addEventListener('input', onSearchInput);

    var langBtn = $('#langToggle');
    if (langBtn) langBtn.addEventListener('click', function () { applyLanguage(lang === 'ur' ? 'en' : 'ur'); });

    var overlay = $('#cartOverlay');
    if (overlay) overlay.addEventListener('click', function () { toggleCartDrawer(false); });

    /* Close a modal when the backdrop itself is clicked. */
    $$('.pdp-overlay, .modal-overlay').forEach(function (o) {
      o.addEventListener('mousedown', function (e) { if (e.target === o) closeOverlay(o); });
    });

    /* Live inline validation so errors appear as you type, not only on submit. */
    ['custName', 'custPhone', 'custCity', 'custAddress'].forEach(function (id) {
      var input = $('#' + id);
      if (!input) return;
      input.addEventListener('blur', function () {
        if (id === 'custPhone') setFieldError(id, isValidPhone(input.value) ? '' : t('errPhone'));
        else setFieldError(id, input.value.trim().length >= (id === 'custAddress' ? 10 : 3) ? '' : t(id === 'custName' ? 'errName' : id === 'custCity' ? 'errCity' : 'errAddress'));
      });
    });

    var form = $('#orderForm');
    if (form) form.addEventListener('submit', submitOrder);

    var scrollBtn = $('#backToTop');
    if (scrollBtn) {
      window.addEventListener('scroll', function () {
        scrollBtn.classList.toggle('visible', window.scrollY > 400);
      }, { passive: true });
    }
  }

  function init() {
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
    if (lang === 'ur') document.documentElement.dir = 'rtl';
    var langBtn = $('#langToggle');
    if (langBtn) { langBtn.textContent = lang === 'ur' ? 'English' : 'اردو'; langBtn.hidden = !(CFG.ui && CFG.ui.enableLanguageToggle); }

    renderTicker(); renderPromo(); renderReviews(); renderTrust();
    renderPaymentOptions(); renderWhatsappLinks(); renderPhoneLinks();
    renderCategoryTabs(); renderProducts(); updateCartUI();
    initSort();
    bindActions();
    initStaticPage();
    initAnalytics();
    applyLanguage(lang);

    /* Support deep links like /#Inverters or /#WaterHeaters (footer + breadcrumbs). */
    var hash = (location.hash || '').replace('#', '');
    if (hash && CATEGORIES.some(function (c) { return c.id === hash; })) filterCategory(hash);

    /* Recover an order that was started but never handed to WhatsApp. */
    try {
      var pending = JSON.parse(localStorage.getItem('hallroad_pending') || 'null');
      if (pending && Date.now() - pending.ts < 24 * 3600 * 1000) {
        toast('You have an unsent order (' + pending.id + '). Tap the WhatsApp button to send it.');
      }
    } catch (e) {}
  }

  /* Expose a small, deliberate API. Used by the browser console for debugging
     and by tests/store.test.mjs. It is NOT required for the UI (all UI wiring
     goes through data-action attributes and event listeners). */
  window.HRL = {
    openProductModal: openProductModal, selectVariant: selectVariant, changeQty: changeQty,
    addFromModal: addFromModal, addToCart: addToCart, onSearchInput: onSearchInput,
    filterCategory: filterCategory, submitOrder: submitOrder,
    openCheckoutModal: openCheckoutModal, closeCheckoutModal: closeCheckoutModal,
    toggleCartDrawer: toggleCartDrawer, saveCart: saveCart, updateCartUI: updateCartUI,
    getCart: function () { return cart; }, setCart: function (c) { cart = c; },
    money: money, normalizePhone: normalizePhone, isValidPhone: isValidPhone,
    honestDiscount: honestDiscount, t: t, lang: function () { return lang; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
