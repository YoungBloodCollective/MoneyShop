import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { crmApi } from '@/services/api/crmApi';
import type { AdminDashboardResult, NetworkSection } from '@/types/crm.types';
import { NetworkCards, NetworkMonthNav } from '@/components/crm/NetworkMirror';
import { currentMonth, monthLabel } from './bankStatsHelpers';
import { moneyShort } from './crmHelpers';
import { ErrorState } from './crmShared';

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function shortMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('ro-RO', { month: 'short', timeZone: 'UTC' });
}

function Trend({ section, color, selected, name }: { section: NetworkSection; color: string; selected: string; name: string }) {
  const data = useMemo(() => section.series.map(p => ({ ...p, label: shortMonth(p.month) })), [section]);
  const total = section.series.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Volum disbursat pe lună</h3>
      <div className="h-56" role="img" aria-label={`${name}: volum disbursat pe ultimele ${section.series.length} luni, în total ${moneyShort(total)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48}
              tickFormatter={(v: number) => (v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v))} />
            <Tooltip
              cursor={{ fill: '#F1F5F9' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
              labelFormatter={(_, p) => monthLabel(String(p?.[0]?.payload?.month ?? ''))}
              formatter={(v, _n, item) => [`${Math.round(Number(v)).toLocaleString('ro-RO')} lei (${item.payload.count} credite)`, 'Disbursat']}
            />
            <Bar dataKey="amount" fill={color} radius={[6, 6, 0, 0]} opacity={0.9} isAnimationActive={false}
              shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { month: string } }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                return <rect x={x} y={y} width={width} height={Math.max(height, 0)} rx={6} fill={color} opacity={payload?.month === selected ? 1 : 0.45} />;
              }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Section({ id, title, subtitle, section, color, selected, children }: {
  id: string; title: string; subtitle: string; section: NetworkSection; color: string; selected: string; children?: React.ReactNode;
}) {
  return (
    <section className="space-y-4" aria-labelledby={id}>
      <div>
        <h2 id={id} className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
      <Trend section={section} color={color} selected={selected} name={title} />
      <NetworkCards summary={section.selected} />
    </section>
  );
}

export default function AdminDashboardPage() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<AdminDashboardResult | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    crmApi.getAdminDashboard(month)
      .then(d => { if (active) { setData(d); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [month, attempt]);

  if (error) return <ErrorState message="Nu am putut încărca datele" onRetry={() => { setError(false); setAttempt(a => a + 1); }} />;
  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-primary border-t-transparent" />
      </div>
    );
  }

  const ms = data.moneyShop;
  const af = data.affiliates;
  const stale = data.selectedMonth !== month;
  return (
    <div className={`space-y-8 ${stale ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Cifre agregate ale rețelei, fără date despre clienți</p>
        </div>
        <NetworkMonthNav month={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Tile label="Volum rețea MoneyShop" value={`${moneyShort(ms.selected.total.amount)}`} hint={`${ms.selected.total.count} credite disbursate`} />
        <Tile label="Volum brokeri afiliați" value={`${moneyShort(af.selected.total.amount)}`} hint={`${af.selected.total.count} credite disbursate`} />
        <Tile label="Comision estimat MoneyShop" value={moneyShort(ms.estimatedCommission ?? 0)} hint="Din comisionul implicit al fiecărei bănci" />
        <Tile label="Brokeri MoneyShop activi" value={String(ms.activeBrokers)} />
        <Tile label="Brokeri afiliați activi" value={String(af.activeBrokers)} />
      </div>

      <Section id="admin-ms-network" title="Rețeaua MoneyShop" subtitle="Brokerii de tip MoneyShop" section={ms} color="#2D2DF0" selected={data.selectedMonth} />
      <Section id="admin-affiliates" title="Brokeri afiliați" subtitle="Brokerii de tip Afiliat, doar totaluri" section={af} color="#6E4CE5" selected={data.selectedMonth} />
    </div>
  );
}
