const PASS_THROUGH = new Set(['www', 'api', 'admin', 'app', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'cdn', 'static', 'assets', 'broker', 'brokers', 'auth', 'login', 'logout', 'register', 'dashboard', 'staging', 'dev', 'test', 'moneyshop', 'support', 'help', 'blog', 'status', 'acord', 'docs', 'm', 'mobile', 'ns1', 'ns2', 'webmail', 'portal', 'crm', 'public', 'media', 'files', 'img', 'images', 'email', 'beta', 'demo']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const label = url.hostname.slice(0, -(env.ROOT_DOMAIN.length + 1));

    if (!label || PASS_THROUGH.has(label)) {
      return fetch(request);
    }

    const upstream = new URL(url.pathname + url.search, `https://${env.ORIGIN_HOST}`);
    const response = await fetch(new Request(upstream, request), { redirect: 'manual' });

    const headers = new Headers(response.headers);
    headers.set('X-MoneyShop-Broker', label);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
