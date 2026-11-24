import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useCrmPath } from '@/lib/crmPath';
import { crmApi } from '@/services/api/crmApi';
import type { BrokerTargetsResult, TargetProgress } from '@/types/crm.types';
import { FOCUS_RING, moneyShort } from '@/pages/crm/crmHelpers';

const RADIUS = 38;
const STROKE = 11;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK = '#E2E8F0';

function Donut({ title, color, progress }: { title: string; color: string; progress: TargetProgress }) {
  const { achieved, target } = progress;
  const ratio = target > 0 ? achieved / target : 0;
  const pct = Math.floor(ratio * 100);
  const reached = ratio >= 1;
  const filled = Math.min(ratio, 1) * CIRCUMFERENCE;
  const label = reached
    ? `${title}: obiectiv atins, ${moneyShort(achieved)} din ${moneyShort(target)}, ${pct}%`
    : `${title}: ${moneyShort(achieved)} din ${moneyShort(target)}, ${pct}%, mai ai ${moneyShort(target - achieved)} până la obiectiv`;

  return (
    <div className="flex min-w-0 flex-col items-center rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center shadow-sm sm:px-4 sm:py-5">
      <h2 className="text-xs font-semibold text-slate-800 sm:text-sm">{title}</h2>
      <div className="relative mt-3 aspect-square w-full max-w-[9rem]">
        <svg viewBox="0 0 100 100" role="img" aria-label={label} className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke={TRACK} strokeWidth={STROKE} />
          <circle
            cx="50" cy="50" r={RADIUS} fill="none" stroke={reached ? '#10B981' : color} strokeWidth={STROKE}
            strokeLinecap={filled > 0 && !reached ? 'round' : 'butt'}
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          {reached ? <Check className="mb-0.5 h-4 w-4 text-emerald-500 sm:h-5 sm:w-5" strokeWidth={3} /> : null}
          <span className="text-base font-bold leading-none text-slate-900 sm:text-2xl">{pct}%</span>
        </div>
      </div>
      <div className="mt-3 text-sm font-bold leading-tight text-slate-900 sm:text-lg" aria-hidden="true">{moneyShort(achieved)}</div>
      <div className="text-[11px] leading-tight text-slate-500 sm:text-xs" aria-hidden="true">din {moneyShort(target)}</div>
      <div
        className={`mt-1.5 text-[11px] font-semibold leading-tight sm:text-xs ${reached ? 'text-emerald-600' : 'text-slate-600'}`}
        aria-hidden="true"
      >
        {reached ? 'Obiectiv atins!' : (
          <>
            mai ai {moneyShort(target - achieved)}<span className="hidden sm:inline"> până la obiectiv</span>
          </>
        )}
      </div>
    </div>
  );
}

export function TargetDonuts() {
  const crm = useCrmPath();
  const [data, setData] = useState<BrokerTargetsResult | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'hidden'>('loading');

  useEffect(() => {
    let active = true;
    crmApi.getMyTargets()
      .then(d => { if (active) { setData(d); setState('ready'); } })
      .catch(() => { if (active) setState('hidden'); });
    return () => { active = false; };
  }, []);

  if (state === 'hidden') return null;
  if (state === 'loading' || !data) return <div className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white sm:h-72" />;

  return (
    <section aria-label="Obiectivele lunii">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Donut title="Nevoi personale" color="#2D2DF0" progress={data.np} />
        <Donut title="Ipotecar" color="#6E4CE5" progress={data.ip} />
        <Donut title="Comision" color="#F59E0B" progress={data.commission} />
      </div>
      <div className="mt-2 text-right text-xs text-slate-500">
        <Link to={crm('/crm/setari')} className={`rounded font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>Schimbă obiectivele</Link>
      </div>
    </section>
  );
}
