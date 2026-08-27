import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderOpen, TrendingUp, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { brokerProfileApi, brokerReportsApi } from '@/services/api/brokerCrmApi';
import { useBrokerAuthStore } from '@/store/brokerAuthStore';
import type { BrokerStats, BrokerDashboardData } from '@/types/broker.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function BrokerDashboardPage() {
  const { brokerUser } = useBrokerAuthStore();
  const [stats, setStats] = useState<BrokerStats | null>(null);
  const [dashboard, setDashboard] = useState<BrokerDashboardData | null>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      brokerProfileApi.getStats(),
      brokerReportsApi.dashboard(),
      brokerReportsApi.monthly(6),
    ]).then(([s, d, m]) => {
      setStats(s);
      setDashboard(d);
      setMonthly(m);
    }).finally(() => setLoading(false));
  }, []);

  const slug = brokerUser?.brokerProfile?.slug;
  const link = slug ? `https://moneyshop.ro/apply/${slug}` : '';

  function copyLink() {
    if (link) { navigator.clipboard.writeText(link); toast.success('Link copiat!'); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Buna ziua, {brokerUser?.name?.split(' ')[0]}!</p>
      </div>

      {slug && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-indigo-700 mb-0.5">Linkul tau unic de lead-uri</p>
            <p className="text-sm text-indigo-900 font-mono truncate">{link}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={copyLink}
              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-600" title="Copiaza">
              <Copy className="w-4 h-4" />
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-600" title="Deschide">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Lead-uri luna aceasta" value={dashboard?.leadsThisMonth ?? 0}
          sub={`${dashboard?.leadsLastMonth ?? 0} luna trecuta`} color="indigo" />
        <StatCard icon={FolderOpen} label="Dosare active" value={dashboard?.dosareActive ?? 0}
          sub={`${dashboard?.dosareTotal ?? 0} total`} color="blue" />
        <StatCard icon={CheckCircle} label="Aprobate luna aceasta" value={dashboard?.dosareAprobateThisMonth ?? 0}
          sub={`${dashboard?.dosareAprobateTotal ?? 0} total`} color="green" />
        <StatCard icon={TrendingUp} label="Rata conversie" value={`${dashboard?.rataConversie ?? 0}%`}
          sub="lead → aprobat" color="yellow" />
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PlanCard stats={stats} />
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Lead-uri & Dosare (6 luni)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#6366f1" name="Leads" radius={[2, 2, 0, 0]} />
                <Bar dataKey="dosareCreate" fill="#3b82f6" name="Dosare" radius={[2, 2, 0, 0]} />
                <Bar dataKey="dosareAprobate" fill="#10b981" name="Aprobate" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuickAction to="/broker/clients" icon={Users} label="Gestioneaza lead-uri"
          desc="Vezi si gestioneaza clientii tai" />
        <QuickAction to="/broker/dosare" icon={FolderOpen} label="Gestioneaza dosare"
          desc="Pipeline dosare de credit" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center mb-3', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function PlanCard({ stats }: { stats: BrokerStats }) {
  const trialLeft = stats.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(stats.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-4">Plan & Utilizare</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Plan curent</span>
          <span className={clsx('text-xs font-bold px-2 py-1 rounded-full',
            stats.plan === 'Full' ? 'bg-yellow-100 text-yellow-700' :
            stats.plan === 'Basic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
            {stats.plan}
          </span>
        </div>
        {trialLeft !== null && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Trial ramas</span>
            <span className={clsx('text-sm font-semibold', trialLeft <= 5 ? 'text-red-600' : 'text-gray-900')}>
              {trialLeft} zile
            </span>
          </div>
        )}
        <UsageBar label="ANAF" used={stats.anafQueriesUsed} limit={stats.anafQueriesLimit} />
        <UsageBar label="Birou Credit" used={stats.bcQueriesUsed} limit={stats.bcQueriesLimit} />
        {stats.plan !== 'Full' && (
          <Link to="/broker/setari"
            className="block w-full text-center py-2 text-xs font-medium text-brand-primary border border-brand-primary rounded-lg hover:bg-indigo-50 transition-colors mt-2">
            Upgrade plan
          </Link>
        )}
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{used}/{limit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div className={clsx('h-full rounded-full transition-all', pct > 80 ? 'bg-red-500' : 'bg-brand-primary')}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, desc }: any) {
  return (
    <Link to={to}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-primary hover:shadow-sm transition-all group">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
        <Icon className="w-5 h-5 text-brand-primary" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </Link>
  );
}
