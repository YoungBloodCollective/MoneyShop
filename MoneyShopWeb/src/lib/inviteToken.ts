const LINKS = {
  invite: { path: '/broker/invitatie', key: 'moneyshop:invite-token' },
  referral: { path: '/colaborare', key: 'moneyshop:referral-token' },
} as const;

type LinkKind = keyof typeof LINKS;

const memory: Record<LinkKind, string> = { invite: '', referral: '' };

/**
 * Personal links carry their token in the fragment (or, for old links, the query). It is moved to
 * sessionStorage and stripped from the address bar before analytics can read the page URL.
 */
export function captureLinkTokens(): void {
  const path = window.location.pathname.replace(/\/+$/, '');
  const kind = (Object.keys(LINKS) as LinkKind[]).find(k => LINKS[k].path === path);
  if (!kind) return;
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('t');
  const query = new URLSearchParams(window.location.search);
  const token = fromHash || query.get('t');
  if (!token) return;
  memory[kind] = token;
  try {
    sessionStorage.setItem(LINKS[kind].key, token);
  } catch {
    // storage unavailable: the in-memory copy still covers this page load
  }
  query.delete('t');
  const search = query.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
}

function read(kind: LinkKind): string {
  try {
    return sessionStorage.getItem(LINKS[kind].key) || memory[kind];
  } catch {
    return memory[kind];
  }
}

function clear(kind: LinkKind): void {
  memory[kind] = '';
  try {
    sessionStorage.removeItem(LINKS[kind].key);
  } catch {
    // nothing to clear
  }
}

export const readInviteToken = () => read('invite');
export const clearInviteToken = () => clear('invite');
export const readReferralToken = () => read('referral');
export const clearReferralToken = () => clear('referral');
