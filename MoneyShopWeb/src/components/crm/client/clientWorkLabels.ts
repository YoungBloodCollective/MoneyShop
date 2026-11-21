/** Bank stages of a loan file, in the order a file moves through the bank. */
export const BANK_FILE_STAGES: { key: string; label: string; cls: string; color: string }[] = [
  { key: 'TRIMIS', label: 'Trimis', cls: 'bg-sky-50 text-sky-700', color: '#0EA5E9' },
  { key: 'VERIFICARI', label: 'Verificări', cls: 'bg-indigo-50 text-indigo-700', color: '#6366F1' },
  { key: 'ANALIZA', label: 'Analiză', cls: 'bg-amber-50 text-amber-700', color: '#F59E0B' },
  { key: 'COMPLETARI', label: 'Completări', cls: 'bg-orange-50 text-orange-700', color: '#F97316' },
  { key: 'APROBAT_FINANCIAR', label: 'Aprobat financiar', cls: 'bg-teal-50 text-teal-700', color: '#14B8A6' },
  { key: 'APROBAT_FINAL', label: 'Aprobat final', cls: 'bg-emerald-50 text-emerald-700', color: '#10B981' },
  { key: 'DISBURSAT', label: 'Disbursat', cls: 'bg-violet-50 text-violet-700', color: '#6E4CE5' },
  { key: 'RESPINS', label: 'Respins', cls: 'bg-rose-50 text-rose-700', color: '#F43F5E' },
];

export const CLOSED_BANK_STAGES = ['DISBURSAT', 'RESPINS'];

export function bankStage(key?: string | null) {
  return BANK_FILE_STAGES.find(s => s.key === key);
}

/** Labels a broker can put on a client, to filter the client list by them. */
export const CLIENT_TAGS: { key: string; label: string; cls: string }[] = [
  { key: 'PROBLEME_BC', label: 'Probleme BC', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'DE_REVENIT', label: 'De revenit', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'DTI', label: 'DTI', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

export function clientTag(key: string) {
  return CLIENT_TAGS.find(t => t.key === key);
}

export const BANK_SUGGESTIONS = [
  'Banca Transilvania', 'BCR', 'BRD', 'ING Bank', 'Raiffeisen Bank', 'UniCredit Bank',
  'CEC Bank', 'ProCredit Bank', 'Libra Bank', 'Exim Bank', 'Patria Bank', 'Garanti BBVA', 'OTP Bank', 'Alpha Bank',
];

/** "azi, 10:00" / "mâine, 10:00" / "vin. 28 nov., 10:00" in the browser's time zone. */
export function dueLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((day - today) / 86_400_000);
  if (diff === 0) return `azi, ${time}`;
  if (diff === 1) return `mâine, ${time}`;
  if (diff === -1) return `ieri, ${time}`;
  return `${d.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

/** Value for a datetime-local input (local time, no seconds). */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
