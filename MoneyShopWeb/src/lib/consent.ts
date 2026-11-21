// Cookie consent. Google Ads (gtag.js, conversion tracking, enhanced conversions) loads only after the
// visitor accepts marketing cookies; until then nothing from Google is requested. The choice is kept
// in this browser and can be changed at any time from "Setări cookie-uri" (openCookieSettings).

const STORAGE_KEY = 'ms_cookie_consent';
const CONSENT_VERSION = 1;
const ADS_ID = 'AW-18083608146';
export const OPEN_SETTINGS_EVENT = 'ms:open-cookie-settings';

export interface ConsentChoice {
  v: number;
  marketing: boolean;
  at: string;
}

type Gtag = (...args: unknown[]) => void;
type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag };

export function readConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentChoice;
    return parsed?.v === CONSENT_VERSION && typeof parsed.marketing === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(marketing: boolean): ConsentChoice {
  const choice: ConsentChoice = { v: CONSENT_VERSION, marketing, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Private mode or blocked storage: the choice still applies to this visit.
  }
  applyConsent(marketing);
  return choice;
}

let loaded = false;

/** Loads Google Ads after consent; withdrawing consent stops further use and clears Google's cookies. */
export function applyConsent(marketing: boolean): void {
  const w = window as GtagWindow;
  if (!marketing) {
    if (w.gtag) w.gtag('consent', 'update', deniedState());
    clearGoogleCookies();
    return;
  }
  if (loaded) {
    w.gtag?.('consent', 'update', grantedState());
    return;
  }
  // The gtag() stub and the "everything denied" default are defined in index.html (no network there).
  if (!w.gtag) return;
  loaded = true;
  w.gtag('consent', 'update', grantedState());
  w.gtag('js', new Date());
  w.gtag('config', ADS_ID, { allow_enhanced_conversions: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`;
  document.head.appendChild(script);
}

/** Applies a choice saved on an earlier visit. Call once at startup. */
export function initConsent(): void {
  const choice = readConsent();
  if (choice?.marketing) applyConsent(true);
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

function grantedState() {
  return { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' };
}

function deniedState() {
  return { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
}

function clearGoogleCookies(): void {
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !/^(_gcl_|_ga|_gid|_gat|IDE|test_cookie)/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}
