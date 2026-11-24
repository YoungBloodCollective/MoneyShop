import { useState } from 'react';

const LOGOS: [RegExp, string][] = [
  [/transilvania|^bt$/i, 'bt.png'],
  [/bcr|comerciala/i, 'bcr.png'],
  [/^brd|societe/i, 'brd.png'],
  [/^ing/i, 'ing.png'],
  [/unicredit/i, 'unicredit.png'],
  [/procredit/i, 'procredit.png'],
  [/libra/i, 'libra.png'],
  [/raiffeisen/i, 'raiffeisen.png'],
  [/garanti/i, 'garanti.png'],
  [/exim/i, 'exim.png'],
  [/patria/i, 'patria-logo.svg'],
  [/^cec/i, 'cec-logo.svg'],
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
