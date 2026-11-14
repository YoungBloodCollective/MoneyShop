import { useState } from 'react';
// CRM-local status labels (with diacritics) and light-theme pills. The admin panel uses its
// own dark pills + APPLICATION_STATUS_LABELS; the CRM keeps a polished copy of its own.
const STATUS_LABEL: Record<string, string> = {
  INREGISTRAT: 'Înregistrat',
  IN_ANALIZA: 'În analiză',
  NEVOIE_DOCUMENTE: 'Nevoie de documente',
  PREAPROBAT: 'Pre-aprobat',
  OFERTA_TRANSMISA: 'Ofertă transmisă',
  ACCEPTAT_CLIENT: 'Acceptat de client',
  RESPINS: 'Respins',
  TRIMIS_LA_BANCA: 'Trimis la bancă',
  APROBAT_BANCA: 'Aprobat de bancă',
  DISBURSAT: 'Debursat',
};

export const ACORD_STATUS_LABEL: Record<string, string> = {
  started: 'Acord început',
  documents: 'Documente încărcate',
  signed: 'Acord semnat',
  completed: 'Acord finalizat',
  rejected: 'Acord respins',
};

export function acordStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return ACORD_STATUS_LABEL[status] ?? status;
}

export function statusLabel(status?: string): string {
  if (!status) return '—';
  return STATUS_LABEL[status] ?? status;
}

const CREDIT_TYPE_LABEL: Record<string, string> = {
  ipotecar: 'Ipotecar',
  nevoi_personale: 'Nevoi personale',
  refinantare: 'Refinanțare',
  prima_casa: 'Prima Casă',
  noua_casa: 'Noua Casă',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  CI_FATA: 'Buletin – față',
  CI_SPATE: 'Buletin – verso',
  ADEVERINTA_VENIT: 'Adeverință de venit',
  EXTRAS_CONT: 'Extras de cont',
  FLUTURAS: 'Fluturaș de salariu',
  CONTRACT_MUNCA: 'Contract de muncă',
};

export function docTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type;
}

export function creditTypeLabel(type?: string | null): string {
  if (!type) return '—';
  if (CREDIT_TYPE_LABEL[type]) return CREDIT_TYPE_LABEL[type];
  const t = type.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function money(v?: number | null): string {
  if (v == null) return '—';
  return `${v.toLocaleString('ro-RO')} lei`;
}

export function moneyShort(v?: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} mil lei`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}k lei`;
  return `${v.toLocaleString('ro-RO')} lei`;
}

export function dateShort(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'acum';
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `acum ${d} zile`;
  return dateShort(iso);
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

// Solid status accent colors (for Kanban column headers / dots).
const STATUS_HEX: Record<string, string> = {
  INREGISTRAT: '#64748B',
  IN_ANALIZA: '#F59E0B',
  NEVOIE_DOCUMENTE: '#F43F5E',
  PREAPROBAT: '#6366F1',
  OFERTA_TRANSMISA: '#8B5CF6',
  ACCEPTAT_CLIENT: '#6366F1',
  RESPINS: '#F43F5E',
  TRIMIS_LA_BANCA: '#0EA5E9',
  APROBAT_BANCA: '#10B981',
  DISBURSAT: '#059669',
};

export function statusColor(status?: string): string {
  return (status && STATUS_HEX[status]) || '#94A3B8';
}

// ── Status segments (quick filters shared by Clienți & Dosare) ───────────────
export const FILE_STATUS_SEGMENTS: { key: string; label: string }[] = [
  { key: 'toate', label: 'Toate' },
  { key: 'analiza', label: 'În analiză' },
  { key: 'banca', label: 'La bancă' },
  { key: 'aprobate', label: 'Aprobate' },
  { key: 'debursate', label: 'Debursate' },
  { key: 'respins', label: 'Respinse' },
];

export const CLIENT_STATUS_SEGMENTS: { key: string; label: string }[] = [
  { key: 'toate', label: 'Toate' },
  { key: 'acord', label: 'Acord, fără dosar' },
  ...FILE_STATUS_SEGMENTS.filter(s => s.key !== 'toate'),
];

/// Folds a concrete status into the segment it belongs to.
export function statusGroup(status?: string | null): string {
  if (!status) return 'none';
  switch (status) {
    case 'TRIMIS_LA_BANCA': return 'banca';
    case 'APROBAT_BANCA': return 'aprobate';
    case 'DISBURSAT': return 'debursate';
    case 'RESPINS': return 'respins';
    case 'INREGISTRAT':
    case 'IN_ANALIZA':
    case 'NEVOIE_DOCUMENTE':
    case 'PREAPROBAT':
    case 'OFERTA_TRANSMISA':
    case 'ACCEPTAT_CLIENT': return 'analiza';
    default: return 'analiza';
  }
}

export function matchesSegment(status: string | null | undefined, segment: string): boolean {
  return segment === 'toate' || statusGroup(status) === segment;
}

export function matchesClientSegment(
  client: { hasAcord: boolean; filesCount: number; lastStatus?: string | null },
  segment: string,
): boolean {
  if (segment === 'toate') return true;
  if (segment === 'acord') return client.hasAcord && client.filesCount === 0;
  return matchesSegment(client.lastStatus, segment);
}

// ── Pagination ───────────────────────────────────────────────────────────────
export function usePaged<T>(items: T[], pageSize = 25) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  if (page > pageCount) setPage(1);
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return { page, setPage, pageCount, slice, total: items.length, pageSize };
}
