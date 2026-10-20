# Broker subdomains (`<slug>.moneyshop.ro`)

Every broker gets `<slug>.moneyshop.ro` automatically. Nothing is added in Cloudflare per broker:
a wildcard DNS record sends every subdomain to this Worker, the Worker serves the same web app,
and the app reads the broker slug from the hostname.

Azure Static Web Apps rejects hostnames it doesn't know (404), so the Worker fetches the app
from the Static Web App's own `*.azurestaticapps.net` host instead.

## One-time setup

1. **DNS** (Cloudflare dashboard → moneyshop.ro → DNS → Add record):
   - Type `AAAA`, Name `*`, IPv6 `100::`, **Proxied** (orange cloud).
   - `100::` is a placeholder; proxied traffic never reaches it because the Worker answers first.
   - Existing DNS records (`moneyshop.ro`, `www`) keep priority over the wildcard for DNS.
2. **Worker** (from this folder):
   ```bash
   npx wrangler login
   npx wrangler deploy
   ```

Cloudflare's free Universal SSL certificate already covers `*.moneyshop.ro`, so HTTPS works
for every subdomain with no certificate step.

## Notes

- `www.moneyshop.ro` redirects (301) to `moneyshop.ro`: it has no DNS record of its own, so without
  the redirect it would hit the wildcard placeholder and fail with 522.
- The Worker route `*.moneyshop.ro/*` catches **every proxied subdomain**. Other reserved names (`api`,
  `admin`, `status`, … — the same list the API refuses as broker slugs) pass straight through
  to their own DNS record. A new proxied subdomain outside that list must be added to `PASS_THROUGH`
  in `worker.js` (and to the API/web reserved lists) or it will serve the web app.
- Unknown slugs are handled by the app (it shows a "broker not found" page).
- Free Workers plan: 100,000 requests/day.
