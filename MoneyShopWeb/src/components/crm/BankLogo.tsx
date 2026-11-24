import { useState } from 'react';

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

export function BankLogo({ name, compact = false }: { name: string; compact?: boolean }) {
  const [broken, setBroken] = useState(false);
  const src = logoFor(name);
  if (!src || broken) return <span className={`truncate font-bold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>{name}</span>;
  return <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className={`${compact ? 'h-6 max-w-[6.5rem]' : 'h-8 max-w-[8rem]'} w-auto object-contain`} />;
}
