import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { mandateApi, type MandateInfo } from '@/services/api/mandateApi';

export default function MandateManagementPage() {
  const navigate = useNavigate();
  const [mandates, setMandates] = useState<MandateInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMandates(); }, []);

  const loadMandates = async () => {
    try {
      const res = await mandateApi.listMandates();
      setMandates(res.mandates || []);
    } catch {
      toast.error('Eroare la incarcarea mandatelor');
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (mandateId: string) => {
    try {
      await mandateApi.revokeMandate(mandateId, 'Revocat de utilizator');
      toast.success('Mandat revocat');
      loadMandates();
    } catch {
      toast.error('Eroare la revocare');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <h1 className="text-2xl font-bold text-light-100 flex items-center gap-2">
        <FileText size={24} className="text-brand-primary" /> Mandate
      </h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : mandates.length === 0 ? (
        <p className="text-center py-12 text-light-60">Nu ai mandate inregistrate.</p>
      ) : (
        <div className="space-y-3">
          {mandates.map(m => (
            <div key={m.mandateId} className="bg-dark-700 border border-dark-400 rounded-xl px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-90">{m.mandateType}</p>
                  <p className="text-xs text-light-60 mt-0.5">
                    Acordat: {new Date(m.grantedAt).toLocaleDateString('ro-RO')} |
                    Expira: {new Date(m.expiresAt).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    m.status === 'active' ? 'bg-success-500/15 text-success-400' :
                    m.status === 'expired' ? 'bg-warning-500/15 text-warning-400' :
                    'bg-error-500/15 text-error-400'
                  }`}>{m.status}</span>
                  {m.status === 'active' && (
                    <button
                      onClick={() => revoke(m.mandateId)}
                      className="p-1.5 rounded-lg text-error-400 hover:bg-error-500/10 transition-colors"
                      title="Revoca"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
