import { brokerSiteUrl } from '@/lib/brokerHost';

export const FILE_LABELS: Record<string, string> = {
  id_front: 'Buletin - față',
  id_back: 'Buletin - verso',
  selfie: 'Selfie',
  proof_of_address: 'Dovadă de adresă',
  signature: 'Semnătură',
  signed_agreement: 'Acord MoneyShop semnat',
  mango_agreement: 'Acord Mango Broker semnat',
  procredit_consent: 'Acord GDPR ProCredit Bank semnat',
  bank_consent_procredit: 'Consimțământ ProCredit Bank semnat',
  anaf_income: 'Situație venituri ANAF',
};

export const TIP_ACT_LABELS: Record<string, string> = {
  carte_identitate: 'Carte de identitate',
  carte_identitate_electronica: 'Carte de identitate electronică',
  carte_identitate_simpla: 'Carte de identitate simplă (fără cip)',
};

export const ACORD_STATUS_LABELS: Record<string, string> = {
  started: 'Început',
  documents: 'Documente încărcate',
  signed: 'Semnat',
  completed: 'Finalizat',
  rejected: 'Respins',
};

export const ACORD_STATUS_STYLES: Record<string, string> = {
  started: 'bg-slate-100 text-slate-600',
  documents: 'bg-amber-50 text-amber-700',
  signed: 'bg-sky-50 text-sky-700',
  completed: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

export const BANK_NAMES: Record<string, string> = {
  procredit: 'ProCredit Bank',
  patria: 'Patria Bank',
  ing: 'ING Bank',
  bt: 'Banca Transilvania',
};

export const BANK_DOC_NAMES: Record<string, string> = {
  consimtamant: 'consimțământ',
  anaf: 'acord ANAF',
  'birou-credit': 'informare Birou de Credit',
  gdpr: 'informare GDPR',
  'nota-informare': 'notă de informare',
  recomandare: 'formular de recomandare',
  cerere: 'cerere de credit',
  'cerere-codebitor': 'cerere codebitor',
};

export const BANK_CONSENT_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Trimis, nesemnat', className: 'text-amber-600' },
  signing: { label: 'Se semnează', className: 'text-amber-600' },
  signed: { label: 'Semnat', className: 'text-emerald-600' },
  expired: { label: 'Expirat', className: 'text-slate-400' },
  replaced: { label: 'Înlocuit de un link nou', className: 'text-slate-400' },
};

export function fileLabel(fileType: string) {
  if (FILE_LABELS[fileType]) return FILE_LABELS[fileType];
  if (!fileType.startsWith('bank_')) return fileType;
  const [, bank, ...rest] = fileType.split('_');
  const doc = rest.join('_');
  return `${BANK_NAMES[bank] ?? bank} - ${BANK_DOC_NAMES[doc] ?? doc} semnat`;
}

export function consentLink(token: string, brokerSlug?: string | null) {
  const path = `/consimtamant/${token}`;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || !brokerSlug) return `${window.location.origin}${path}`;
  return `${brokerSiteUrl(brokerSlug)}${path}`;
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '');
  const international = /^0\d{9}$/.test(digits) ? `40${digits.slice(1)}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

export function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
