import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { NetworkBankCard, NetworkMonthSummary } from '@/types/crm.types';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';
import { currentMonth, monthLabel, shiftMonth } from '@/pages/crm/bankStatsHelpers';

const LOGOS: [RegExp, string][] = [
  [/transilvania|^bt$/i, 'bt.svg'],
  [/bcr|comerciala/i, 'bcr.svg'],
  [/^brd|societe/i, 'brd.svg'],
  [/^ing/i, 'ing.svg'],
  [/unicredit/i, 'unicredit.svg'],
  [/procredit/i, 'procredit.svg'],
  [/libra/i, 'libra.svg'],
  [/exim/i, 'eximbank.svg'],
  [/patria/i, 'patria.svg'],
  [/raiffeisen/i, 'raiffeisen.svg'],
  [/garanti/i, 'garanti.png'],
  [/^cec/i, 'cec.svg'],
  [/first/i, 'firstbank.svg'],
  [/alpha/i, 'alpha.svg'],
];

function logoFor(bank: string): string | null {
  const hit = LOGOS.find(([re]) => re.test(bank.trim()));
  return hit ? `/images/partners/${hit[1]}` : null;
}

function amount(v: number): string {
  return Math.round(v).toLocaleString('ro-RO');
}

function BankLogo({ name }: { name: string }) {
  const [broken, setBroken] = useState(false);
  const src = logoFor(name);
  if (!src || broken) return <span className="truncate text-base font-bold text-slate-900">{name}</span>;
  return <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className="h-8 w-auto max-w-[8rem] object-contain" />;
}

function Row({ label, value, count }: { label: string; value: number; count: number }) {
  const zero = value === 0 && count === 0;
  return (
    <div className={`flex items-baseline justify-between gap-3 text-sm ${zero ? 'text-slate-400' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span className="tabular-nums">
        <span className={zero ? '' : 'font-semibold text-slate-900'}>{zero ? '0' : `${amount(value)} lei`}</span>
        {!zero && <span className="ml-1 text-slate-500">({count})</span>}
      </span>
    </div>
  );
}

export function NetworkBankCardView({ bank }: { bank: NetworkBankCard }) {
  const zero = bank.count === 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 min-w-0 items-center"><BankLogo name={bank.bankName} /></div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${zero ? 'text-slate-300' : 'text-slate-900'}`}>{zero ? '0' : amount(bank.amount)}</div>
          <div className="text-xs text-slate-500">{bank.count} {bank.count === 1 ? 'credit' : 'credite'}</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        <Row label="Ipotecar" value={bank.ipAmount} count={bank.ipCount} />
        <Row label="Nevoi personale" value={bank.npAmount} count={bank.npCount} />
      </div>
    </div>
  );
}

export function NetworkMonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const atCurrent = month >= currentMonth();
  const btn = `flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`;
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={btn} aria-label="Luna anterioară" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[9rem] text-center text-base font-semibold text-slate-900" aria-live="polite">{monthLabel(month).toLowerCase()}</span>
      <button type="button" className={btn} aria-label="Luna următoare" disabled={atCurrent} onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function NetworkCards({ summary }: { summary: NetworkMonthSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {summary.banks.map(b => <NetworkBankCardView key={`${b.bankId ?? 'x'}-${b.bankName}`} bank={b} />)}
    </div>
  );
}

/** Broker dashboard section: the MoneyShop network month mirror. Render only for MoneyShop-type brokers. */
export function MoneyShopNetworkSection() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<NetworkMonthSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    crmApi.getNetwork(month)
      .then(d => { if (active) { setData(d); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [month]);

  if (failed) return null;
  return (
    <section className="space-y-4" aria-labelledby="ms-network-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ms-network-title" className="text-lg font-bold text-slate-900">Rețeaua MoneyShop</h2>
          <p className="text-sm text-slate-500">Credite disbursate în rețea, pe bancă. Doar totaluri.</p>
        </div>
        <NetworkMonthNav month={month} onChange={setMonth} />
      </div>
      {data && data.month === month
        ? <NetworkCards summary={data} />
        : <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />}
    </section>
  );
}
