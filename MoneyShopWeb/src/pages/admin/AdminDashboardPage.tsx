import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, TrendingUp, Clock, CheckCircle, XCircle,
  Banknote, FileText, UserCheck, BarChart3, ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '@/services/api/adminApi';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';
import type { Application } from '@/types/application.types';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getApplications().then(apps => {
      setApplications(apps);
    }).finally(() => setLoading(false));
  }, []);

  // Compute stats
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'INREGISTRAT' || a.status === 'IN_ANALIZA' || a.status === 'NEVOIE_DOCUMENTE').length,
    approved: applications.filter(a => a.status === 'APROBAT_BANCA' || a.status === 'DISBURSAT').length,
    rejected: applications.filter(a => a.status === 'RESPINS').length,
    totalComision: applications
      .filter(a => a.status === 'DISBURSAT' && a.comision)
      .reduce((sum, a) => sum + (a.comision || 0), 0),
  };

  // Monthly chart data (last 6 months)
  const getChartData = () => {
    const now = new Date();
    const months: { name: string; count: number; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' });
      const count = applications.filter(a => {
        const created = new Date(a.createdAt);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      const amount = applications
        .filter(a => {
          const created = new Date(a.createdAt);
          return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth() && a.requestedAmount;
        })
        .reduce((sum, a) => sum + (a.requestedAmount || 0), 0);
      months.push({ name: monthLabel, count, amount });
    }
    return months;
  };

  const fmt = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  const statCards = [
    { label: 'Total aplicatii', value: stats.total, icon: TrendingUp, color: 'text-brand-primary', bg: 'bg-brand-primary/15' },
    { label: 'In asteptare', value: stats.pending, icon: Clock, color: 'text-warning-500', bg: 'bg-warning-500/15' },
    { label: 'Aprobate', value: stats.approved, icon: CheckCircle, color: 'text-success-500', bg: 'bg-success-500/15' },
    { label: 'Respinse', value: stats.rejected, icon: XCircle, color: 'text-error-500', bg: 'bg-error-500/15' },
    { label: 'Total comision', value: `${fmt(stats.totalComision)} RON`, icon: Banknote, color: 'text-brand-secondary', bg: 'bg-brand-secondary/15', isText: true },
  ];

  const quickActions = [
    {
      label: 'Gestioneaza aplicatii',
      desc: 'Vezi si administreaza toate aplicatiile',
      path: '/admin/applications',
      icon: FileText,
      gradient: 'from-brand-primary to-brand-secondary',
    },
    {
      label: 'Verificari KYC',
      desc: 'Aproba sau respinge cererile KYC',
      path: '/admin/kyc',
      icon: UserCheck,
      color: 'text-success-500',
      iconBg: 'bg-success-500/15 group-hover:bg-success-500/25',
      border: 'hover:border-success-500/30 hover:shadow-success-500/5',
    },
    {
      label: 'Rapoarte',
      desc: 'Genereaza rapoarte lunare',
      path: '/admin/reports',
      icon: BarChart3,
      color: 'text-brand-purple',
      iconBg: 'bg-brand-purple/15 group-hover:bg-brand-purple/25',
      border: 'hover:border-brand-purple/30 hover:shadow-brand-purple/5',
    },
    {
      label: 'Director Brokeri',
      desc: 'Gestioneaza lista de brokeri',
      path: '/admin/brokers',
      icon: UserCheck,
      color: 'text-warning-500',
      iconBg: 'bg-warning-500/15 group-hover:bg-warning-500/25',
      border: 'hover:border-warning-500/30 hover:shadow-warning-500/5',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center">
          <ShieldCheck size={22} className="text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-light-100">Admin Dashboard</h1>
          <p className="text-light-60 text-sm">Sumar general al platformei</p>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map(s => (
              <div key={s.label} className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <s.icon size={18} className={s.color} />
                  </div>
                </div>
                <p className="text-xs text-light-50 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-xl font-bold text-light-100">
                  {s.isText ? s.value : (loading ? '-' : s.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-light-100 mb-4">Aplicatii pe luna</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3A3D41" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#8A8D91', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8A8D91', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0B0D',
                      border: '1px solid #3A3D41',
                      borderRadius: '12px',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: '#F0F2F5', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: '#D1D5DB' }}
                    cursor={{ fill: 'rgba(0, 117, 235, 0.08)' }}
                  />
                  <Bar dataKey="count" name="Aplicatii" fill="#0075EB" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              i === 0 ? (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-4 bg-gradient-to-r from-brand-primary to-brand-secondary p-5 rounded-2xl text-left hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/25 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <action.icon size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{action.label}</p>
                    <p className="text-white/70 text-sm">{action.desc}</p>
                  </div>
                </button>
              ) : (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className={`flex items-center gap-4 bg-dark-700 border border-dark-400 p-5 rounded-2xl text-left ${action.border} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group`}
                >
                  <div className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center transition-colors`}>
                    <action.icon size={24} className={action.color} />
                  </div>
                  <div>
                    <p className="text-light-100 font-semibold">{action.label}</p>
                    <p className="text-light-60 text-sm">{action.desc}</p>
                  </div>
                </button>
              )
            ))}
          </div>

          {/* Recent applications */}
          {applications.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-light-100">Aplicatii recente</h2>
                <button
                  onClick={() => navigate('/admin/applications')}
                  className="flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  Vezi toate <ArrowRight size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {applications.slice(0, 5).map(app => (
                  <div key={app.id} className="flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 hover:border-brand-primary/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-light-90">
                        #{app.id} &middot; {app.typeCredit || 'Credit'}
                      </p>
                      <p className="text-xs text-light-60 mt-0.5">
                        {new Date(app.createdAt).toLocaleDateString('ro-RO')}
                        {app.requestedAmount ? ` · ${fmt(app.requestedAmount)} RON` : ''}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      app.status === 'APROBAT_BANCA' || app.status === 'DISBURSAT' ? 'bg-success-500/15 text-success-400' :
                      app.status === 'RESPINS' ? 'bg-error-500/15 text-error-400' :
                      'bg-warning-500/15 text-warning-400'
                    }`}>
                      {APPLICATION_STATUS_LABELS[app.status] || app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
