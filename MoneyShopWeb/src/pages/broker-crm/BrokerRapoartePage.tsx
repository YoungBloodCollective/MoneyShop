import { useEffect, useState } from 'react';
import { brokerReportsApi } from '@/services/api/brokerCrmApi';
import type { BrokerDashboardData, MonthlyData } from '@/types/broker.types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList
} from 'recharts';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function BrokerRapoartePage() {
  const [dashboard, setDashboard] = useState<BrokerDashboardData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      brokerReportsApi.dashboard(),
      brokerReportsApi.monthly(6),
      brokerReportsApi.conversionFunnel(),
    ]).then(([d, m, f]) => {
      setDashboard(d);
      setMonthly(m);
      setFunnel(f.etape ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapoarte & Analize</h1>
        <p className="text-sm text-gray-500 mt-0.5">Performanta ta ca broker</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total lead-uri" value={dashboard?.leadsThisMonth ?? 0} sub="luna aceasta" />
        <MetricCard label="Dosare active" value={dashboard?.dosareActive ?? 0} sub="in lucru" />
        <MetricCard label="Rata conversie" value={`${dashboard?.rataConversie ?? 0}%`} sub="lead → aprobat" />
        <MetricCard label="Suma aprobata" value={`${(dashboard?.sumaAprobataThisMonth ?? 0).toLocaleString('ro-RO')} RON`} sub="luna aceasta" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Lead-uri & Dosare (6 luni)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="leads" fill="#6366f1" name="Lead-uri" radius={[3, 3, 0, 0]} />
              <Bar dataKey="dosareCreate" fill="#3b82f6" name="Dosare" radius={[3, 3, 0, 0]} />
              <Bar dataKey="dosareAprobate" fill="#10b981" name="Aprobate" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tip de credit">
          {(dashboard?.dosarePerTip ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dashboard?.dosarePerTip.map(d => ({ name: d.tip, value: d.count }))}
                  cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {(dashboard?.dosarePerTip ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Date insuficiente</div>
          )}
        </ChartCard>

        <ChartCard title="Evolutie lunara (lead-uri)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Lead-uri" />
              <Line type="monotone" dataKey="dosareAprobate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Aprobate" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Funnel conversie">
          {funnel.length > 0 ? (
            <div className="space-y-2 pt-4">
              {funnel.map((f, i) => {
                const max = funnel[0]?.valoare ?? 1;
                const pct = max > 0 ? (f.valoare / max) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{f.etapa}</span>
                      <span className="font-semibold">{f.valoare}</span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg transition-all" style={{
                        width: `${pct}%`,
                        background: `hsl(${240 - i * 25}, 70%, ${55 + i * 5}%)`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Date insuficiente</div>
          )}
        </ChartCard>
      </div>

      {(dashboard?.dosarePerStatus ?? []).length > 0 && (
        <ChartCard title="Dosare pe status">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {dashboard?.dosarePerStatus.map((s, i) => (
              <div key={s.status} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.status}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: any; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}
