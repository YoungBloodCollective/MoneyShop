import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, List, LayoutGrid, X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { crmApi } from '@/services/api/crmApi';
import { adminApi, type DisbursementRequest } from '@/services/api/adminApi';
import { apiErrorMessage } from '@/services/api/brokersApi';
import { DisbursementModal, type DisbursementInitial } from '@/components/crm/DisbursementModal';
import { MoveToMenu } from '@/components/crm/MoveToMenu';
import type { CrmFileListItem, StatusTransitions } from '@/types/crm.types';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';
import { PageHeader, SkeletonTable, EmptyState, ErrorState, StatusPill, SegmentChips, Pagination } from './crmShared';
import { money, dateShort, creditTypeLabel, statusColor, statusLabel, canMove, allowedTargets, FILE_STATUS_SEGMENTS, matchesSegment, usePaged, useIsMd, FOCUS_RING, FIELD_FOCUS } from './crmHelpers';

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS);
const COLUMNS = [
  'INREGISTRAT', 'IN_ANALIZA', 'NEVOIE_DOCUMENTE', 'PREAPROBAT',
  'OFERTA_TRANSMISA', 'ACCEPTAT_CLIENT', 'TRIMIS_LA_BANCA', 'APROBAT_BANCA', 'DISBURSAT', 'RESPINS',
];
const SEG_KEY = 'moneyshop:crm-dosare-seg';
const VIEW_KEY = 'moneyshop:crm-dosare-view';
const LINK_CLS = `rounded hover:text-brand-primary hover:underline ${FOCUS_RING}`;

