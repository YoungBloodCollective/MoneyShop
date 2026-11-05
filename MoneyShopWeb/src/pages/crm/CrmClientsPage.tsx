import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, Mail, ChevronRight } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmClientListItem } from '@/types/crm.types';
import { PageHeader, Spinner, EmptyState, StatusPill, moneyShort, relTime, initials } from './crmShared';

export default function CrmClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<CrmClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    let active = true;
    crmApi.getClients()
      .then(d => { if (active) setClients(d); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter(c =>
      c.fullName.toLowerCase().includes(t) ||
      (c.phone ?? '').toLowerCase().includes(t) ||
      (c.email ?? '').toLowerCase().includes(t));
  }, [clients, q]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Clienți" subtitle={`${clients.length} clienți în portofoliul tău`} />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Caută după nume, telefon, email..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Niciun client găsit." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium text-center">Dosare</th>
                <th className="px-5 py-3 font-medium">Status recent</th>
                <th className="px-5 py-3 font-medium text-right">Volum debursat</th>
                <th className="px-5 py-3 font-medium">Activitate</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr
                  key={c.userId}
                  onClick={() => navigate(`/crm/clienti/${c.userId}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
                        {initials(c.fullName)}
                      </div>
                      <span className="font-medium text-slate-800">{c.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    <div className="space-y-0.5">
                      {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{c.phone}</div>}
                      {c.email && <div className="flex min-w-0 max-w-[220px] items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.email}</span></div>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center font-semibold text-slate-700">{c.filesCount}</td>
                  <td className="px-5 py-3"><StatusPill status={c.lastStatus} /></td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-slate-700">{c.approvedVolume > 0 ? moneyShort(c.approvedVolume) : '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-400">{relTime(c.lastActivityAt)}</td>
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
