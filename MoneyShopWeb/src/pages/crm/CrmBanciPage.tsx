import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { BankStatsItem, BankStatsResult, BankVolume } from '@/types/crm.types';
import { EmptyState, ErrorState, PageHeader, SkeletonCards } from './crmShared';
import { FOCUS_RING } from './crmHelpers';
import { currentMonth, lei, monthLabel, shiftMonth, thresholdPct } from './bankStatsHelpers';

function sumVolume(items: BankVolume[]): BankVolume {
  return items.reduce<BankVolume>((t, v) => ({
    disbursedAmount: t.disbursedAmount + v.disbursedAmount,
    disbursedCount: t.disbursedCount + v.disbursedCount,
    npAmount: t.npAmount + v.npAmount,
    npCount: t.npCount + v.npCount,
    ipAmount: t.ipAmount + v.ipAmount,
    ipCount: t.ipCount + v.ipCount,
    unknownAmount: t.unknownAmount + v.unknownAmount,
    unknownCount: t.unknownCount + v.unknownCount,
    inProgressAmount: t.inProgressAmount + v.inProgressAmount,
    inProgressCount: t.inProgressCount + v.inProgressCount,
  }), {
    disbursedAmount: 0, disbursedCount: 0, npAmount: 0, npCount: 0, ipAmount: 0, ipCount: 0,
    unknownAmount: 0, unknownCount: 0, inProgressAmount: 0, inProgressCount: 0,
  });
}

