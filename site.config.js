/* =============================================================================
 * SITE CONFIG — Business settings for G Power & Electronics (hallroadlahore.com)
 * ========================================================================== */
window.SITE_CONFIG = {

  /* ---------- BUSINESS ---------- */
  brand: {
    name: "Hall Road Lahore",
    domain: "hallroadlahore.com",
    url: "https://hallroadlahore.com",
    tagline: {
      en: "G Power & Electronics — Direct from Hall Road, Lahore",
      ur: "جی پاور اینڈ الیکٹرانکس — براہ راست ہال روڈ، لاہور سے"
    },
    legalName: "G Power & Electronics",
    shopAddress: "Shop No. 1, Sarwar Centre, Hall Road, Lahore",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Sarwar+Centre+Hall+Road+Lahore",
    registration: "",
    address: {
      en: "G Power & Electronics, Shop No. 1, Sarwar Centre, Hall Road, Lahore, Punjab, Pakistan",
      ur: "جی پاور اینڈ الیکٹرانکس، شاپ نمبر 1، سرور سینٹر، ہال روڈ، لاہور، پنجاب، پاکستان"
    }
  },

  /* ---------- CONTACT ---------- */
  contact: {
    whatsapp: "923396202062",
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
    advanceAccount: { label: "JazzCash / EasyPaisa", number: "03138085023", title: "G Power & Electronics (Hall Road Lahore)" },
    advanceRule: { en: "Send 30% advance to confirm the order; the rest is paid on delivery.",
                   ur: "آرڈر کنفرم کرنے کے لیے 30% ایڈوانس بھیجیں، باقی ڈیلیوری پر۔" }
  },

  /* ---------- SHIPPING ---------- */
  shipping: {
    freeShipping: false,
    rates: [
      { id: "lahore", en: "Lahore (same day / next day)", ur: "لاہور (سیم ڈے / نیکسٹ ڈے)",       fee: 150 },
      { id: "punjab", en: "Punjab (other cities)",        ur: "پنجاب (دیگر شہر)",               fee: 200 },
      { id: "other",  en: "Sindh / KPK / Balochistan",    ur: "سندھ / کے پی کے / بلوچستان",      fee: 250 },
      { id: "north",  en: "AJK / Gilgit-Baltistan",       ur: "آزاد کشمیر / گلگت بلتستان",       fee: 350 }
    ],
    processing: { en: "Dispatched within 24 hours (Mon-Sat)", ur: "24 گھنٹوں میں ڈسپیچ" },
    delivery:   { en: "2-5 working days nationwide",          ur: "2-5 کاروباری دن" }
  },

  /* ---------- POLICIES ---------- */
  policy: {
    defaultWarranty: { en: "14 days shop replacement warranty", ur: "14 دن شاپ ریپلیسمنٹ وارنٹی" },
    returnWindowDays: 7,
    returnShipping: {
      defective: { en: "We pay return shipping on manufacturing defects.", ur: "مینوفیکچرنگ نقص پر واپسی کی ڈیلیوری ہم ادا کرتے ہیں۔" },
      changeOfMind: { en: "Customer pays return shipping for change of mind. Item must be unused and in original packaging.",
                      ur: "پسند نہ آنے کی صورت میں واپسی کی ڈیلیوری کسٹمر ادا کرے گا۔ آئٹم استعمال شدہ نہ ہو۔" }
    },
    refundMethod: { en: "Refunds are sent via JazzCash / EasyPaisa or bank transfer within 7 working days of receiving the returned item.",
                    ur: "رقم واپسی آئٹم موصول ہونے کے 7 کاروباری دنوں میں جاز کیش / ایزی پیسا یا بینک ٹرانسفر سے کی جاتی ہے۔" }
  },

  /* ---------- ORDER PIPELINE ---------- */
  orderEndpoint: "",
  orderEmail: "",

  /* ---------- ANALYTICS ---------- */
  analytics: {
    googleAnalytics4: "",
    metaPixel: "",
    tiktokPixel: ""
  },

  /* ---------- UI ---------- */
  ui: {
    themeColor: "#0f172a",
    defaultLanguage: "en",
    enableLanguageToggle: true,
    promo: {
      en: "HALL ROAD WHOLESALE SALE - Save up to 35% on MPPT Controllers, Inverters & Battery Chargers",
      ur: "ہال روڈ ہول سیل سیل - انورٹرز، ایم پی پی ٹی کنٹرولرز اور بیٹری چارجرز پر %35 تک بچت"
    },
    ticker: {
      en: ["G Power & Electronics — Shop No. 1, Sarwar Centre, Hall Road Lahore", "24-Hour order processing", "2-5 working days delivery", "Mon-Sat 9:00am to 5:00pm", "Cash on Delivery available", "WhatsApp support"],
      ur: ["جی پاور اینڈ الیکٹرانکس — شاپ نمبر 1، سرور سینٹر، ہال روڈ لاہور", "24 گھنٹے میں آرڈر پروسیسنگ", "2-5 کاروباری دن ڈیلیوری", "پیر تا ہفتہ صبح 9 سے شام 5", "کیش آن ڈیلیوری دستیاب", "واٹس ایپ سپورٹ"]
    },
    trust: {
      en: [
        { icon: "truck",   title: "Nationwide COD",      desc: "Pay cash on delivery anywhere in Pakistan." },
        { icon: "shield",  title: "Real Hall Road Shop", desc: "G Power & Electronics, Shop No. 1, Sarwar Centre." },
        { icon: "bolt",    title: "24h Bench-Tested",    desc: "Every unit tested before dispatch within 24 hours." },
        { icon: "chat",    title: "WhatsApp Support",    desc: "Direct help & free solar sizing from our engineers." }
      ],
      ur: [
        { icon: "truck",  title: "ملک بھر میں COD",     desc: "پاکستان میں کہیں بھی ڈیلیوری پر ادائیگی۔" },
        { icon: "shield", title: "اصلی ہال روڈ شاپ",     desc: "جی پاور اینڈ الیکٹرانکس، شاپ نمبر 1، سرور سینٹر۔" },
        { icon: "bolt",   title: "24 گھنٹے میں ڈسپیچ",  desc: "ہر یونٹ چیک کر کے 24 گھنٹوں میں روانہ۔" },
        { icon: "chat",   title: "واٹس ایپ سپورٹ",      desc: "ہال روڈ ٹیم سے براہ راست مشورہ اور رابطہ۔" }
      ]
    }
  },

  /* ---------- REVIEWS ---------- */
  reviews: [
    { name: "Usman A.", city: "Faisalabad", stars: 5, verified: true,
      en: "Bought the Alkaram 3000W inverter from G Power. Delivered to Faisalabad in 2 days on COD and runs fans, lights and TV effortlessly.",
      ur: "جی پاور سے الکرم 3000W انورٹر منگوایا۔ فیصل آباد 2 دن میں COD پر پہنچ گیا اور پنکھے، لائٹس اور ٹی وی بہترین چلا رہا ہے۔" },
    { name: "Ali K.", city: "Karachi", stars: 5, verified: true,
      en: "Ordered the Simtek MPPT Plus 85A controller. Original sealed box with warranty card inside. Received in Karachi in 3 days.",
      ur: "سمٹیک MPPT Plus 85A کنٹرولر آرڈر کیا۔ اوریجنل پیکنگ اور وارنٹی کارڈ کے ساتھ کراچی میں 3 دن میں مل گیا۔" },
    { name: "Rizwan M.", city: "Lahore", stars: 5, verified: true,
      en: "Same day delivery in Lahore for the Simtek 12V 30A smart battery charger. Genuine Hall Road wholesale rate, much cheaper than local market.",
      ur: "لاہور میں سیم ڈے ڈیلیوری پر سمٹیک 12V 30A بیٹری چارجر ملا۔ ہال روڈ کی اصل ہول سیل قیمت، لوکل مارکیٹ سے کافی سستا۔" },
    { name: "Tariq H.", city: "Multan", stars: 5, verified: true,
      en: "Running 3 solar panels directly on the Simko 3.2KW Black Panther PV inverter without battery. Daytime load runs free of cost!",
      ur: "سمکو 3.2KW بلیک پینتھر انورٹر پر بغیر بیٹری کے 3 سولر پینل چلا رہا ہوں۔ دن کا سارا لوڈ بالکل فری چل رہا ہے!" },
    { name: "Kamran S.", city: "Rawalpindi", stars: 5, verified: true,
      en: "The 3000W instant electric water heater tap with shower set is a lifesaver. Heats water in 3 seconds and temperature display is accurate.",
      ur: "3000W انسٹنٹ واٹر ہیٹر ٹیپ بہترین چیز ہے۔ 3 سیکنڈ میں پانی گرم کر دیتا ہے اور ڈسپلے بالکل درست ٹمپریچر دکھاتا ہے۔" },
    { name: "Bilal Z.", city: "Peshawar", stars: 4, verified: true,
      en: "Ordered 20pcs stainless steel solar drain clips (35mm). Snapped onto my Longi panels in 5 minutes—no more mud line at the bottom edge.",
      ur: "اسٹینلیس اسٹیل سولر ڈرین کلپس (35mm) منگوائے۔ 5 منٹ میں پینلز پر لگ گئے، اب بارش کے بعد مٹی جمع نہیں ہوتی۔" }
  ]
};
