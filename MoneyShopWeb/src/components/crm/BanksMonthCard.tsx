import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Landmark } from 'lucide-react';
import { useCrmPath } from '@/lib/crmPath';
import { crmApi } from '@/services/api/crmApi';
import type { BankStatsResult } from '@/types/crm.types';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';
import { closestToThreshold, currentMonth, lei } from '@/pages/crm/bankStatsHelpers';

/** Dashboard: this month's disbursed volume and estimated commission, and the bank closest to its threshold. */
export function BanksMonthCard() {
  const crm = useCrmPath();
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
    return {
      disbursed: banks.reduce((s, b) => s + b.mine.disbursedAmount, 0),
      commission: banks.reduce((s, b) => s + b.mine.estimatedCommission, 0),
      closest: closestToThreshold(banks),
    };
  }, [stats]);

  if (failed) return null;
  if (!stats) return <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />;

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
        <div>
          <div className="text-xs text-slate-500">Disbursat de mine</div>
          <div className="text-lg font-bold text-slate-900">{lei(summary.disbursed)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Comision estimat</div>
          <div className="text-lg font-bold text-slate-900">{lei(summary.commission)}</div>
        </div>
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
      </div>
    </Link>
  );
}
