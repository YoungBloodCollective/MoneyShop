import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCrmPath } from '@/lib/crmPath';
import { BankLogo } from '@/components/crm/BankLogo';
import { crmApi } from '@/services/api/crmApi';
import type { BankNetworkVolume, BankStatsItem, BankStatsResult, BankVolume } from '@/types/crm.types';
import { EmptyState, ErrorState, PageHeader, SkeletonCards } from './crmShared';
import { FOCUS_RING, money } from './crmHelpers';
import { currentMonth, monthLabel, shiftMonth, thresholdPct } from './bankStatsHelpers';

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
        <span className="text-slate-500">Prag {money(bank.threshold!)}</span>
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

function Split({ v }: { v: Pick<BankNetworkVolume, 'npAmount' | 'npCount' | 'ipAmount' | 'ipCount' | 'unknownAmount' | 'unknownCount'> }) {
  if (v.npAmount == null || v.ipAmount == null) return null;
  return (
    <div className="text-xs text-slate-500">
      NP {money(v.npAmount)} ({v.npCount}) · IP {money(v.ipAmount)} ({v.ipCount})
      {(v.unknownCount ?? 0) > 0 && <> · fără tip {money(v.unknownAmount)} ({v.unknownCount})</>}
    </div>
  );
}

function BankName({ bank, compact = false }: { bank: BankStatsItem; compact?: boolean }) {
  const crm = useCrmPath();
  return <><Link to={crm(`/crm/dosare?seg=disbursate&bank=${bank.bankId}`)} title={`Dosarele disbursate la ${bank.name}`} className={`inline-flex items-center rounded hover:opacity-80 ${FOCUS_RING}`}><BankLogo name={bank.name} compact={compact} /></Link>{!bank.active && <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">inactivă</span>}</>;
}

function Count({ n }: { n?: number | null }) {
  return n == null ? null : <span className="font-normal text-slate-500"> ({n})</span>;
}

function BankCard({ bank, showNetwork }: { bank: BankStatsItem; showNetwork: boolean }) {
  const { network: n, mine: m } = bank;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${bank.active ? '' : 'opacity-70'}`}>
      <div className="font-semibold text-slate-800"><BankName bank={bank} /></div>
      {showNetwork && <div className="mt-2"><ThresholdBar bank={bank} /></div>}
      <dl className="mt-3 space-y-3 text-sm">
        {showNetwork && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Rețea, disbursat</dt>
            <dd className="font-semibold text-slate-800">{money(n.disbursedAmount)}{n.disbursedCount != null && <span className="font-normal text-slate-500"> ({n.disbursedCount} dosare)</span>}</dd>
            <dd><Split v={n} /></dd>
          </div>
        )}
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Ale mele</dt>
          <dd className="font-semibold text-slate-800">{money(m.disbursedAmount)} <span className="font-normal text-slate-500">({m.disbursedCount} dosare)</span></dd>
          <dd><Split v={m} /></dd>
          <dd className="mt-1 text-slate-600">Comision {m.commissionPercent.toLocaleString('ro-RO')}%: <span className="font-semibold text-slate-800">{money(m.estimatedCommission)}</span></dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">În lucru</dt>
          <dd className="text-slate-700">Ale mele: {m.inProgressCount} dosare, {money(m.inProgressAmount)}</dd>
          {n.inProgressCount != null && <dd className="text-slate-500">Rețea: {n.inProgressCount} dosare, {money(n.inProgressAmount)}</dd>}
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
      network: {
        disbursedAmount: banks.reduce((s, b) => s + b.network.disbursedAmount, 0),
        disbursedCount: banks.reduce((s, b) => s + (b.network.disbursedCount ?? 0), 0),
        inProgressCount: banks.reduce((s, b) => s + (b.network.inProgressCount ?? 0), 0),
        detailed: banks.length > 0 && banks.every(b => b.network.disbursedCount != null),
      },
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
              ...(data.showNetwork ? [{ label: 'Disbursat în rețea', value: money(totals.network.disbursedAmount), hint: totals.network.detailed ? `${totals.network.disbursedCount} dosare` : 'rețeaua MoneyShop' }] : []),
              ...(data.hasBrokerProfile ? [
                { label: 'Disbursat de mine', value: money(totals.mine.disbursedAmount), hint: `${totals.mine.disbursedCount} dosare` },
                { label: 'Comision estimat', value: money(totals.commission), hint: 'din dosarele mele' },
              ] : []),
              { label: 'Dosare în lucru', value: String(totals.mine.inProgressCount), hint: totals.network.detailed ? `${money(totals.mine.inProgressAmount)} · rețea ${totals.network.inProgressCount}` : money(totals.mine.inProgressAmount) },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">{c.label}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{c.value}</div>
                <div className="text-xs text-slate-400">{c.hint}</div>
              </div>
            ))}
          </div>

          {data.unattributed.count > 0 && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Neatribuite (toate lunile): {data.unattributed.count} dosare ({money(data.unattributed.amount)}) — alege banca în fișa clientului ca să apară aici.
            </p>
          )}

          <div className="space-y-3 md:hidden">
            {data.banks.map(b => <BankCard key={b.bankId} bank={b} showNetwork={data.showNetwork} />)}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className={TH}>Banca</th>
                  {data.showNetwork && <th className={`${TH} min-w-[11rem]`}>Prag lunar</th>}
                  {data.showNetwork && <th className={TH}>Rețea, disbursat</th>}
                  <th className={TH}>Ale mele</th>
                  <th className={TH}>Comision</th>
                  <th className={TH}>În lucru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.banks.map(b => (
                  <tr key={b.bankId} className={b.active ? '' : 'opacity-70'}>
                    <td className={`${TD} font-semibold text-slate-800`}><BankName bank={b} compact /></td>
                    {data.showNetwork && <td className={TD}><ThresholdBar bank={b} /></td>}
                    {data.showNetwork && (
                      <td className={TD}>
                        <div className="font-semibold text-slate-800">{money(b.network.disbursedAmount)}<Count n={b.network.disbursedCount} /></div>
                        <Split v={b.network} />
                      </td>
                    )}
                    <td className={TD}>
                      <div className="font-semibold text-slate-800">{money(b.mine.disbursedAmount)} <span className="font-normal text-slate-500">({b.mine.disbursedCount})</span></div>
                      <Split v={b.mine} />
                    </td>
                    <td className={TD}>
                      <div className="font-semibold text-slate-800">{money(b.mine.estimatedCommission)}</div>
                      <div className="text-xs text-slate-500">{b.mine.commissionPercent.toLocaleString('ro-RO')}%</div>
                    </td>
                    <td className={TD}>
                      <div className="text-slate-700">{b.mine.inProgressCount} · {money(b.mine.inProgressAmount)}</div>
                      {b.network.inProgressCount != null && <div className="text-xs text-slate-500">rețea {b.network.inProgressCount} · {money(b.network.inProgressAmount)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                <tr>
                  <td className={TD}>Total</td>
                  {data.showNetwork && <td className={TD} />}
                  {data.showNetwork && <td className={TD}>{money(totals.network.disbursedAmount)}{totals.network.detailed && <span className="font-normal text-slate-500"> ({totals.network.disbursedCount})</span>}</td>}
                  <td className={TD}>{money(totals.mine.disbursedAmount)} <span className="font-normal text-slate-500">({totals.mine.disbursedCount})</span></td>
                  <td className={TD}>{money(totals.commission)}</td>
                  <td className={TD}>{totals.mine.inProgressCount} · {money(totals.mine.inProgressAmount)}</td>
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
                        <div className="mt-1 text-sm font-semibold text-slate-800">{money(b.disbursedAmount)} <span className="font-normal text-slate-500">({b.disbursedCount} dosare)</span></div>
                        <div className="text-xs text-slate-500">NP {money(b.npAmount)} ({b.npCount}) · IP {money(b.ipAmount)} ({b.ipCount})</div>
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
                            <td className={TD}>{money(b.disbursedAmount)}</td>
                            <td className={TD}>{b.disbursedCount}</td>
                            <td className={TD}>{money(b.npAmount)} <span className="text-slate-500">({b.npCount})</span></td>
                            <td className={TD}>{money(b.ipAmount)} <span className="text-slate-500">({b.ipCount})</span></td>
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