function ThresholdBar({ bank }: { bank: BankStatsItem }) {
  const pct = thresholdPct(bank);
  if (pct == null) return <span className="text-xs text-slate-400">Fără prag setat</span>;
  const reached = pct >= 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-500">Prag {lei(bank.threshold!)}</span>
        <span className={`font-semibold ${reached ? 'text-emerald-600' : 'text-slate-700'}`}>{Math.round(pct)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${bank.name}: ${Math.round(pct)}% din prag`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(pct))}
        className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${reached ? 'bg-emerald-500' : 'bg-brand-primary'}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function Split({ v }: { v: BankVolume }) {
  return (
    <div className="text-xs text-slate-500">
      NP {lei(v.npAmount)} ({v.npCount}) · IP {lei(v.ipAmount)} ({v.ipCount})
      {v.unknownCount > 0 && <> · fără tip {lei(v.unknownAmount)} ({v.unknownCount})</>}
    </div>
  );
}

function BankCard({ bank }: { bank: BankStatsItem }) {
  const { network: n, mine: m } = bank;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="font-semibold text-slate-800">{bank.name}</div>
      <div className="mt-2"><ThresholdBar bank={bank} /></div>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Rețea, disbursat</dt>
          <dd className="font-semibold text-slate-800">{lei(n.disbursedAmount)} <span className="font-normal text-slate-500">({n.disbursedCount} dosare)</span></dd>
          <dd><Split v={n} /></dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Ale mele</dt>
          <dd className="font-semibold text-slate-800">{lei(m.disbursedAmount)} <span className="font-normal text-slate-500">({m.disbursedCount} dosare)</span></dd>
          <dd><Split v={m} /></dd>
          <dd className="mt-1 text-slate-600">Comision {m.commissionPercent.toLocaleString('ro-RO')}%: <span className="font-semibold text-slate-800">{lei(m.estimatedCommission)}</span></dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">În lucru (rețea / ale mele)</dt>
          <dd className="text-slate-700">{n.inProgressCount} dosare, {lei(n.inProgressAmount)} / {m.inProgressCount} dosare, {lei(m.inProgressAmount)}</dd>
        </div>
      </dl>
    </div>
  );
}

const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
const TD = 'px-4 py-3 align-top';

export default function CrmBanciPage() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<BankStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const thisMonth = currentMonth();

  useEffect(() => {
    let active = true;
    crmApi.getBankStats(month)
      .then(d => { if (active) { setData(d); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, attempt]);

  const go = (next: string) => { setLoading(true); setMonth(next); };

  const totals = useMemo(() => {
    const banks = data?.banks ?? [];
    return {
      network: sumVolume(banks.map(b => b.network)),
      mine: sumVolume(banks.map(b => b.mine)),
      commission: banks.reduce((s, b) => s + b.mine.estimatedCommission, 0),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bănci"
        subtitle="Creditele disbursate pe bancă în luna aleasă, față de pragurile lunare"
        action={
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => go(shiftMonth(month, -1))} aria-label="Luna anterioară" className={`rounded-lg p-2 text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[8.5rem] text-center text-sm font-semibold text-slate-800" aria-live="polite">{monthLabel(month)}</span>
            <button type="button" onClick={() => go(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Luna următoare" className={`rounded-lg p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30 ${FOCUS_RING}`}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {error ? (
        <ErrorState message="Nu am putut încărca datele băncilor" onRetry={() => { setLoading(true); setAttempt(a => a + 1); }} />
      ) : loading || !data ? (
        <SkeletonCards count={4} />
      ) : data.banks.length === 0 ? (
        <EmptyState message="Nu există bănci active în catalog. Super Adminul le adaugă din Setări." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Disbursat în rețea', value: lei(totals.network.disbursedAmount), hint: `${totals.network.disbursedCount} dosare` },
              { label: 'Disbursat de mine', value: lei(totals.mine.disbursedAmount), hint: `${totals.mine.disbursedCount} dosare` },
              { label: 'Comision estimat', value: lei(totals.commission), hint: data.hasBrokerProfile ? 'din dosarele mele' : 'fără profil de broker' },
              { label: 'Dosare în lucru', value: String(totals.mine.inProgressCount), hint: `${lei(totals.mine.inProgressAmount)} · rețea ${totals.network.inProgressCount}` },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">{c.label}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{c.value}</div>
                <div className="text-xs text-slate-400">{c.hint}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 md:hidden">
            {data.banks.map(b => <BankCard key={b.bankId} bank={b} />)}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className={TH}>Banca</th>
                  <th className={`${TH} min-w-[11rem]`}>Prag lunar</th>
                  <th className={TH}>Rețea, disbursat</th>
                  <th className={TH}>Ale mele</th>
                  <th className={TH}>Comision</th>
                  <th className={TH}>În lucru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.banks.map(b => (
                  <tr key={b.bankId}>
                    <td className={`${TD} font-semibold text-slate-800`}>{b.name}</td>
                    <td className={TD}><ThresholdBar bank={b} /></td>
                    <td className={TD}>
                      <div className="font-semibold text-slate-800">{lei(b.network.disbursedAmount)} <span className="font-normal text-slate-500">({b.network.disbursedCount})</span></div>
                      <Split v={b.network} />
                    </td>
                    <td className={TD}>
                      <div className="font-semibold text-slate-800">{lei(b.mine.disbursedAmount)} <span className="font-normal text-slate-500">({b.mine.disbursedCount})</span></div>
                      <Split v={b.mine} />
                    </td>
                    <td className={TD}>
                      <div className="font-semibold text-slate-800">{lei(b.mine.estimatedCommission)}</div>
                      <div className="text-xs text-slate-500">{b.mine.commissionPercent.toLocaleString('ro-RO')}%</div>
                    </td>
                    <td className={TD}>
                      <div className="text-slate-700">{b.mine.inProgressCount} · {lei(b.mine.inProgressAmount)}</div>
                      <div className="text-xs text-slate-500">rețea {b.network.inProgressCount} · {lei(b.network.inProgressAmount)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                <tr>
                  <td className={TD}>Total</td>
                  <td className={TD} />
                  <td className={TD}>{lei(totals.network.disbursedAmount)} <span className="font-normal text-slate-500">({totals.network.disbursedCount})</span></td>
                  <td className={TD}>{lei(totals.mine.disbursedAmount)} <span className="font-normal text-slate-500">({totals.mine.disbursedCount})</span></td>
                  <td className={TD}>{lei(totals.commission)}</td>
                  <td className={TD}>{totals.mine.inProgressCount} · {lei(totals.mine.inProgressAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {data.byBroker && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">Pe brokeri</h2>
              {data.byBroker.length === 0 ? (
                <EmptyState message="Niciun credit disbursat în această lună." />
              ) : (
                <>
                  <div className="space-y-2 md:hidden">
                    {data.byBroker.map(b => (
                      <div key={b.brokerProfileId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="font-semibold text-slate-800">{b.brokerName}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{lei(b.disbursedAmount)} <span className="font-normal text-slate-500">({b.disbursedCount} dosare)</span></div>
                        <div className="text-xs text-slate-500">NP {lei(b.npAmount)} ({b.npCount}) · IP {lei(b.ipAmount)} ({b.ipCount})</div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-100 bg-slate-50">
                        <tr>
                          <th className={TH}>Broker</th>
                          <th className={TH}>Disbursat</th>
                          <th className={TH}>Dosare</th>
                          <th className={TH}>NP</th>
                          <th className={TH}>IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.byBroker.map(b => (
                          <tr key={b.brokerProfileId}>
                            <td className={`${TD} font-semibold text-slate-800`}>{b.brokerName}</td>
                            <td className={TD}>{lei(b.disbursedAmount)}</td>
                            <td className={TD}>{b.disbursedCount}</td>
                            <td className={TD}>{lei(b.npAmount)} <span className="text-slate-500">({b.npCount})</span></td>
                            <td className={TD}>{lei(b.ipAmount)} <span className="text-slate-500">({b.ipCount})</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
