// Google Ads lead conversion ("Submit lead form"), fired once per successfully created appointment.
// - transaction_id = appointment id, so Google drops duplicates (double submit, retries).
// - user_data feeds enhanced conversions; gtag hashes it (SHA-256) in the browser before sending.

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