export default function CrmDosarePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMd = useIsMd();
  const [files, setFiles] = useState<CrmFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [transitions, setTransitions] = useState<StatusTransitions | null>(null);
  const [q, setQ] = useState('');
  const [storedSegment, setStoredSegment] = useState<string>(() => {
    try {
      const v = localStorage.getItem(SEG_KEY);
      return v && FILE_STATUS_SEGMENTS.some(s => s.key === v) ? v : 'toate';
    } catch { return 'toate'; }
  });
  const [view, setView] = useState<'list' | 'board'>(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list'; } catch { return 'list'; }
  });
  const segParam = searchParams.get('seg');
  const statusParam = searchParams.get('status');
  const urlSegment = segParam === null ? null : FILE_STATUS_SEGMENTS.some(s => s.key === segParam) ? segParam : 'toate';
  const statusFilter = statusParam && Object.hasOwn(APPLICATION_STATUS_LABELS, statusParam) ? statusParam : null;
  const hasUrlFilter = segParam !== null || statusFilter !== null;
  const effectiveView = isMd && !hasUrlFilter ? view : 'list';
  const segment = urlSegment ?? storedSegment;
  const activeSegment = statusFilter ? '' : segment;
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [disbursing, setDisbursing] = useState<{ ids: number[]; initial?: DisbursementInitial } | null>(null);

  useEffect(() => {
    let active = true;
    crmApi.getFiles()
      .then(d => { if (active) { setFiles(d); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    let active = true;
    crmApi.getStatusTransitions()
      .then(m => { if (active) setTransitions(m); })
      .catch(() => { if (active) setTransitions(null); });
    return () => { active = false; };
  }, []);

  const retry = () => { setLoading(true); setAttempt(a => a + 1); };

  const changeSegment = (key: string) => {
    setStoredSegment(key);
    try { localStorage.setItem(SEG_KEY, key); } catch { /* ignore */ }
    setSearchParams({}, { replace: true });
  };
  const changeView = (k: 'list' | 'board') => {
    setView(k);
    try { localStorage.setItem(VIEW_KEY, k); } catch { /* ignore */ }
  };
  const clearStatusFilter = () => setSearchParams({}, { replace: true });
  const resetKey = `${activeSegment}\u0000${statusFilter ?? ''}\u0000${q}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setSelected(new Set());
  }

  const searched = useMemo(() => {
    const t = q.trim().toLowerCase();
    return files.filter(f => !t || f.code.toLowerCase().includes(t) || f.clientName.toLowerCase().includes(t));
  }, [files, q]);

  const listFiltered = useMemo(
    () => searched.filter(f => (statusFilter ? f.status === statusFilter : matchesSegment(f.status, segment))),
    [searched, segment, statusFilter],
  );

  const visibleSelected = useMemo(() => {
    const visible = new Set(listFiltered.map(f => f.id));
    return new Set([...selected].filter(id => visible.has(id)));
  }, [listFiltered, selected]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { toate: files.length };
    for (const seg of FILE_STATUS_SEGMENTS) {
      if (seg.key !== 'toate') c[seg.key] = files.filter(x => matchesSegment(x.status, seg.key)).length;
    }
    return c;
  }, [files]);

  const { page, setPage, pageCount, slice, total, pageSize } = usePaged(listFiltered, 25);

  function moveCard(id: number, toStatus: string) {
    const file = files.find(f => f.id === id);
    if (!file || file.status === toStatus) return;
    if (!canMove(transitions, file.status, toStatus)) {
      toast.error(`Mutarea din „${statusLabel(file.status)}” în „${statusLabel(toStatus)}” nu este permisă.`);
      return;
    }
    if (toStatus === 'DISBURSAT') { setDisbursing({ ids: [id] }); return; }
    if (toStatus === 'RESPINS' && !window.confirm(`Sigur muți dosarul #${file.code} în „${statusLabel(toStatus)}”?`)) return;
    const prev = file.status;
    setSelected(s => { if (!s.has(id)) return s; const n = new Set(s); n.delete(id); return n; });
    setFiles(fs => fs.map(f => (f.id === id ? { ...f, status: toStatus } : f)));
    adminApi.updateStatus(id, toStatus)
      .then(() => toast.success(`#${file.code} → ${statusLabel(toStatus)}`))
      .catch(err => {
        setFiles(fs => fs.map(f => (f.id === id ? { ...f, status: prev } : f)));
        toast.error(apiErrorMessage(err, 'Nu am putut schimba statusul'));
      });
  }

  async function bulkSetStatus(toStatus: string) {
    const ids = [...visibleSelected];
    if (ids.length === 0) return;
    if (toStatus === 'DISBURSAT') {
      const eligible = ids.filter(id => files.find(f => f.id === id)?.status !== 'DISBURSAT');
      const skipped = ids.length - eligible.length;
      if (skipped > 0) toast(`${skipped} dosare deja debursate au fost sărite`);
      if (eligible.length === 0) return;
      setDisbursing({ ids: eligible });
      return;
    }
    if (!window.confirm(`Sigur schimbi statusul a ${ids.length} dosare în „${statusLabel(toStatus)}”?`)) return;
    setFiles(fs => fs.map(f => (ids.includes(f.id) ? { ...f, status: toStatus } : f)));
    setSelected(new Set());
    const results = await Promise.allSettled(ids.map(id => adminApi.updateStatus(id, toStatus)));
    const failCount = results.filter(r => r.status === 'rejected').length;
    if (failCount > 0) {
      toast.error(`${failCount} din ${ids.length} dosare nu s-au actualizat`);
      crmApi.getFiles().then(setFiles).catch(() => undefined);
    } else {
      toast.success(`${ids.length} dosare → ${statusLabel(toStatus)}`);
    }
  }

  function editDisbursement(f: CrmFileListItem) {
    setDisbursing({ ids: [f.id], initial: { sumaAprobata: f.sumaAprobata, comision: f.comision, dataDisbursare: f.dataDisbursare } });
  }

  async function submitDisbursement(values: DisbursementRequest) {
    const ids = disbursing?.ids ?? [];
    const failedIds: number[] = [];
    let firstError: unknown;
    for (const id of ids) {
      try { await adminApi.updateDisbursement(id, values); }
      catch (err) { failedIds.push(id); firstError ??= err; }
    }
    if (failedIds.length === ids.length) throw firstError;
    setSelected(new Set(failedIds));
    setDisbursing(null);
    crmApi.getFiles().then(setFiles).catch(() => undefined);
    if (failedIds.length > 0) {
      const codes = failedIds.map(id => files.find(f => f.id === id)?.code ?? String(id)).join(', ');
      toast.error(`${failedIds.length} din ${ids.length} dosare nu s-au actualizat: ${codes}. ${apiErrorMessage(firstError, '')}`.trim());
    } else {
      toast.success(ids.length === 1 ? 'Debursare salvată' : `${ids.length} dosare → ${statusLabel('DISBURSAT')}`);
    }
  }

  const selectedFiles = useMemo(() => files.filter(f => visibleSelected.has(f.id)), [files, visibleSelected]);
  const bulkTargets = useMemo(
    () => STATUS_OPTIONS.filter(([k]) => selectedFiles.every(f => canMove(transitions, f.status, k))),
    [selectedFiles, transitions],
  );

  const pageIds = slice.map(f => f.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => visibleSelected.has(id));
  const toggleAllOnPage = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggle = (
    <div className="hidden rounded-xl border border-slate-200 bg-white p-0.5 md:inline-flex">
      {([['list', 'Listă', List], ['board', 'Pipeline', LayoutGrid]] as const).map(([k, label, Icon]) => (
        <button
          key={k}
          onClick={() => changeView(k)}
          aria-pressed={view === k}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
            view === k ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Dosare" subtitle={failed ? undefined : `${files.length} dosare în total`} action={toggle} />

      {effectiveView === 'list' && !failed && (
        <div className="space-y-3">
          <SegmentChips segments={FILE_STATUS_SEGMENTS} active={activeSegment} onChange={changeSegment} counts={counts} />
          {statusFilter && (
            <div className="flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/30 bg-brand-primary/5 py-1 pl-3 pr-1.5 text-sm font-medium text-slate-700">
                Status: {statusLabel(statusFilter)}
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

      <div className="relative min-w-[220px] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Caută dosar sau client..."
          aria-label="Caută dosar sau client"
          className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`}
        />
      </div>

      {loading ? (
        <SkeletonTable rows={7} />
      ) : failed ? (
        <ErrorState message="Nu am putut încărca dosarele" onRetry={retry} />
      ) : effectiveView === 'list' ? (
        listFiltered.length === 0 ? (
          <EmptyState message="Niciun dosar găsit." />
        ) : (
          <div className="space-y-3">
            {visibleSelected.size > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-4 py-2.5">
                <span className="text-sm font-medium text-slate-700">{visibleSelected.size} selectate</span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {bulkTargets.length === 0 ? (
                    <select disabled defaultValue="" aria-label="Schimbă statusul dosarelor selectate" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400">
                      <option value="">Nicio mutare comună</option>
                    </select>
                  ) : (
                    <select
                      defaultValue=""
                      aria-label="Schimbă statusul dosarelor selectate"
                      onChange={e => { if (e.target.value) { bulkSetStatus(e.target.value); e.target.value = ''; } }}
                      className={`rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 ${FIELD_FOCUS}`}
                    >
                      <option value="" disabled>Schimbă status în…</option>
                      {bulkTargets.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                  <span className="text-xs text-slate-500">Se afișează doar statusurile valide pentru toate dosarele selectate</span>
                  <button onClick={() => setSelected(new Set())} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-white ${FOCUS_RING}`}>
                    <X className="h-4 w-4" /> Anulează
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-1 md:hidden">
              <input
                id="dosare-select-all-mobile"
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleAllOnPage}
                className="h-5 w-5 rounded border-slate-300 accent-brand-primary"
              />
              <label htmlFor="dosare-select-all-mobile" className="text-sm text-slate-600">Selectează toate din pagină</label>
            </div>

            <ul className="space-y-2 md:hidden">
              {slice.map(f => {
                const checked = visibleSelected.has(f.id);
                return (
                  <li key={f.id} className={`rounded-2xl border p-4 shadow-sm ${checked ? 'border-brand-primary/40 bg-brand-primary/5' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(f.id)}
                        aria-label={`Selectează dosarul #${f.code}`}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-brand-primary"
                      />
                      <Link to={`/crm/clienti/${f.userId}`} className={`min-w-0 flex-1 ${LINK_CLS}`}>
                        <span className="block font-semibold text-slate-800">#{f.code}</span>
                        <span className="block truncate text-sm text-slate-700">{f.clientName}</span>
                      </Link>
                      <MoveToMenu code={f.code} targets={allowedTargets(transitions, f.status, COLUMNS)} onSelect={t => moveCard(f.id, t)} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <StatusPill status={f.status} />
                      <span className="text-sm font-medium text-slate-700">{money(f.requestedAmount)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{creditTypeLabel(f.typeCredit)}</span>
                      <span className="text-slate-400">{dateShort(f.updatedAt)}</span>
                    </div>
                    {f.status === 'DISBURSAT' && (
                      <button onClick={() => editDisbursement(f)} className={`mt-3 inline-flex items-center gap-1 rounded text-xs font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>
                        <Pencil className="h-3 w-3" /> Editează debursarea
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="whitespace-nowrap border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Selectează toate dosarele din pagină" className="h-4 w-4 rounded border-slate-300 accent-brand-primary" />
                    </th>
                    <th className="px-5 py-3 font-medium">Dosar</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Tip</th>
                    <th className="px-5 py-3 font-medium text-right">Sumă cerută</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actualizat</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {slice.map(f => {
                    const checked = visibleSelected.has(f.id);
                    return (
                      <tr key={f.id} className={`transition-colors hover:bg-slate-50 focus-within:bg-slate-50 ${checked ? 'bg-brand-primary/5' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={checked} onChange={() => toggleOne(f.id)} aria-label={`Selectează dosarul #${f.code}`} className="h-4 w-4 rounded border-slate-300 accent-brand-primary" />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-800">
                          <Link to={`/crm/clienti/${f.userId}`} className={LINK_CLS}>#{f.code}</Link>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{f.clientName}</td>
                        <td className="px-5 py-3 text-slate-500">{creditTypeLabel(f.typeCredit)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-slate-700">{money(f.requestedAmount)}</td>
                        <td className="px-5 py-3"><StatusPill status={f.status} /></td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-400">{dateShort(f.updatedAt)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          {f.status === 'DISBURSAT' && (
                            <button onClick={() => editDisbursement(f)} className={`inline-flex items-center gap-1 rounded text-xs font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>
                              <Pencil className="h-3 w-3" /> Editează debursarea
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
          </div>
        )
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const cards = searched.filter(f => f.status === col);
            const dragged = draggedId != null ? files.find(f => f.id === draggedId) : undefined;
            const droppable = !!dragged && canMove(transitions, dragged.status, col);
            const dimmed = !!dragged && dragged.status !== col && !droppable;
            const over = droppable && dragOverCol === col;
            const borderClass = over
              ? 'border-brand-primary bg-brand-primary/5'
              : droppable ? 'border-dashed border-brand-primary/60' : 'border-slate-200';
            return (
              <div
                key={col}
                onDragOver={e => {
                  if (!droppable) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverCol(col);
                }}
                onDragLeave={() => setDragOverCol(c => (c === col ? null : c))}
                onDrop={() => { if (draggedId != null) moveCard(draggedId, col); setDragOverCol(null); setDraggedId(null); }}
                className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-100/60 p-2 transition-colors ${borderClass} ${dimmed ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-2 px-2 py-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor(col) }} />
                  <span className="text-sm font-semibold text-slate-700">{statusLabel(col)}</span>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{cards.length}</span>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {cards.map(f => (
                    <div
                      key={f.id}
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(f.id)); setDraggedId(f.id); }}
                      onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                      className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${draggedId === f.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/crm/clienti/${f.userId}`} draggable={false} className={`text-xs font-semibold text-slate-800 ${LINK_CLS}`}>#{f.code}</Link>
                        <span className="ml-auto text-xs text-slate-400">{creditTypeLabel(f.typeCredit)}</span>
                        <MoveToMenu code={f.code} targets={allowedTargets(transitions, f.status, COLUMNS)} onSelect={t => moveCard(f.id, t)} />
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-slate-700">{f.clientName}</div>
                      <div className="mt-1 text-xs text-slate-500">{money(f.requestedAmount)}</div>
                      {f.status === 'DISBURSAT' && (
                        <button
                          onClick={e => { e.stopPropagation(); editDisbursement(f); }}
                          className={`mt-2 inline-flex items-center gap-1 rounded text-xs font-medium text-brand-primary hover:underline ${FOCUS_RING}`}
                        >
                          <Pencil className="h-3 w-3" /> Editează debursarea
                        </button>
                      )}
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">Trage aici</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {disbursing && (
        <DisbursementModal
          title={disbursing.initial ? 'Editează debursarea' : 'Debursare dosar'}
          subtitle={disbursing.ids.length === 1
            ? `Dosar #${files.find(f => f.id === disbursing.ids[0])?.code ?? ''}`
            : `${disbursing.ids.length} dosare selectate`}
          initial={disbursing.initial}
          onClose={() => setDisbursing(null)}
          onSubmit={submitDisbursement}
        />
      )}
    </div>
  );
}
