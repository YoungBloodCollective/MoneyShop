const ROOT_DOMAIN = (import.meta.env.VITE_ROOT_DOMAIN as string | undefined) ?? 'moneyshop.ro';
export const ROOT_DOMAIN_NAME = ROOT_DOMAIN;
const RESERVED = new Set(['www', 'api', 'admin', 'app', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'cdn', 'static', 'assets', 'broker', 'brokers', 'auth', 'login', 'logout', 'register', 'dashboard', 'staging', 'dev', 'test', 'moneyshop', 'support', 'help', 'blog', 'status', 'acord', 'docs', 'm', 'mobile', 'ns1', 'ns2', 'webmail', 'portal', 'crm', 'public', 'media', 'files', 'img', 'images', 'email', 'beta', 'demo']);
const DEV_OVERRIDE_KEY = 'moneyshop:broker-slug';

function readDevOverride(): string | null {
  const fromQuery = new URLSearchParams(window.location.search).get('broker');
  try {
    if (fromQuery !== null) {
      if (fromQuery) sessionStorage.setItem(DEV_OVERRIDE_KEY, fromQuery);
      else sessionStorage.removeItem(DEV_OVERRIDE_KEY);
    }
    return fromQuery || sessionStorage.getItem(DEV_OVERRIDE_KEY);
  } catch {
    return fromQuery || null;
  }
}

export function getBrokerSlug(): string | null {
  const host = window.location.hostname.toLowerCase();

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const label = host.slice(0, -(ROOT_DOMAIN.length + 1));
    return label && !label.includes('.') && !RESERVED.has(label) ? label : null;
  }

  if (host === 'localhost' || host === '127.0.0.1') return readDevOverride();
  return null;
}

export function brokerSiteUrl(slug: string): string {
  return `https://${slug}.${ROOT_DOMAIN}`;
}
