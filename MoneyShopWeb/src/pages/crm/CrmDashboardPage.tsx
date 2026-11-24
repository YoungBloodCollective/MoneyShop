import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, FolderKanban, CheckCircle2, Wallet, TrendingUp,
  FileText, Clock, AlertTriangle, Cake, ArrowUpRight, ArrowDownRight, ChevronRight, PenLine, FileSignature,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCrmPath } from '@/lib/crmPath';
import { TodayAgenda } from '@/components/crm/appointments/TodayAgenda';
import { WorkBoard } from '@/components/crm/client/WorkBoard';
import { BanksMonthCard } from '@/components/crm/BanksMonthCard';
import { crmApi } from '@/services/api/crmApi';
import type { CrmDashboardSummary } from '@/types/crm.types';
import { ErrorState } from './crmShared';
import { FOCUS_RING } from './crmHelpers';
import { IntakeLinkCard } from '@/components/crm/IntakeLinkCard';

const STATUS_COLORS: Record<string, string> = {
  lucru: '#F59E0B',
  aprobate: '#10B981',
  disbursate: '#6E4CE5',
  respinse: '#F43F5E',
};

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} mil`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}k`;
  return v.toLocaleString('ro-RO');
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'acum';
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `acum ${days} zile`;
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

function KpiCard({
  icon: Icon, label, value, accent, delta, to,
}: {
  icon: typeof Users; label: string; value: string; accent: string; to?: string; delta?: { text: string; title: string; negative: boolean };
}) {
  const cls = 'block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}1A`, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span title={delta.title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${
            delta.negative ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {delta.negative ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />} {delta.text}
          </span>
        )}
      </div>
      <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-sm text-slate-500">
        <span>{label}</span>
        {to && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-primary" />}
      </div>
    </>
  );
  if (!to) return <div className={cls}>{body}</div>;
  return (
    <Link to={to} className={`group ${cls} transition-shadow hover:border-slate-300 hover:shadow-md ${FOCUS_RING}`}>
      {body}
    </Link>
  );
}

const SEVERITY_CLS: Record<string, string> = {
  danger: 'bg-rose-50 text-rose-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-sky-50 text-sky-600',
};

const TASK_ICON: Record<string, typeof FileText> = {
  documents: AlertTriangle,
  approval: Clock,
  acord: FileSignature,
  birthday: Cake,
};

const TASK_LINK: Record<string, string> = {
  documents: '/crm/dosare?status=COMPLETARI',
  approval: '/crm/dosare?seg=lucru',
  acord: '/crm/clienti?seg=acord',
};

export default function CrmDashboardPage() {
  const crm = useCrmPath();
  const [data, setData] = useState<CrmDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    crmApi.getDashboard()
      .then(d => { if (active) { setData(d); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = () => { setLoading(true); setAttempt(a => a + 1); };

  const chartData = useMemo(
    () => (data?.evolution ?? []).map(p => ({
      date: new Date(p.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
      count: p.count,
    })),
    [data],
  );

  const donutTotal = useMemo(
    () => (data?.statusBreakdown ?? []).reduce((s, x) => s + x.count, 0),
    [data],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState message="Nu am putut încărca datele" onRetry={retry} />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Prezentare generală a activității tale</p>
      </div>

      <TodayAgenda />

      <WorkBoard />

      <BanksMonthCard />

      <IntakeLinkCard />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users} label="Clienți activi" accent="#2D2DF0" to={crm("/crm/clienti?seg=toate")}
          value={data.activeClients.toLocaleString('ro-RO')}
          delta={data.activeClientsDeltaPct === 0 ? undefined : {
            text: `${data.activeClientsDeltaPct > 0 ? '+' : ''}${data.activeClientsDeltaPct}% clienți noi`,
            title: 'Clienți noi luna aceasta față de aceeași perioadă a lunii trecute',
            negative: data.activeClientsDeltaPct < 0,
          }}
        />
        <KpiCard icon={FolderKanban} label="Dosare în lucru" accent="#F59E0B" to={crm("/crm/dosare?seg=toate")} value={data.filesInProgress.toLocaleString('ro-RO')} />
        <KpiCard icon={CheckCircle2} label="Aprobate luna aceasta" accent="#10B981" value={data.approvedThisMonth.toLocaleString('ro-RO')} />
        <KpiCard icon={Wallet} label="Volum credite" accent="#6E4CE5" to={crm("/crm/dosare?seg=disbursate")} value={`${formatVolume(data.creditVolume)} lei`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-primary" />
            <h2 className="text-sm font-semibold text-slate-800">Clienți noi (ultimele 30 de zile)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="crmFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2D2DF0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2D2DF0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartData.length / 7))} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                  labelStyle={{ color: '#64748B' }}
                />
                <Area type="monotone" dataKey="count" stroke="#2D2DF0" strokeWidth={2.5} fill="url(#crmFill)" name="Clienți noi" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Status dosare</h2>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusBreakdown} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                  {data.statusBreakdown.map(s => <Cell key={s.key} fill={STATUS_COLORS[s.key] ?? '#CBD5E1'} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-slate-900">{donutTotal}</div>
              <div className="text-xs text-slate-400">total</div>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {data.statusBreakdown.map(s => (
              <Link
                key={s.key}
                to={crm(`/crm/dosare?seg=${encodeURIComponent(s.key)}`)}
                className={`-mx-2 flex items-center justify-between rounded-lg px-2 py-1 text-sm transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.key] ?? '#CBD5E1' }} />
                  <span className="text-slate-600">{s.label}</span>
                </div>
                <span className="font-semibold text-slate-900">{s.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + tasks row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Ultimele activități</h2>
          {data.recentActivities.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nicio activitate recentă</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentActivities.map((a, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                    {a.kind === 'acord' ? <PenLine className="h-4 w-4" /> : <FolderKanban className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{a.title}</div>
                    <div className="text-xs text-slate-400">{relativeTime(a.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Sarcini & remindere</h2>
          <ul className="space-y-3">
            {data.tasks.map((t, i) => {
              const cls = SEVERITY_CLS[t.severity] ?? SEVERITY_CLS.info;
              const Icon = TASK_ICON[t.kind] ?? FileText;
              const link = TASK_LINK[t.kind];
              const to = link ? crm(link) : link;
              const content = (
                <>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm text-slate-700">{t.label}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t.count}</span>
                </>
              );
              return (
                <li key={i}>
                  {to ? (
                    <Link to={to} className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-slate-50 ${FOCUS_RING}`}>{content}</Link>
                  ) : (
                    <div className="flex items-center gap-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
