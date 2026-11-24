import type { BankStatsItem } from '@/types/crm.types';

const pct = (n: number) => `${n.toLocaleString('ro-RO')}%`;

/** The percent that applies to the broker's files at this bank: per credit type when the bank has tiers, one percent otherwise. */
export function appliedPercentLabel(bank: BankStatsItem): string {
  return bank.tiers.length > 0
    ? `NP ${pct(bank.mine.npPercent)} · IP ${pct(bank.mine.ipPercent)}`
    : pct(bank.mine.commissionPercent);
}
