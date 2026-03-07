import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calculator, Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { applicationsApi } from '@/services/api/applicationsApi';
import type { Application } from '@/types/application.types';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationsApi.getAll()
      .then(apps => setApplications(apps))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'INREGISTRAT' || a.status === 'IN_PROCESARE').length,
    approved: applications.filter(a => a.status === 'APROBAT').length,
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-light-100">
          Buna, {user?.name?.split(' ')[0] || 'Utilizator'}!
        </h1>
        <p className="text-light-60 mt-1">Iata un sumar al activitatii tale</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/dashboard/apply')}
          className="flex items-center gap-4 bg-gradient-to-r from-brand-primary to-brand-secondary p-5 rounded-2xl text-left hover:opacity-90 transition-opacity"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Plus size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">Aplicatie noua</p>
            <p className="text-white/70 text-sm">Depune o cerere de credit</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/simulator')}
          className="flex items-center gap-4 bg-dark-700 border border-dark-400 p-5 rounded-2xl text-left hover:border-dark-300 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-purple/15 flex items-center justify-center">
            <Calculator size={24} className="text-brand-purple" />
          </div>
          <div>
            <p className="text-light-100 font-semibold">Simulator</p>
            <p className="text-light-60 text-sm">Calculeaza rata lunara</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/dashboard/applications')}
          className="flex items-center gap-4 bg-dark-700 border border-dark-400 p-5 rounded-2xl text-left hover:border-dark-300 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-info-500/15 flex items-center justify-center">
            <FileText size={24} className="text-info-500" />
          </div>
          <div>
            <p className="text-light-100 font-semibold">Aplicatiile mele</p>
            <p className="text-light-60 text-sm">Vezi toate cererile</p>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total aplicatii', value: stats.total, icon: TrendingUp, color: 'text-brand-primary' },
          { label: 'In procesare', value: stats.pending, icon: Clock, color: 'text-warning-500' },
          { label: 'Aprobate', value: stats.approved, icon: CheckCircle, color: 'text-success-500' },
        ].map(s => (
          <div key={s.label} className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={18} className={s.color} />
              <span className="text-xs text-light-60 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-light-100">{loading ? '-' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      {!loading && applications.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-light-100 mb-4">Aplicatii recente</h2>
          <div className="space-y-3">
            {applications.slice(0, 5).map(app => (
              <div key={app.id} className="flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-light-90">{app.typeCredit || 'Credit'}</p>
                  <p className="text-xs text-light-60">{new Date(app.createdAt).toLocaleDateString('ro-RO')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  app.status === 'APROBAT' ? 'bg-success-500/15 text-success-400' :
                  app.status === 'RESPINS' ? 'bg-error-500/15 text-error-400' :
                  'bg-warning-500/15 text-warning-400'
                }`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
