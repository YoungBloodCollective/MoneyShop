import { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, FileText, Clock } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import toast from 'react-hot-toast';

interface PartnerApplication {
  id: number;
  nume: string;
  prenume: string;
  telefon: string;
  email: string;
  judet: string;
  descriere: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const statusOptions = ['Nou', 'Contactat', 'In discutie', 'Acceptat', 'Respins'];
const statusColors: Record<string, string> = {
  Nou: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Contactat: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
  'In discutie': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Acceptat: 'bg-success-500/15 text-success-400 border-success-500/30',
  Respins: 'bg-error-500/15 text-error-400 border-error-500/30',
};

export default function AdminPartnersPage() {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    apiClient.get('/partner-applications').then(r => setApplications(r.data)).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await apiClient.patch(`/partner-applications/${id}/status`, { status });
      setApplications(prev => prev.map(a => a.id === id ? res.data : a));
      toast.success(`Status actualizat: ${status}`);
    } catch {
      toast.error('Eroare la actualizare');
    }
  };

  const filtered = filter ? applications.filter(a => a.status === filter) : applications;
  const counts = statusOptions.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.status === s).length }), {} as Record<string, number>);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-light-100">Cereri Parteneri</h1>
        <p className="text-sm text-light-50 mt-1">Brokeri interesati sa lucreze cu MoneyShop</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filter ? 'bg-brand-primary text-white' : 'bg-dark-700 text-light-60 hover:bg-dark-600'}`}>
          Toate ({applications.length})
        </button>
        {statusOptions.map(s => (
          <button key={s} onClick={() => setFilter(f => f === s ? '' : s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-brand-primary text-white' : 'bg-dark-700 text-light-60 hover:bg-dark-600'}`}>
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-light-50">
          <Clock size={40} className="mx-auto mb-3 opacity-40" />
          <p>Nicio cerere {filter ? `cu status "${filter}"` : ''}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(a => (
            <div key={a.id} className="bg-dark-700 rounded-xl border border-dark-600 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-light-100">{a.nume} {a.prenume}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[a.status] || 'bg-dark-600 text-light-50'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-light-50">
                    <span className="flex items-center gap-1"><Phone size={11} />{a.telefon}</span>
                    {a.email && <span className="flex items-center gap-1"><Mail size={11} />{a.email}</span>}
                    {a.judet && <span className="flex items-center gap-1"><MapPin size={11} />{a.judet}</span>}
                  </div>
                  {a.descriere && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                        className="flex items-center gap-1 text-[11px] text-light-50 hover:text-light-80 transition-colors"
                      >
                        <FileText size={11} />
                        {expanded === a.id ? 'Ascunde descriere' : 'Vezi descriere'}
                      </button>
                      {expanded === a.id && (
                        <p className="mt-1.5 text-xs text-light-70 bg-dark-600 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
                          {a.descriere}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-light-40 mt-1">{new Date(a.createdAt).toLocaleString('ro-RO')}</p>
                </div>
                <div className="shrink-0">
                  <select
                    value={a.status}
                    onChange={e => updateStatus(a.id, e.target.value)}
                    className="text-xs bg-dark-600 border border-dark-500 text-light-80 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
