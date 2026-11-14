import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PenLine, Megaphone, ChevronRight } from 'lucide-react';
import { acordApi, type AcordListItem } from '@/services/api/acordApi';
import { brokersApi, type BrokerAdminItem } from '@/services/api/brokersApi';
import { useAuth } from '@/hooks/useAuth';
import { ACORD_STATUS_LABELS, ACORD_STATUS_STYLES, formatDateTime } from '@/components/crm/acord/acordLabels';
import { PageHeader, SkeletonTable, EmptyState, SegmentChips, Pagination } from './crmShared';
import { usePaged } from './crmHelpers';

const SEGMENTS = [
  { key: 'toate', label: 'Toate' },
  ...Object.entries(ACORD_STATUS_LABELS).map(([key, label]) => ({ key, label })),
];

export default function CrmAcorduriPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState<AcordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('toate');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [brokers, setBrokers] = useState<BrokerAdminItem[]>([]);

  useEffect(() => {
    if (isSuperAdmin) brokersApi.list().then(setBrokers).catch(() => undefined);
  }, [isSuperAdmin]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(false);
      acordApi.adminList({ brokerId: brokerFilter ? Number(brokerFilter) : undefined })
        .then(d => { if (active) setItems(d); })
        .catch(() => { if (active) setError(true); })
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [brokerFilter, reloadKey]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { toate: items.length };
    for (const key of Object.keys(ACORD_STATUS_LABELS)) c[key] = items.filter(i => i.status === key).length;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(i =>
      (segment === 'toate' || i.status === segment) &&
      (!t ||
        `${i.nume} ${i.prenume}`.toLowerCase().includes(t) ||
        i.telefon.includes(t) ||
        (i.email ?? '').toLowerCase().includes(t)));
  }, [items, q, segment]);

  const { page, setPage, pageCount, slice, total, pageSize } = usePaged(filtered, 25);

  const header = <PageHeader title="Acorduri" subtitle="Clienți care și-au încărcat actele prin linkul public." />;

  return (
    <div className="space-y-5">
      {header}
      <SegmentChips segments={SEGMENTS} active={segment} onChange={setSegment} counts={counts} />
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Caută după nume, telefon, email..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
          />
        </div>
        {isSuperAdmin && brokers.length > 0 && (
          <select
            value={brokerFilter}
            onChange={e => setBrokerFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus:outline-none"
          >
            <option value="">Toți brokerii</option>
            {brokers.map(b => <option key={b.id} value={b.id}>{b.displayName}</option>)}
          </select>
        )}
      </div>
      {loading ? (
        <SkeletonTable rows={6} />
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <span>Nu s-au putut încărca acordurile.</span>
          <button onClick={() => setReloadKey(k => k + 1)} className="font-medium underline underline-offset-2">Reîncearcă</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? 'Niciun acord înregistrat încă.' : 'Niciun acord găsit.'} />
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {slice.map(item => (
              <button
                key={item.acordId}
                onClick={() => navigate(`/crm/acorduri/${item.acordId}`)}
                className="flex w-full items-center justify-between gap-4 border-b border-slate-50 px-5 py-4 text-left transition-colors last:border-0 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{item.nume} {item.prenume}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{item.telefon}</span>
                    {item.email && <span className="truncate">{item.email}</span>}
                    {isSuperAdmin && item.brokerName && (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-brand-primary">{item.brokerName}</span>
                    )}
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-xs text-slate-500 sm:inline">{item.fileCount} fișiere</span>
                  {item.isSigned && <PenLine size={14} className="text-emerald-600" />}
                  {item.marketingAccepted && <Megaphone size={14} className="text-brand-primary" />}
                  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${ACORD_STATUS_STYLES[item.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {ACORD_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </button>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
