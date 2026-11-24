import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCrmPath } from '@/lib/crmPath';
import { Search, Phone, Mail, ChevronRight } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmClientListItem } from '@/types/crm.types';
import { PageHeader, SkeletonTable, EmptyState, ErrorState, StatusPill, AcordPill, SegmentChips, Pagination } from './crmShared';
import { moneyShort, relTime, initials, CLIENT_STATUS_SEGMENTS, matchesClientSegment, matchesPhone, usePaged, FOCUS_RING, FIELD_FOCUS } from './crmHelpers';
import { BANK_FILE_STAGES, CLIENT_TAGS, clientTag } from '@/components/crm/client/clientWorkLabels';
import { StagePill } from '@/components/crm/client/ClientWorkSection';

function TagPills({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map(k => {
        const t = clientTag(k);
        return <span key={k} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${t?.cls ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>{t?.label ?? k}</span>;
      })}
    </span>
  );
}

const SEG_KEY = 'moneyshop:crm-clienti-seg';

export default function CrmClientsPage() {
  const crm = useCrmPath();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<CrmClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState('');
  const [storedSegment, setStoredSegment] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(SEG_KEY);
      return stored && CLIENT_STATUS_SEGMENTS.some(s => s.key === stored) ? stored : 'toate';
    } catch { return 'toate'; }
  });
  const tagParam = searchParams.get('tag');
  const tagFilter = tagParam && CLIENT_TAGS.some(t => t.key === tagParam) ? tagParam : null;
  const stageParam = searchParams.get('etapa');
  const stageFilter = stageParam && BANK_FILE_STAGES.some(s => s.key === stageParam) ? stageParam : null;
  const setFilterParam = (key: 'tag' | 'etapa', value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const segParam = searchParams.get('seg');
  const segment = segParam === null ? storedSegment : CLIENT_STATUS_SEGMENTS.some(s => s.key === segParam) ? segParam : 'toate';
  const changeSegment = (key: string) => {
    setStoredSegment(key);
    try { localStorage.setItem(SEG_KEY, key); } catch { /* ignore */ }
    if (segParam !== null) {
      const next = new URLSearchParams(searchParams);
      next.delete('seg');
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    let active = true;
    crmApi.getClients()
      .then(d => { if (active) { setClients(d); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = () => { setLoading(true); setAttempt(a => a + 1); };

  const counts = useMemo(() => {
    const c: Record<string, number> = { toate: clients.length };
    for (const seg of CLIENT_STATUS_SEGMENTS) {
      if (seg.key !== 'toate') c[seg.key] = clients.filter(x => matchesClientSegment(x, seg.key)).length;
    }
    return c;
  }, [clients]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return clients.filter(c =>
      matchesClientSegment(c, segment) &&
      (!tagFilter || (c.tags ?? []).includes(tagFilter)) &&
      (!stageFilter || c.bankFileStatus === stageFilter) &&
      (!t || c.fullName.toLowerCase().includes(t) || matchesPhone(c.phone, t) || (c.email ?? '').toLowerCase().includes(t)));
  }, [clients, q, segment, tagFilter, stageFilter]);

  const tagCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of CLIENT_TAGS) c[t.key] = clients.filter(x => (x.tags ?? []).includes(t.key)).length;
    return c;
  }, [clients]);

  const { page, setPage, pageCount, slice, total, pageSize } = usePaged(filtered, 25);

  if (loading) return (<div className="space-y-6"><PageHeader title="Clienți" /><SkeletonTable rows={6} /></div>);

  if (failed) return (
    <div className="space-y-6">
      <PageHeader title="Clienți" />
      <ErrorState message="Nu am putut încărca clienții" onRetry={retry} />
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Clienți" subtitle={`${clients.length} clienți în portofoliul tău`} />

      <SegmentChips segments={CLIENT_STATUS_SEGMENTS} active={segment} onChange={changeSegment} counts={counts} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Etichete</span>
        {CLIENT_TAGS.map(t => {
          const on = tagFilter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilterParam('tag', on ? null : t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${FOCUS_RING} ${on ? t.cls : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {t.label}
              <span className="rounded-full bg-white/60 px-1.5 text-[11px]">{tagCounts[t.key] ?? 0}</span>
            </button>
          );
        })}
        <select
          value={stageFilter ?? ''}
          onChange={e => setFilterParam('etapa', e.target.value || null)}
          aria-label="Filtrează după stadiul dosarului bancar"
          className={`rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 ${FIELD_FOCUS}`}
        >
          <option value="">Dosar bancar: toate</option>
          {BANK_FILE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Caută după nume, telefon, email..."
          aria-label="Caută după nume, telefon, email"
          className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Niciun client găsit." />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2 md:hidden">
            {slice.map(c => (
              <li key={c.userId}>
                <Link
                  to={crm(`/crm/clienti/${c.userId}`)}
                  className={`block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                      {initials(c.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">{c.fullName}</div>
                      <div className="truncate text-xs text-slate-500">{c.phone ?? c.email ?? '—'}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  {c.phone && c.email && (
                    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.email}</span></div>
                  )}
                  {(c.tags?.length || c.bankFileStatus) ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {c.bankFileStatus && <StagePill status={c.bankFileStatus} />}
                      <TagPills tags={c.tags} />
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {c.lastStatus ? <StatusPill status={c.lastStatus} /> : <AcordPill status={c.acordStatus} />}
                    <span className="text-xs text-slate-500">{c.filesCount} dosare</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-700">{c.approvedVolume > 0 ? moneyShort(c.approvedVolume) : '—'}</span>
                    <span className="text-slate-400">{relTime(c.lastActivityAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium text-center">Dosare</th>
                  <th className="px-5 py-3 font-medium">Status recent</th>
                  <th className="px-5 py-3 font-medium text-right">Volum disbursat</th>
                  <th className="px-5 py-3 font-medium">Activitate</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slice.map(c => (
                  <tr
                    key={c.userId}
                    onClick={() => navigate(crm(`/crm/clienti/${c.userId}`))}
                    className="cursor-pointer transition-colors hover:bg-slate-50 focus-within:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                          {initials(c.fullName)}
                        </div>
                        <Link
                          to={crm(`/crm/clienti/${c.userId}`)}
                          onClick={e => e.stopPropagation()}
                          className={`rounded font-medium text-slate-800 hover:text-brand-primary hover:underline ${FOCUS_RING}`}
                        >
                          {c.fullName}
                        </Link>
                        <TagPills tags={c.tags} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      <div className="space-y-0.5">
                        {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{c.phone}</div>}
                        {c.email && <div className="flex min-w-0 max-w-[220px] items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.email}</span></div>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center font-semibold text-slate-700">{c.filesCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.lastStatus ? <StatusPill status={c.lastStatus} /> : <AcordPill status={c.acordStatus} />}
                        {c.bankFileStatus && <StagePill status={c.bankFileStatus} />}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-slate-700">{c.approvedVolume > 0 ? moneyShort(c.approvedVolume) : '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-400">{relTime(c.lastActivityAt)}</td>
                    <td className="px-5 py-3 text-right"><ChevronRight className="h-4 w-4 text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
