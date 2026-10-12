# Domain Recovery & Google Indexing Checklist

**Problem (diagnosed 2026-10-12):** `hallroadlahore.com` does not resolve anywhere.
Verisign's `.com` registry returns NXDOMAIN and the WHOIS record shows the domain
status **`client hold`** — set by the registrar **NameSilo** on ~2026-10-08
(domain registered 2026-09-22).

The website itself is healthy: GitHub Pages is built, the HTTPS certificate for
`hallroadlahore.com` + `www` is approved (valid to 2026-12-27), all 86 tests pass,
`robots.txt` and `sitemap.xml` are correct, and every page has canonical tags,
Open Graph tags and Product structured data. **Only the domain is suspended.**

---

## Step 1 — Remove the registrar hold (ONLY YOU CAN DO THIS)

`client hold` on a 15-day-old domain is almost always the mandatory **ICANN WHOIS
contact verification**: NameSilo emails you after registration and if you don't
click the link within 15 days, they must suspend the domain.
(Sept 22 + 15 days = Oct 7–8 — exactly when the hold appeared.)

1. Log in at **namesilo.com** → *Domain Manager* → `hallroadlahore.com`.
2. Look for a red/yellow banner: *"WHOIS contact verification pending"* / *"Domain suspended"*.
3. Search your inbox **and spam folder** for an email from `@namesilo.com`
   (subject like *"Verification required"*). **Click the verification link.**
4. No email / link expired? In the domain manager click **"Resend verification email"**,
   then click the new link when it arrives.
5. If the banner mentions **payment/account verification** instead, or nothing is
   shown, open a support ticket from your NameSilo account and ask:
   *"Why is my domain on clientHold? Please remove the hold."*

The hold is usually lifted within minutes of verifying (allow up to 24 h).

## Step 2 — Check the Cloudflare DNS records (2 minutes)

In the Cloudflare dashboard → zone `hallroadlahore.com` → *DNS*:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | **DNS only** (grey cloud) |
| A | `@` | `185.199.109.153` | **DNS only** |
| A | `@` | `185.199.110.153` | **DNS only** |
| A | `@` | `185.199.111.153` | **DNS only** |
| CNAME | `www` | `hallroadpk.github.io` | **DNS only** |

Orange-cloud proxying must stay **off** for these — GitHub Pages issues its own
TLS certificate and proxied records break it.

## Step 3 — Confirm the site is back

Open `https://hallroadlahore.com` in a browser (try a private window / mobile data).
If DNS was recently fixed it can take a few hours to propagate.

## Step 4 — Get into Google (Google Search Console)

The domain is only weeks old, so it has **no Google history of its own** — the only
thing currently indexed is a leftover German "domain for sale" parking page from the
previous owner (`ww1.hallroadlahore.com`). That disappears automatically once your
real site is live and recrawled.

1. Go to **search.google.com/search-console** → add a **Domain property**:
   `hallroadlahore.com`.
2. Verification method: **DNS record** — copy the `TXT` record Google shows and add
   it in Cloudflare → DNS (leave the default name `@`). Click *Verify* in Search
   Console. (This only works after Step 1 — until the hold is lifted the domain
   can't be verified.)
3. Submit the sitemap: *Sitemaps* → `https://hallroadlahore.com/sitemap.xml` → *Submit*.
4. Speed up the first crawl: *URL Inspection* → enter `https://hallroadlahore.com/`
   → **Request Indexing**. Repeat for 2–3 top products.

## What to expect

| When | What happens |
|---|---|
| Minutes–24 h after verification | Domain resolves; site loads again |
| 1–3 days | Home page appears in Google (`site:hallroadlahore.com`) |
| 1–4 weeks | Product pages and blog posts get indexed |
| Ongoing | Rankings for competitive keywords ("solar inverter price in pakistan") build up over weeks/months for a new domain — keep adding products and blog posts |

## Quick summary (Urdu)

> ویب سائٹ کا کوئی مسئلہ نہیں — ڈومین NameSilo پر **hold** ہے۔
> NameSilo میں لاگ اِن کریں، تصدیقی ای میل (verification) پر کلک کریں،
> ڈومین واپس چلے گا۔ اس کے بعد Google Search Console میں سائٹ اور sitemap جمع کریں۔

---

*Diagnosis details: registrar NameSilo (IANA id 1479); status `client hold`,
`clientTransferProhibited`; nameservers elisa/morgan.ns.cloudflare.com; registered
2026-09-22, last changed 2026-10-08. GitHub Pages repo: hallroadpk/Hallroadlahore.*
