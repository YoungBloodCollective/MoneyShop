import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, FolderKanban, CheckCircle2, Wallet, TrendingUp,
  FileText, Clock, AlertTriangle, Cake, ArrowUpRight,
} from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmDashboardSummary } from '@/types/crm.types';

const STATUS_COLORS: Record<string, string> = {
  analiza: '#F59E0B',
  banca: '#2D2DF0',
  aprobate: '#10B981',
  debursate: '#6E4CE5',
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
  icon: Icon, label, value, accent, delta,
}: {
  icon: typeof Users; label: string; value: string; accent: string; delta?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}1A`, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="h-3 w-3" /> {delta}
          </span>
        )}
      </div>
      <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

const SEVERITY: Record<string, { icon: typeof FileText; cls: string }> = {
  danger: { icon: AlertTriangle, cls: 'bg-rose-50 text-rose-600' },
  warning: { icon: Clock, cls: 'bg-amber-50 text-amber-600' },
  info: { icon: Cake, cls: 'bg-sky-50 text-sky-600' },
};

export default function CrmDashboardPage() {
  const [data, setData] = useState<CrmDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    crmApi.getDashboard()
      .then(d => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Nu am putut încărca datele. Reîncarcă pagina.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Prezentare generală a activității tale</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users} label="Clienți activi" accent="#2D2DF0"
          value={data.activeClients.toLocaleString('ro-RO')}
          delta={data.activeClientsDeltaPct > 0 ? `+${data.activeClientsDeltaPct}%` : undefined}
        />
        <KpiCard icon={FolderKanban} label="Dosare în lucru" accent="#F59E0B" value={data.filesInProgress.toLocaleString('ro-RO')} />
        <KpiCard icon={CheckCircle2} label="Aprobate luna aceasta" accent="#10B981" value={data.approvedThisMonth.toLocaleString('ro-RO')} />
        <KpiCard icon={Wallet} label="Volum credite" accent="#6E4CE5" value={`${formatVolume(data.creditVolume)} lei`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-primary" />
            <h2 className="text-sm font-semibold text-slate-800">Evoluție dosare (ultimele 30 zile)</h2>
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
                <Area type="monotone" dataKey="count" stroke="#2D2DF0" strokeWidth={2.5} fill="url(#crmFill)" name="Dosare" />
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
          <div className="mt-4 space-y-2">
            {data.statusBreakdown.map(s => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.key] ?? '#CBD5E1' }} />
                  <span className="text-slate-600">{s.label}</span>
                </div>
                <span className="font-semibold text-slate-900">{s.count}</span>
              </div>
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
                    <FileText className="h-4 w-4" />
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
              const s = SEVERITY[t.severity] ?? SEVERITY.info;
              const Icon = s.icon;
              return (
                <li key={i} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm text-slate-700">{t.label}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
