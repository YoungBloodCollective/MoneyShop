import { statusLabel } from './crmHelpers';

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

export function StatusPill({ status }: { status?: string }) {
  const cls = (status && STATUS_PILL[status]) || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
  );
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

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-5 py-4 last:border-0">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-4 h-10 animate-pulse rounded-lg bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

export function SegmentChips({
  segments, active, onChange, counts,
}: {
  segments: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {segments.map(seg => {
        const on = active === seg.key;
        const count = counts?.[seg.key];
        return (
          <button
            key={seg.key}
            onClick={() => onChange(seg.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              on ? 'bg-brand-primary text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {seg.label}
            {typeof count === 'number' && (
              <span className={`rounded-full px-1.5 text-xs ${on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({
  page, pageCount, total, pageSize, onPage,
}: {
  page: number; pageCount: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex items-center justify-between px-1 pt-1 text-sm text-slate-500">
      <span>{from}–{to} din {total}</span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
        <span className="px-1 text-slate-400">{page} / {pageCount}</span>
        <button className={btn} disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Următor</button>
      </div>
    </div>
  );
}
