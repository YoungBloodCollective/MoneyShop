import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';
import { applicationsApi } from '@/services/api/applicationsApi';
import type { Application } from '@/types/application.types';

export default function ApplicationListPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    applicationsApi.getAll()
      .then(apps => setApplications(apps))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = applications.filter(a =>
    !search || (a.typeCredit || '').toLowerCase().includes(search.toLowerCase()) ||
    a.status.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-100">Aplicatiile mele</h1>
        <button
          onClick={() => navigate('/dashboard/apply')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          <Plus size={18} /> Aplicatie noua
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta aplicatii..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto text-light-50 mb-4" />
          <p className="text-light-60">{search ? 'Niciun rezultat gasit' : 'Nu ai aplicatii inca'}</p>
          <button
            onClick={() => navigate('/dashboard/apply')}
            className="mt-4 px-6 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
          >
            Depune prima aplicatie
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id} className="flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 hover:border-dark-300 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-light-90">{app.typeCredit || 'Credit'}</p>
                <p className="text-xs text-light-60 mt-0.5">
                  {new Date(app.createdAt).toLocaleDateString('ro-RO')} &middot; #{app.id}
                  {app.requestedAmount ? ` \u00B7 ${app.requestedAmount.toLocaleString('ro-RO')} RON` : ''}
                </p>
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
      )}
    </div>
  );
}
