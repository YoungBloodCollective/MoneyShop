import { useEffect, useMemo, useState } from 'react';
import { Landmark, Search } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmOfferItem } from '@/types/crm.types';
import { PageHeader, SkeletonTable, EmptyState, StatusPill } from './crmShared';
import { money, dateShort } from './crmHelpers';

export default function CrmOffersPage() {
  const [offers, setOffers] = useState<CrmOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    let active = true;
    crmApi.getOffers()
      .then(d => { if (active) setOffers(d); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return offers;
    return offers.filter(o =>
      o.fileCode.toLowerCase().includes(t) ||
      o.clientName.toLowerCase().includes(t) ||
      o.bankName.toLowerCase().includes(t));
  }, [offers, q]);

  if (loading) return (<div className="space-y-6"><PageHeader title="Oferte bancare" /><SkeletonTable rows={6} /></div>);

  return (
    <div className="space-y-6">
      <PageHeader title="Oferte bancare" subtitle={`${offers.length} oferte comparate`} />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Caută bancă, client sau dosar..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nicio ofertă bancară încă. Se adaugă pe măsură ce potrivești dosare cu bănci." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Bancă</th>
                <th className="px-5 py-3 font-medium">Dosar</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium text-right">Sumă</th>
                <th className="px-5 py-3 font-medium text-right">Comision</th>
                <th className="px-5 py-3 font-medium">Status dosar</th>
                <th className="px-5 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((o, i) => (
                <tr key={`${o.applicationId}-${i}`} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"><Landmark className="h-4 w-4" /></div>
                      <span className="font-medium text-slate-800">{o.bankName}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-700">#{o.fileCode}</td>
                  <td className="px-5 py-3 text-slate-600">{o.clientName}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-slate-700">{money(o.requestedAmount)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{o.commissionPercent}%</td>
                  <td className="px-5 py-3"><StatusPill status={o.status} /></td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-400">{dateShort(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
