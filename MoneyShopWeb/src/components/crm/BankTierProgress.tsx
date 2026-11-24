import type { BankStatsItem } from '@/types/crm.types';
import type { BankTierStatus } from '@/types/commission.types';
import { money } from '@/pages/crm/crmHelpers';

const pct = (n: number) => `${n.toLocaleString('ro-RO')}%`;

function TierLine({ bank, tier }: { bank: BankStatsItem; tier: BankTierStatus }) {
  const reached = tier.nextFrom == null;
  const progress = tier.nextFrom ? Math.min(100, Math.round((tier.networkAmount / tier.nextFrom) * 100)) : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-slate-600">{tier.creditType === 'NP' ? 'Nevoi personale' : 'Ipotecar'}</span>
        <span className="font-semibold text-slate-800">{tier.currentPercent != null ? pct(tier.currentPercent) : 'sub primul prag'}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${bank.name}, ${tier.creditType}: ${progress}% până la următorul prag`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${reached ? 'bg-emerald-500' : 'bg-brand-primary'}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {reached
          ? `Pragul maxim atins · rețea ${money(tier.networkAmount)}`
          : `încă ${money(tier.remainingToNext ?? 0)} în rețea până la ${pct(tier.nextPercent ?? 0)}`}
      </div>
    </div>
  );
}

/** The tier the network reached this month and the volume still needed for the next one, per credit type. */
export function BankTierProgress({ bank }: { bank: BankStatsItem }) {
  return (
    <div className="space-y-2">
      {bank.tiers.map(t => <TierLine key={t.creditType} bank={bank} tier={t} />)}
    </div>
  );
}
