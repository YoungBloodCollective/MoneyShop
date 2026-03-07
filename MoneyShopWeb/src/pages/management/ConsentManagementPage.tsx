import { useEffect, useState } from 'react';
import { ArrowLeft, Shield, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { consentApi, type ConsentInfo } from '@/services/api/consentApi';

export default function ConsentManagementPage() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState<ConsentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConsents(); }, []);

  const loadConsents = async () => {
    try {
      const res = await consentApi.listConsents();
      setConsents(res.consents || []);
    } catch {
      toast.error('Eroare la incarcarea consimtamintelor');
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (consentId: string) => {
    try {
      await consentApi.revokeConsent(consentId);
      toast.success('Consimtamant revocat');
      loadConsents();
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
        <Shield size={24} className="text-brand-primary" /> Consimtaminte
      </h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : consents.length === 0 ? (
        <p className="text-center py-12 text-light-60">Nu ai consimtaminte inregistrate.</p>
      ) : (
        <div className="space-y-3">
          {consents.map(c => (
            <div key={c.consentId} className="bg-dark-700 border border-dark-400 rounded-xl px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-90">{c.consentType}</p>
                  <p className="text-xs text-light-60 mt-0.5">
                    Acordat: {new Date(c.grantedAt).toLocaleDateString('ro-RO')}
                    {c.docType && ` | Doc: ${c.docType} v${c.docVersion}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    c.status === 'active' ? 'bg-success-500/15 text-success-400' :
                    'bg-error-500/15 text-error-400'
                  }`}>{c.status === 'active' ? 'Activ' : 'Revocat'}</span>
                  {c.status === 'active' && (
                    <button
                      onClick={() => revoke(c.consentId)}
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
