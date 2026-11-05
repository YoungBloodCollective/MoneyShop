import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmFileListItem } from '@/types/crm.types';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';
import { PageHeader, Spinner, EmptyState, StatusPill, money, dateShort, creditTypeLabel } from './crmShared';

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS);

export default function CrmDosarePage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<CrmFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    crmApi.getFiles()
      .then(d => { if (active) setFiles(d); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return files.filter(f =>
      (!status || f.status === status) &&
      (!t || f.code.toLowerCase().includes(t) || f.clientName.toLowerCase().includes(t)));
  }, [files, q, status]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Dosare" subtitle={`${files.length} dosare în total`} />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Caută dosar sau client..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus:outline-none"
        >
          <option value="">Toate statusurile</option>
          {STATUS_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
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
              {filtered.map(f => (
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
      )}
    </div>
  );
}
