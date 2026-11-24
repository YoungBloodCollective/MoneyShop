import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCrmPath } from '@/lib/crmPath';
import { Search, X } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmFileListItem } from '@/types/crm.types';
import { bankStage } from '@/components/crm/client/clientWorkLabels';
import { CreditTypePill, StagePill } from '@/components/crm/client/ClientWorkSection';
import { PageHeader, SkeletonTable, EmptyState, ErrorState, SegmentChips, Pagination } from './crmShared';
import { money, dateShort, BANK_FILE_SEGMENTS, bankFileSegment, usePaged, FOCUS_RING, FIELD_FOCUS } from './crmHelpers';

const SEG_KEY = 'moneyshop:crm-dosare-bank-seg';
const LINK_CLS = `rounded hover:text-brand-primary hover:underline ${FOCUS_RING}`;
const SEGMENT_ALIASES: Record<string, string> = { debursate: 'disbursate' };

function validSegment(v: string | null): string | null {
  if (v === null) return null;
  const key = SEGMENT_ALIASES[v] ?? v;
  return BANK_FILE_SEGMENTS.some(s => s.key === key) ? key : 'toate';
}

export default function CrmDosarePage() {
  const crm = useCrmPath();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<CrmFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState('');
  const [storedSegment, setStoredSegment] = useState<string>(() => {
    try { return validSegment(localStorage.getItem(SEG_KEY)) ?? 'toate'; } catch { return 'toate'; }
  });
  const statusParam = searchParams.get('status');
  const bankParam = searchParams.get('bank');
  const statusFilter = statusParam && bankStage(statusParam) ? statusParam : null;
  const bankFilter = bankParam && /^\d+$/.test(bankParam) ? Number(bankParam) : null;
  const segment = validSegment(searchParams.get('seg')) ?? storedSegment;
  const activeSegment = statusFilter ? '' : segment;
  const isAdminView = files.some(f => f.brokerName);

  useEffect(() => {
    let active = true;
    crmApi.getFiles()
      .then(d => { if (active) { setFiles(d); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = () => { setLoading(true); setAttempt(a => a + 1); };

  const updateParams = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace: true });
  };
  const changeSegment = (key: string) => {
    setStoredSegment(key);
    try { localStorage.setItem(SEG_KEY, key); } catch { /* ignore */ }
    updateParams(p => { p.delete('seg'); p.delete('status'); });
  };
  const changeBank = (value: string) => updateParams(p => { if (value) p.set('bank', value); else p.delete('bank'); });
  const clearStatusFilter = () => updateParams(p => p.delete('status'));

  const banks = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of files) if (f.bankId != null) map.set(f.bankId, f.bankName);
    if (bankFilter != null && !map.has(bankFilter)) map.set(bankFilter, `Banca #${bankFilter}`);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ro'));
  }, [files, bankFilter]);

  const byBank = useMemo(
    () => (bankFilter == null ? files : files.filter(f => f.bankId === bankFilter)),
    [files, bankFilter],
  );

  const listFiltered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return byBank.filter(f =>
      (statusFilter ? f.status === statusFilter : segment === 'toate' || bankFileSegment(f.status) === segment)
      && (!t || f.code.toLowerCase().includes(t) || f.clientName.toLowerCase().includes(t) || f.bankName.toLowerCase().includes(t)));
  }, [byBank, q, segment, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { toate: byBank.length };
    for (const seg of BANK_FILE_SEGMENTS) {
      if (seg.key !== 'toate') c[seg.key] = byBank.filter(f => bankFileSegment(f.status) === seg.key).length;
    }
    return c;
  }, [byBank]);

  const { page, setPage, pageCount, slice, total, pageSize } = usePaged(listFiltered, 25);
  const open = (f: CrmFileListItem) => navigate(crm(`/crm/clienti/${f.userId}`));

  return (
    <div className="space-y-5">
      <PageHeader title="Dosare" subtitle={failed ? undefined : `${files.length} dosare bancare în total`} />

      {!failed && (
        <div className="space-y-3">
          <SegmentChips segments={BANK_FILE_SEGMENTS} active={activeSegment} onChange={changeSegment} counts={counts} />
          {statusFilter && (
            <div className="flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/30 bg-brand-primary/5 py-1 pl-3 pr-1.5 text-sm font-medium text-slate-700">
                Status: {bankStage(statusFilter)?.label}
                <button
                  onClick={clearStatusFilter}
                  aria-label="Elimină filtrul de status"
                  className={`rounded-full p-0.5 text-slate-500 hover:bg-white hover:text-slate-700 ${FOCUS_RING}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-[220px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Caută client sau bancă..."
            aria-label="Caută client sau bancă"
            className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`}
          />
        </div>
        <select
          value={bankFilter ?? ''}
          onChange={e => changeBank(e.target.value)}
          aria-label="Filtrează după bancă"
          className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 sm:w-56 ${FIELD_FOCUS}`}
        >
          <option value="">Toate băncile</option>
          {banks.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={7} />
      ) : failed ? (
        <ErrorState message="Nu am putut încărca dosarele" onRetry={retry} />
      ) : listFiltered.length === 0 ? (
        <EmptyState message="Niciun dosar găsit." />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2 md:hidden">
            {slice.map(f => (
              <li key={f.id}>
                <Link to={crm(`/crm/clienti/${f.userId}`)} className={`block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${FOCUS_RING}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">{f.clientName}</span>
                      <span className="block text-xs text-slate-400">#{f.code}</span>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-slate-700">{money(f.amount)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="min-w-0 truncate">{f.bankName}</span>
                    <CreditTypePill type={f.creditType} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <StagePill status={f.status} />
                    <span className="text-xs text-slate-400">{dateShort(f.statusChangedAt)}</span>
                  </div>
                  {f.brokerName && <div className="mt-2 text-xs text-slate-500">Broker: {f.brokerName}</div>}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Dosar</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Bancă</th>
                  <th className="px-5 py-3 font-medium">Tip</th>
                  <th className="px-5 py-3 font-medium text-right">Sumă</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Din</th>
                  {isAdminView && <th className="px-5 py-3 font-medium">Broker</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slice.map(f => (
                  <tr key={f.id} onClick={() => open(f)} className="cursor-pointer transition-colors hover:bg-slate-50 focus-within:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-800">
                      <Link to={crm(`/crm/clienti/${f.userId}`)} onClick={e => e.stopPropagation()} className={LINK_CLS}>#{f.code}</Link>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{f.clientName}</td>
                    <td className="px-5 py-3 text-slate-700">{f.bankName}</td>
                    <td className="px-5 py-3"><CreditTypePill type={f.creditType} /></td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-slate-700">{money(f.amount)}</td>
                    <td className="px-5 py-3"><StagePill status={f.status} /></td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-400">{dateShort(f.statusChangedAt)}</td>
                    {isAdminView && <td className="px-5 py-3 text-slate-500">{f.brokerName}</td>}
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
