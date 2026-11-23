import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Landmark } from 'lucide-react';
import { isAdminWorkspace, useCrmPath } from '@/lib/crmPath';
import { crmApi } from '@/services/api/crmApi';
import type { BankStatsResult } from '@/types/crm.types';
import { FOCUS_RING, money } from '@/pages/crm/crmHelpers';
import { closestToThreshold, currentMonth } from '@/pages/crm/bankStatsHelpers';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/**
 * Dashboard: this month's bank numbers. A broker sees their own disbursed volume, commission and open files;
 * the Super Admin shell (or an account without a broker profile) sees the network and the top brokers.
 */
export function BanksMonthCard() {
  const crm = useCrmPath();
  const { pathname } = useLocation();
  const adminShell = isAdminWorkspace(pathname);
  const [stats, setStats] = useState<BankStatsResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    crmApi.getBankStats(currentMonth())
      .then(s => { if (active) setStats(s); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    const banks = stats?.banks ?? [];
    const sum = (pick: (b: (typeof banks)[number]) => number) => banks.reduce((s, b) => s + pick(b), 0);
    return {
      network: sum(b => b.network.disbursedAmount),
      disbursed: sum(b => b.mine.disbursedAmount),
      commission: sum(b => b.mine.estimatedCommission),
      inProgressCount: sum(b => b.mine.inProgressCount),
      inProgressAmount: sum(b => b.mine.inProgressAmount),
      np: sum(b => b.mine.npAmount),
      ip: sum(b => b.mine.ipAmount),
      closest: closestToThreshold(banks.filter(b => b.active)),
      topBrokers: (stats?.byBroker ?? []).slice(0, 3),
    };
  }, [stats]);

  if (failed) return null;
  if (!stats) return <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />;

  const networkView = adminShell || !stats.hasBrokerProfile;
  const closest = summary.closest;
  return (
    <Link to={crm('/crm/banci')} className={`group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md ${FOCUS_RING}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-brand-primary" />
          <h2 className="text-sm font-semibold text-slate-800">Bănci luna aceasta</h2>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-primary" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {networkView ? (
          <Stat label="Disbursat în rețea" value={money(summary.network)} />
        ) : (
          <>
            <Stat label="Disbursat de mine" value={money(summary.disbursed)} hint={`NP ${money(summary.np)} · IP ${money(summary.ip)}`} />
            <Stat label="Comision estimat" value={money(summary.commission)} hint={`în lucru: ${summary.inProgressCount} dosare · ${money(summary.inProgressAmount)}`} />
          </>
        )}
        <div>
          <div className="text-xs text-slate-500">Cea mai apropiată de prag</div>
          {closest ? (
            <>
              <div className="text-sm font-semibold text-slate-800">{closest.bank.name}: {Math.round(closest.pct)}%</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className={`h-full rounded-full ${closest.pct >= 100 ? 'bg-emerald-500' : 'bg-brand-primary'}`} style={{ width: `${Math.min(100, closest.pct)}%` }} />
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Niciun prag setat</div>
          )}
        </div>
        {networkView && stats.byBroker != null && (
          <div>
            <div className="text-xs text-slate-500">Top brokeri</div>
            {summary.topBrokers.length === 0 ? (
              <div className="text-sm text-slate-400">Niciun credit disbursat</div>
            ) : (
              <ol className="space-y-0.5 text-sm">
                {summary.topBrokers.map(b => (
                  <li key={b.brokerProfileId} className="flex justify-between gap-2">
                    <span className="truncate text-slate-700">{b.brokerName}</span>
                    <span className="shrink-0 font-semibold text-slate-800">{money(b.disbursedAmount)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
