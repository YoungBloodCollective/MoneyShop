import { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import toast from 'react-hot-toast';

interface Appointment {
  id: number;
  nume: string;
  prenume: string;
  judet: string;
  tipCredit: string;
  salariuNet: number;
  telefon: string;
  email: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const statusOptions = ['Nou', 'Contactat', 'In lucru', 'Finalizat', 'Anulat'];
const statusColors: Record<string, string> = {
  Nou: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Contactat: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
  'In lucru': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Finalizat: 'bg-success-500/15 text-success-400 border-success-500/30',
  Anulat: 'bg-error-500/15 text-error-400 border-error-500/30',
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    apiClient.get('/appointments').then(r => setAppointments(r.data)).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await apiClient.patch(`/appointments/${id}/status`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? res.data : a));
      toast.success(`Status actualizat: ${status}`);
    } catch {
      toast.error('Eroare la actualizare');
    }
  };

  const filtered = filter ? appointments.filter(a => a.status === filter) : appointments;
  const counts = statusOptions.reduce((acc, s) => ({ ...acc, [s]: appointments.filter(a => a.status === s).length }), {} as Record<string, number>);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-light-100">Programari</h1>
        <p className="text-sm text-light-50 mt-1">Lead-uri din formularul de contact</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filter ? 'bg-brand-primary text-white' : 'bg-dark-700 text-light-60 hover:bg-dark-600'}`}>
          Toate ({appointments.length})
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
          <p>Nicio programare {filter ? `cu status "${filter}"` : ''}</p>
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
                    {a.tipCredit && <span className="flex items-center gap-1"><CreditCard size={11} />{a.tipCredit}</span>}
                    <span className="text-light-40">{a.salariuNet.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <p className="text-[10px] text-light-40 mt-1">{new Date(a.createdAt).toLocaleString('ro-RO')}</p>
                </div>
                <select
                  value={a.status}
                  onChange={e => updateStatus(a.id, e.target.value)}
                  className="text-xs bg-dark-600 border border-dark-500 text-light-80 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
