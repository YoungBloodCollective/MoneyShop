// Google Ads lead conversion ("Submit lead form"), fired once per successfully created appointment.
// - transaction_id = appointment id, so Google drops duplicates (double submit, retries).
// - user_data feeds enhanced conversions; gtag hashes it (SHA-256) in the browser before sending.

import { readConsent } from './consent';

// ── Google click id (gclid) ──
// Kept with the lead so qualified leads can be reported back to Google Ads from the CRM (offline
// conversion import): Performance Max then learns which clicks became real clients, not just form
// submissions. Read from the landing URL; kept in memory, and saved in this browser (90 days) and sent
// with the lead only after the visitor accepts marketing cookies.
const GCLID_KEY = 'ms_gclid';
const GCLID_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const GCLID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
let gclidFromUrl: string | null = null;

/** Call once at startup: remembers the gclid of the ad click that opened the site, if any. */
export function captureAdClick(): void {
  try {
    const value = new URLSearchParams(window.location.search).get('gclid');
    if (value && GCLID_PATTERN.test(value)) gclidFromUrl = value;
  } catch {
    // No URL access (tests, unusual browsers): nothing to capture.
  }
  persistAdClick();
}

/** Saves the remembered gclid once marketing consent exists (also called when consent is given). */
export function persistAdClick(): void {
  if (!gclidFromUrl || !readConsent()?.marketing) return;
  try {
    window.localStorage.setItem(GCLID_KEY, JSON.stringify({ v: gclidFromUrl, at: Date.now() }));
  } catch {
    // Storage blocked: the in-memory value is still sent with a lead in this visit.
  }
}

/** The gclid to send with a lead, or undefined without marketing consent or without an ad click. */
export function adClickId(): string | undefined {
  if (!readConsent()?.marketing) return undefined;
  if (gclidFromUrl) return gclidFromUrl;
  try {
    const raw = window.localStorage.getItem(GCLID_KEY);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as { v?: string; at?: number };
    if (!saved.v || !GCLID_PATTERN.test(saved.v) || !saved.at || Date.now() - saved.at > GCLID_TTL_MS) return undefined;
    return saved.v;
  } catch {
    return undefined;
  }
}

/** Forgets the gclid (consent withdrawn). */
export function forgetAdClick(): void {
  gclidFromUrl = null;
  try { window.localStorage.removeItem(GCLID_KEY); } catch { /* nothing stored */ }
}

const LEAD_CONVERSION = 'AW-18083608146/HriFCOibyZocENLs965D';

type Gtag = (...args: unknown[]) => void;

export interface LeadConversion {
  appointmentId?: number | string | null;
  email?: string;
  phone?: string;
}

/** Romanian phone to E.164 (+40...), as enhanced conversions expect. Returns undefined if it does not look valid. */
export function toE164Ro(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  if (digits.startsWith('+')) return /^\+\d{8,15}$/.test(digits) ? digits : undefined;
  if (digits.startsWith('40') && digits.length === 11) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 10) return '+40' + digits.slice(1);
  return undefined;
}

export function trackLeadConversion({ appointmentId, email, phone }: LeadConversion): void {
  // Nothing is measured, and no email or phone leaves the browser, without marketing consent.
  if (!readConsent()?.marketing) return;
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  if (!gtag) return;

  const userData: Record<string, string> = {};
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) userData.email = normalizedEmail;
  const normalizedPhone = toE164Ro(phone);
  if (normalizedPhone) userData.phone_number = normalizedPhone;
  if (Object.keys(userData).length > 0) gtag('set', 'user_data', userData);

  gtag('event', 'conversion', {
    send_to: LEAD_CONVERSION,
    value: 1.0,
    currency: 'RON',
    ...(appointmentId != null ? { transaction_id: String(appointmentId) } : {}),
  });
}
