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
  createdAt: string;
}

export const CANCELLED_STATUS = 'Anulat';
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

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
