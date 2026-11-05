import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, List, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import { crmApi } from '@/services/api/crmApi';
import { adminApi } from '@/services/api/adminApi';
import type { CrmFileListItem } from '@/types/crm.types';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';
import {
  PageHeader, SkeletonTable, EmptyState, StatusPill, money, dateShort,
  creditTypeLabel, statusColor, statusLabel,
} from './crmShared';

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS);
const COLUMNS = [
  'INREGISTRAT', 'IN_ANALIZA', 'NEVOIE_DOCUMENTE', 'PREAPROBAT',
  'TRIMIS_LA_BANCA', 'APROBAT_BANCA', 'DISBURSAT', 'RESPINS',
];

export default function CrmDosarePage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<CrmFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    crmApi.getFiles()
      .then(d => { if (active) setFiles(d); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const searched = useMemo(() => {
    const t = q.trim().toLowerCase();
    return files.filter(f => !t || f.code.toLowerCase().includes(t) || f.clientName.toLowerCase().includes(t));
  }, [files, q]);

  const listFiltered = useMemo(
    () => searched.filter(f => !status || f.status === status),
    [searched, status],
  );

  function moveCard(id: number, toStatus: string) {
    const file = files.find(f => f.id === id);
    if (!file || file.status === toStatus) return;
    const prev = file.status;
    setFiles(fs => fs.map(f => (f.id === id ? { ...f, status: toStatus } : f)));
    adminApi.updateStatus(id, toStatus)
      .then(() => toast.success(`#${file.code} → ${statusLabel(toStatus)}`))
      .catch(() => {
        setFiles(fs => fs.map(f => (f.id === id ? { ...f, status: prev } : f)));
        toast.error('Nu am putut schimba statusul');
      });
  }

  const toggle = (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
      {([['list', 'Listă', List], ['board', 'Pipeline', LayoutGrid]] as const).map(([k, label, Icon]) => (
        <button
          key={k}
          onClick={() => setView(k)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            view === k ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Dosare" subtitle={`${files.length} dosare în total`} action={toggle} />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Caută dosar sau client..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
          />
        </div>
        {view === 'list' && (
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus:outline-none"
          >
            <option value="">Toate statusurile</option>
            {STATUS_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <SkeletonTable rows={7} />
      ) : view === 'list' ? (
        listFiltered.length === 0 ? (
          <EmptyState message="Niciun dosar găsit." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
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
                {listFiltered.map(f => (
                  <tr key={f.id} onClick={() => navigate(`/crm/clienti/${f.userId}`)} className="cursor-pointer transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-800">#{f.code}</td>
                    <td className="px-5 py-3 text-slate-700">{f.clientName}</td>
                    <td className="px-5 py-3 text-slate-500">{creditTypeLabel(f.typeCredit)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-slate-700">{money(f.requestedAmount)}</td>
                    <td className="px-5 py-3"><StatusPill status={f.status} /></td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-400">{dateShort(f.updatedAt)}</td>
                    <td className="px-5 py-3 text-right"><ChevronRight className="h-4 w-4 text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const cards = searched.filter(f => f.status === col);
            const over = dragOverCol === col;
            return (
              <div
                key={col}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                onDragLeave={() => setDragOverCol(c => (c === col ? null : c))}
                onDrop={() => { if (draggedId != null) moveCard(draggedId, col); setDragOverCol(null); setDraggedId(null); }}
                className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-100/60 p-2 transition-colors ${over ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-200'}`}
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
                      onDragStart={() => setDraggedId(f.id)}
                      onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                      onClick={() => navigate(`/crm/clienti/${f.userId}`)}
                      className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${draggedId === f.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">#{f.code}</span>
                        <span className="text-xs text-slate-400">{creditTypeLabel(f.typeCredit)}</span>
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-slate-700">{f.clientName}</div>
                      <div className="mt-1 text-xs text-slate-500">{money(f.requestedAmount)}</div>
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
    </div>
  );
}
