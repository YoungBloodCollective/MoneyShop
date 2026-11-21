export interface Appointment {
  id: number;
  nume: string;
  prenume: string;
  judet: string;
  tipCredit: string;
  salariuNet: number;
  telefon: string;
  email: string;
  status: string;
  notes?: string;
  intarzieriBirou?: string | null;
  popriRecuperare?: string | null;
  brokerProfileId?: number | null;
  /** Start of the call/meeting (ISO, UTC). Null = callback request with no time yet. */
  scheduledAt?: string | null;
  durationMinutes?: number;
  source?: string | null;
  /** Site bookings: when the client confirmed from the email link (null = not yet). */
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
}

export const CANCELLED_STATUS = 'Anulat';
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

/** A time booked on the site that the client has not confirmed from the email yet. */
export const awaitingConfirmation = (a: Pick<Appointment, 'source' | 'confirmedAt' | 'scheduledAt'>) =>
  a.source === 'site' && !!a.scheduledAt && !a.confirmedAt;

/** Monday 00:00 (local time) of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

export function timeRange(a: Pick<Appointment, 'scheduledAt' | 'durationMinutes'>): string {
  if (!a.scheduledAt) return '';
  const start = new Date(a.scheduledAt);
  const end = new Date(start.getTime() + (a.durationMinutes ?? 15) * 60_000);
  return `${fmtTime(start)}–${fmtTime(end)}`;
}

/** yyyy-MM-dd and HH:mm in local time, for <input type="date|time">. */
export function toLocalInputs(iso?: string | null): { date: string; time: string } {
  const d = iso ? new Date(iso) : nextQuarterHour();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Local date + time inputs → ISO UTC string for the API. */
export function fromLocalInputs(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function nextQuarterHour(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15);
  return d;
}

/** Appointment statuses (the server accepts exactly these). */
export const STATUS_OPTIONS = ['Nou', 'Contactat', 'In lucru', 'Trimis Lead', 'BC Probleme', 'DTI', 'Nu se incadreaza', 'Finalizat', 'Anulat'];

const STATUS_LABEL: Record<string, string> = {
  'In lucru': 'În lucru',
  'Nu se incadreaza': 'Nu se încadrează',
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

export const STATUS_PILL: Record<string, string> = {
  Nou: 'bg-sky-50 text-sky-700',
  Contactat: 'bg-amber-50 text-amber-700',
  'In lucru': 'bg-violet-50 text-violet-700',
  'Trimis Lead': 'bg-indigo-50 text-indigo-700',
  'BC Probleme': 'bg-orange-50 text-orange-700',
  DTI: 'bg-yellow-50 text-yellow-700',
  'Nu se incadreaza': 'bg-rose-50 text-rose-700',
  Finalizat: 'bg-emerald-50 text-emerald-700',
  Anulat: 'bg-slate-100 text-slate-600',
};

/** The one-tap results after a call (same keys as POST /appointments/{id}/outcome). */
export const CALL_OUTCOMES = [
  { key: 'answered', label: 'A răspuns', needsTime: false },
  { key: 'moving_on', label: 'Merge mai departe', needsTime: false },
  { key: 'no_answer', label: 'Nu a răspuns', needsTime: false },
  { key: 'callback', label: 'Revin la altă oră', needsTime: true },
  { key: 'not_eligible', label: 'Nu se încadrează', needsTime: false },
  { key: 'not_interested', label: 'Nu e interesat', needsTime: false },
] as const;

export type CallOutcomeKey = typeof CALL_OUTCOMES[number]['key'];

/** Romanian mobile number for wa.me links (407xxxxxxxx), or null. */
export function whatsAppNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('40') && digits.length === 11) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '40' + digits.slice(1);
  if (digits.startsWith('7') && digits.length === 9) return '40' + digits;
  return null;
}

/** Splits "Prenume Nume" (as client names are shown) into the booking form's two fields. */
export function splitClientName(fullName: string): { nume: string; prenume: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nume: parts[0] ?? '', prenume: '' };
  return { nume: parts[parts.length - 1], prenume: parts.slice(0, -1).join(' ') };
}
