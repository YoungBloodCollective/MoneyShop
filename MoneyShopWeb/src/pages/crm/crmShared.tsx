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

const STATUS_PILL: Record<string, string> = {
  INREGISTRAT: 'bg-slate-100 text-slate-600',
  IN_ANALIZA: 'bg-amber-50 text-amber-700',
  NEVOIE_DOCUMENTE: 'bg-rose-50 text-rose-700',
  PREAPROBAT: 'bg-indigo-50 text-indigo-700',
  OFERTA_TRANSMISA: 'bg-violet-50 text-violet-700',
  ACCEPTAT_CLIENT: 'bg-indigo-50 text-indigo-700',
  RESPINS: 'bg-rose-50 text-rose-700',
  TRIMIS_LA_BANCA: 'bg-sky-50 text-sky-700',
  APROBAT_BANCA: 'bg-emerald-50 text-emerald-700',
  DISBURSAT: 'bg-emerald-100 text-emerald-800',
};

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

export function creditTypeLabel(type?: string | null): string {
  if (!type) return '—';
  if (CREDIT_TYPE_LABEL[type]) return CREDIT_TYPE_LABEL[type];
  const t = type.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function StatusPill({ status }: { status?: string }) {
  const cls = (status && STATUS_PILL[status]) || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
  );
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

export function dateShort(iso?: string): string {
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

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-primary border-t-transparent" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}
