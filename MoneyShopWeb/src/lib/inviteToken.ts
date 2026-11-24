const KEY = 'moneyshop:invite-token';
const INVITE_PATH = '/broker/invitatie';
let memoryToken = '';

export function captureInviteToken(): void {
  if (window.location.pathname.replace(/\/+$/, '') !== INVITE_PATH) return;
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('t');
  const query = new URLSearchParams(window.location.search);
  const token = fromHash || query.get('t');
  if (!token) return;
  memoryToken = token;
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // storage unavailable: the in-memory copy still covers this page load
  }
  query.delete('t');
  const search = query.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
}

export function readInviteToken(): string {
  try {
    return sessionStorage.getItem(KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}

export function clearInviteToken(): void {
  memoryToken = '';
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
