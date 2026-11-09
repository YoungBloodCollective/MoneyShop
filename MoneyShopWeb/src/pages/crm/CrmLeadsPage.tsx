import { useEffect, useMemo, useState } from 'react';
import { Search, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';
import { adminApi, type LeadItem } from '@/services/api/adminApi';
import { PageHeader, SkeletonCards, EmptyState } from './crmShared';
import { money, dateShort, initials } from './crmHelpers';

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    let active = true;
    adminApi.getLeads()
      .then(d => { if (active) setLeads(d); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return leads;
    return leads.filter(l =>
      l.numePrenume.toLowerCase().includes(t) ||
      (l.telefon ?? '').includes(t) ||
      (l.email ?? '').toLowerCase().includes(t) ||
      (l.oras ?? '').toLowerCase().includes(t));
  }, [leads, q]);

  if (loading) return (<div className="space-y-6"><PageHeader title="Lead-uri" /><SkeletonCards count={6} /></div>);

  return (
    <div className="space-y-6">
      <PageHeader title="Lead-uri" subtitle={`${leads.length} potențiali clienți`} />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Caută după nume, telefon, oraș..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
        />
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">Nu s-au putut încărca datele. Încearcă din nou.</p>}

      {filtered.length === 0 && !error ? (
        <EmptyState message="Niciun lead încă." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(l => (
            <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary">
                  {initials(l.numePrenume)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-800">{l.numePrenume}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">{l.source}</span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                    {l.telefon && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{l.telefon}</div>}
                    {l.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{l.email}</div>}
                    {l.oras && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{l.oras}</div>}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                <div><div className="text-slate-400">Venit net</div><div className="font-medium text-slate-700">{money(l.venitNetLunar)}</div></div>
                <div><div className="text-slate-400">Sold aprox.</div><div className="font-medium text-slate-700">{money(l.soldTotalAprox)}</div></div>
              </div>
              {(l.intarzieri || l.poprireSauExecutorUltimii5Ani) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.intarzieri && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"><AlertTriangle className="h-3 w-3" />Întârzieri</span>}
                  {l.poprireSauExecutorUltimii5Ani && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"><AlertTriangle className="h-3 w-3" />Poprire</span>}
                </div>
              )}
              <div className="mt-3 text-[11px] text-slate-400">{dateShort(l.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
