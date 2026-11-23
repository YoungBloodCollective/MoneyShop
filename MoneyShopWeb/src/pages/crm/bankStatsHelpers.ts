import type { BankStatsItem } from '@/types/crm.types';

const BUCHAREST = 'Europe/Bucharest';

export function currentMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUCHAREST, year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function thresholdPct(bank: BankStatsItem): number | null {
  return bank.threshold && bank.threshold > 0 ? (bank.network.disbursedAmount / bank.threshold) * 100 : null;
}

/** The bank with a threshold that is closest to it without having reached it; if all reached, the highest. */
export function closestToThreshold(banks: BankStatsItem[]): { bank: BankStatsItem; pct: number } | null {
  const rated = banks.flatMap(bank => {
    const pct = thresholdPct(bank);
    return pct == null ? [] : [{ bank, pct }];
  });
  if (rated.length === 0) return null;
  const below = rated.filter(r => r.pct < 100).sort((a, b) => b.pct - a.pct);
  return below[0] ?? rated.sort((a, b) => b.pct - a.pct)[0];
}
