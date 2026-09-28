/* =============================================================================
 * SITE CONFIG — the ONLY file you need to edit for business settings.
 * Everything marked "TODO: CONFIRM" needs a real decision from the shop owner.
 * ========================================================================== */
window.SITE_CONFIG = {

  /* ---------- BUSINESS ---------- */
  brand: {
    name: "Hall Road Lahore",
    domain: "hallroadlahore.com",
    url: "https://hallroadlahore.com",
    tagline: {
      en: "Pakistan's Premier Online Store",
      ur: "پاکستان کا پریمیر آن لائن اسٹور"
    },
    /* TODO: CONFIRM — full legal/shop name, registration number (if any), street address.
       Required for trust, for payment-gateway approval, and for Pakistani consumer law. */
    legalName: "Hall Road Lahore",
    registration: "",
    address: {
      en: "Hall Road, Lahore, Punjab, Pakistan",
      ur: "ہال روڈ، لاہور، پنجاب، پاکستان"
    }
  },

  /* ---------- CONTACT ---------- */
  contact: {
    /* International format, digits only, no "+" — used for wa.me links */
    whatsapp: "923396202062",
    /* Local display format */
    phoneDisplay: "0339 6202062",
    email: "gpower.pk1@gmail.com",
    tiktok: "https://www.tiktok.com/@gpower.pk",
    hours: {
      en: "Mon-Sat, 9:00am to 5:00pm",
      ur: "پیر تا ہفتہ، صبح 9:00 سے شام 5:00"
    }
  },

  /* ---------- PAYMENTS ---------- */
  payment: {
    methods: [
      { id: "cod",        en: "Cash on Delivery (COD)",            ur: "کیش آن ڈیلیوری" },
      { id: "advance",    en: "JazzCash / EasyPaisa Advance",      ur: "جاز کیش / ایزی پیسا ایڈوانس" }
    ],
    /* Advance-payment account. NOT rendered publicly any more — only shown
       inside the order-confirmation step, after the customer has committed. */
    advanceAccount: { label: "JazzCash / EasyPaisa", number: "03138085023", title: "Hall Road Lahore" },
    /* TODO: CONFIRM — do you ask for full advance or a partial booking amount? */
    advanceRule: { en: "Send 30% advance to confirm the order; the rest is paid on delivery.",
                   ur: "آرڈر کنفرم کرنے کے لیے 30% ایڈوانس بھیجیں، باقی ڈیلیوری پر۔" }
  },

  /* ---------- SHIPPING ----------
     TODO: CONFIRM — the old site claimed "Free Shipping Nationwide" twice, but
     COD in Pakistan normally carries a courier fee. Pick ONE and delete the other.
     Set freeShipping: false and fill the rates if you charge for delivery.        */
  shipping: {
    freeShipping: true,
    /* Used only when freeShipping is false */
    rates: [
      { en: "Lahore (same day / next day)", ur: "لاہور",            fee: 0 },
      { en: "Punjab",                       ur: "پنجاب",            fee: 200 },
      { en: "Sindh / KPK / Balochistan",    ur: "سندھ / کے پی کے",  fee: 250 },
      { en: "AJK / Gilgit-Baltistan",       ur: "آزاد کشمیر / گلگت", fee: 350 }
    ],
    processing: { en: "Dispatched within 24 hours (Mon-Sat)", ur: "24 گھنٹوں میں ڈسپیچ" },
    delivery:   { en: "2-5 working days nationwide",          ur: "2-5 کاروباری دن" }
  },

  /* ---------- POLICIES ----------
     TODO: CONFIRM — these must match what you will actually honour.
     The old site promised "14 Days Warranty" site-wide while a product page
     promised "1 year replacement warranty". Per-product warranty now lives in
     products.json; this block is the shop-wide default and the returns window. */
  policy: {
    /* Shop-wide default when a product has no specific warranty */
    defaultWarranty: { en: "14 days shop replacement warranty", ur: "14 دن شاپ ریپلیسمنٹ وارنٹی" },
    returnWindowDays: 7,
    /* TODO: CONFIRM — who pays return courier when the item is defective vs. not? */
    returnShipping: {
      defective: { en: "We pay return shipping on manufacturing defects.", ur: "مینوفیکچرنگ نقص پر واپسی کی ڈیلیوری ہم ادا کرتے ہیں۔" },
      changeOfMind: { en: "Customer pays return shipping for change of mind. Item must be unused and in original packaging.",
                      ur: "پسند نہ آنے کی صورت میں واپسی کی ڈیلیوری کسٹمر ادا کرے گا۔ آئٹم استعمال شدہ نہ ہو۔" }
    },
    refundMethod: { en: "Refunds are sent via JazzCash / EasyPaisa or bank transfer within 7 working days of receiving the returned item.",
                    ur: "رقم واپسی آئٹم موصول ہونے کے 7 کاروباری دنوں میں جاز کیش / ایزی پیسا یا بینک ٹرانسفر سے کی جاتی ہے۔" }
  },

  /* ---------- ORDER PIPELINE ----------
     Every order is (1) sent to WhatsApp, (2) saved in this browser, and
     (3) POSTed to orderEndpoint if one is configured.
     TODO: DEPLOY — see functions/order-log-worker.js for a free Cloudflare Worker
     you can deploy in 5 minutes, then paste its URL here so you never lose an order. */
  orderEndpoint: "",   // e.g. "https://hallroad-orders.<your-subdomain>.workers.dev/orders"
  orderEmail: "",      // optional: a Worker/Formspree endpoint that emails you each order

  /* ---------- ANALYTICS ----------
     TODO: CONFIRM — paste your real IDs. Leave empty to disable (no script is loaded). */
  analytics: {
    googleAnalytics4: "",   // e.g. "G-XXXXXXXXXX"
    metaPixel: "",          // e.g. "1234567890123456"
    tiktokPixel: ""         // e.g. "CXXXXXXXXXXXXXXXXXXX"
  },

  /* ---------- UI ---------- */
  ui: {
    themeColor: "#0f172a",
    defaultLanguage: "en",          // "en" or "ur"
    enableLanguageToggle: true,
    /* Promo bar. Set text to "" to hide the bar entirely. */
    promo: {
      en: "WINTER SPECIAL SALE - Save on inverters, chargers and solar accessories",
      ur: "ونٹر اسپیشل سیل - انورٹرز، چارجرز اور سولر ایکسیسریز پر بچت"
    },
    /* Marquee items shown in the top ticker */
    ticker: {
      en: ["24-Hour order processing", "2-5 working days delivery", "Mon-Sat 9:00am to 5:00pm",
           "Cash on Delivery available", "WhatsApp support"],
      ur: ["24 گھنٹے میں آرڈر پروسیسنگ", "2-5 کاروباری دن ڈیلیوری", "پیر تا ہفتہ صبح 9 سے شام 5",
           "کیش آن ڈیلیوری دستیاب", "واٹس ایپ سپورٹ"]
    },
    /* Trust badges under the catalog */
    trust: {
      en: [
        { icon: "truck",   title: "Nationwide COD",      desc: "Pay cash on delivery anywhere in Pakistan." },
        { icon: "shield",  title: "Real Warranty",       desc: "Warranty terms shown on every product page." },
        { icon: "bolt",    title: "Fast Dispatch",       desc: "Orders packed and shipped within 24 hours." },
        { icon: "chat",    title: "WhatsApp Support",    desc: "Direct help from our Hall Road team." }
      ],
      ur: [
        { icon: "truck",  title: "ملک بھر میں COD",  desc: "پاکستان میں کہیں بھی ڈیلیوری پر ادائیگی۔" },
        { icon: "shield", title: "اصل وارنٹی",       desc: "ہر پروڈکٹ پر وارنٹی کی شرائط درج ہیں۔" },
        { icon: "bolt",   title: "تیز ڈسپیچ",        desc: "آرڈر 24 گھنٹوں میں بھیجے جاتے ہیں۔" },
        { icon: "chat",   title: "واٹس ایپ سپورٹ",   desc: "ہال روڈ ٹیم سے براہ راست رابطہ۔" }
      ]
    }
  },

  /* ---------- REVIEWS ----------
     The old site had three hardcoded testimonials and showed a fake
     "★★★★☆ (Verified Reviews)" on every product. Set verified:true ONLY for
     reviews you can actually produce evidence for (screenshot of the WhatsApp
     chat, a photo, an order ID). Unverified reviews are labelled as such. */
  reviews: [
    { name: "Usman A.", city: "Faisalabad", stars: 5, verified: false,
      en: "Bought the Alkaram 3000W inverter. Delivered to Faisalabad quickly and it works as described.",
      ur: "الکرم 3000W انورٹر خریدا۔ فیصل آباد جلدی پہنچ گیا اور بتائے مطابق چل رہا ہے۔" },
    { name: "Ali K.", city: "Karachi", stars: 5, verified: false,
      en: "The digital water heater tap works perfectly. Ordered on COD and received it in Karachi in 3 days.",
      ur: "ڈیجیٹل واٹر ہیٹر ٹیپ بالکل ٹھیک چل رہا ہے۔ COD پر آرڈر کیا، کراچی میں 3 دن میں مل گیا۔" },
    { name: "Rizwan M.", city: "Lahore", stars: 4, verified: false,
      en: "Good price for the smart battery charger compared to the local market. Build quality is solid.",
      ur: "سمارٹ بیٹری چارجر کی قیمت مارکیٹ کے مقابلے میں اچھی ہے۔ کوالٹی ٹھیک ہے۔" }
  ]
};
