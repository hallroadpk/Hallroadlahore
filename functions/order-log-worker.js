/* =============================================================================
 * order-log-worker.js — Cloudflare Worker that receives every order.
 *
 * WHY: your orders currently exist only inside the customer's WhatsApp. If a
 * popup is blocked or the phone dies, the sale is gone. Deploy this Worker and
 * paste its URL into site.config.js -> orderEndpoint, and every order is also
 * saved to Cloudflare KV (free tier is plenty) so you can list and recover them.
 *
 * DEPLOY (5 minutes, free):
 *   1. Sign in to https://dash.cloudflare.com and create a Worker.
 *   2. Paste this file as the Worker code.
 *   3. In the Worker dashboard, Settings -> Variables -> KV namespace bindings,
 *      add a binding named  ORDERS  bound to a new KV namespace.
 *   4. Copy the Worker URL (https://<name>.<sub>.workers.dev) and set it as
 *      window.SITE_CONFIG.orderEndpoint in site.config.js.
 *
 * It also supports ?list=1 (with a secret) to dump recent orders, so you can
 * reconcile abandoned carts.
 * ========================================================================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (request.method === 'GET' && url.pathname === '/ping') {
      return json({ ok: true, at: new Date().toISOString() });
    }

    // List recent orders (protected by a shared secret so it is not public)
    if (request.method === 'GET' && url.pathname === '/orders') {
      const secret = url.searchParams.get('secret');
      if (!env.LIST_SECRET || secret !== env.LIST_SECRET) return json({ error: 'unauthorised' }, 401);
      const keys = await env.ORDERS.list();
      const out = [];
      for (const k of keys.keys.slice(0, 100)) {
        out.push(JSON.parse(await env.ORDERS.get(k.name)));
      }
      return json(out);
    }

    // Receive an order
    if (request.method === 'POST' && url.pathname === '/orders') {
      let order;
      try { order = await request.json(); }
      catch { return json({ error: 'bad json' }, 400); }
      if (!order || !order.id) return json({ error: 'missing id' }, 400);

      const record = {
        id: order.id,
        at: order.at || new Date().toISOString(),
        name: order.name, phone: order.phone, city: order.city,
        total: order.total, payment: order.payment,
        items: order.items, source: order.source || 'site'
      };
      // Key sorts by time so /orders reads newest-first-ish.
      await env.ORDERS.put('ord:' + record.at + ':' + record.id, JSON.stringify(record));
      return json({ ok: true, id: record.id }, 201);
    }

    return json({ error: 'not found' }, 404);
  }
};

function json(o, status) {
  return new Response(JSON.stringify(o), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'   // allow the storefront to POST
    }
  });
}
