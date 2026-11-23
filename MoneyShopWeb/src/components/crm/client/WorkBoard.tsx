import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlarmClock, Building2, Check, ChevronRight } from 'lucide-react';
import { useCrmPath } from '@/lib/crmPath';
import { crmApi } from '@/services/api/crmApi';
import { apiErrorMessage } from '@/services/api/brokersApi';
import type { CrmWorkBoard } from '@/types/crm.types';
import { money, dateShort, FOCUS_RING } from '@/pages/crm/crmHelpers';
import { BANK_FILE_STAGES, CLOSED_BANK_STAGES, dueLabel } from './clientWorkLabels';
import { CreditTypePill, StagePill } from './ClientWorkSection';

function formatAmount(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} mil lei`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}k lei`;
  return `${v.toLocaleString('ro-RO')} lei`;
}

/** Dashboard: the broker's bank files by stage and their open tasks. */
export function WorkBoard() {
  const crm = useCrmPath();
  const [board, setBoard] = useState<CrmWorkBoard | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    crmApi.getWorkBoard()
      .then(b => { if (active) setBoard(b); })
      .catch(() => { if (active) setBoard({ bankFiles: [], openTasks: [] }); });
    return () => { active = false; };
  }, []);

  const stages = useMemo(() => BANK_FILE_STAGES.map(s => {
    const files = (board?.bankFiles ?? []).filter(f => f.status === s.key);
    return { ...s, count: files.length, amount: files.reduce((sum, f) => sum + f.amount, 0) };
  }), [board]);

  if (!board) return <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />;

  const inProgress = board.bankFiles.filter(f => !CLOSED_BANK_STAGES.includes(f.status));
  const listed = stage ? board.bankFiles.filter(f => f.status === stage) : inProgress;
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const overdue = board.openTasks.filter(t => new Date(t.dueAt).getTime() < now).length;
  const today = board.openTasks.filter(t => { const d = new Date(t.dueAt).getTime(); return d >= now && d <= endOfToday.getTime(); }).length;

  const markDone = async (id: number) => {
    try {
      await crmApi.setTaskDone(id, true);
      setBoard(b => (b ? { ...b, openTasks: b.openTasks.filter(t => t.id !== id) } : b));
      toast.success('Task făcut');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut actualiza taskul'));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-primary" />
            <h2 className="text-sm font-semibold text-slate-800">Dosare bancare</h2>
          </div>
          <span className="text-xs text-slate-500">
            {inProgress.length} în lucru · {formatAmount(inProgress.reduce((s, f) => s + f.amount, 0))}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stages.map(s => {
            const on = stage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStage(on ? null : s.key)}
                aria-pressed={on}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${FOCUS_RING} ${on ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-100 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.label}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900">{s.count}</div>
                <div className="text-xs text-slate-400">{s.count ? formatAmount(s.amount) : '—'}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {stage ? BANK_FILE_STAGES.find(s => s.key === stage)?.label : 'În lucru'}
          </div>
          {listed.length === 0 ? (
            <p className="py-3 text-sm text-slate-400">
              {board.bankFiles.length === 0 ? 'Niciun dosar bancar. Le adaugi din fișa clientului → Dosare bancare.' : 'Niciun dosar în acest stadiu.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {listed.slice(0, 12).map(f => (
                <li key={f.id}>
                  <Link to={crm(`/crm/clienti/${f.userId}`)} className={`-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50 ${FOCUS_RING}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{f.clientName ?? `Client #${f.userId}`}</div>
                      <div className="truncate text-xs text-slate-400">{f.bankName} <CreditTypePill type={f.creditType} /> · {money(f.amount)} · din {dateShort(f.statusChangedAt)}</div>
                    </div>
                    <StagePill status={f.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlarmClock className="h-4 w-4 text-brand-primary" />
            <h2 className="text-sm font-semibold text-slate-800">Taskurile mele</h2>
          </div>
          <span className="text-xs text-slate-500">
            {overdue > 0 && <span className="font-medium text-rose-600">{overdue} întârziate · </span>}{today} azi
          </span>
        </div>
        {board.openTasks.length === 0 ? (
          <p className="py-3 text-sm text-slate-400">Niciun task deschis. Le adaugi din fișa clientului.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {board.openTasks.slice(0, 10).map(t => {
              const late = new Date(t.dueAt).getTime() < now;
              return (
                <li key={t.id} className="flex items-start gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => markDone(t.id)}
                    aria-label={`Marchează făcut: ${t.title}`}
                    className={`group mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white hover:border-emerald-500 ${FOCUS_RING}`}
                  >
                    <Check className="h-3.5 w-3.5 text-transparent group-hover:text-emerald-500" />
                  </button>
                  <Link to={crm(`/crm/clienti/${t.userId}`)} className={`min-w-0 flex-1 rounded ${FOCUS_RING}`}>
                    <div className="truncate text-sm font-medium text-slate-800 hover:text-brand-primary">{t.title}</div>
                    <div className={`truncate text-xs ${late ? 'font-medium text-rose-600' : 'text-slate-400'}`}>
                      {t.clientName ?? `Client #${t.userId}`} · {dueLabel(t.dueAt)}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
