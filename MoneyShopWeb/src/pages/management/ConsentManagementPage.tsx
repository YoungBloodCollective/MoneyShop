import { useEffect, useState } from 'react';
import { ArrowLeft, Shield, XCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { consentApi, type ConsentInfo } from '@/services/api/consentApi';

// Human-readable labels for technical consent types
const CONSENT_LABELS: Record<string, { label: string; desc: string }> = {
  TC_ACCEPT: { label: 'Termeni si Conditii', desc: 'Acceptarea termenilor si conditiilor generale ale platformei MoneyShop.' },
  GDPR_ACCEPT: { label: 'Protectia Datelor (GDPR)', desc: 'Acord pentru prelucrarea datelor personale conform regulamentului GDPR.' },
  MANDATE_ANAF: { label: 'Mandat ANAF', desc: 'Autorizare pentru accesul la datele fiscale de la ANAF in scopul verificarii veniturilor.' },
  MANDATE_ANAF_BC: { label: 'Mandat ANAF + Biroul de Credit', desc: 'Autorizare pentru verificarea situatiei fiscale la ANAF si a istoricului de credit.' },
  MANDATE_BC: { label: 'Mandat Biroul de Credit', desc: 'Autorizare pentru interogarea Biroului de Credit in scopul evaluarii eligibilitatii.' },
  DATA_PROCESSING: { label: 'Prelucrare Date', desc: 'Acord pentru prelucrarea datelor personale in scopul ofertarii de produse financiare.' },
  MARKETING: { label: 'Comunicari Marketing', desc: 'Acord pentru primirea de oferte si noutati prin email sau SMS.' },
  DATA_TRANSFER: { label: 'Transfer Date', desc: 'Acord pentru transferul datelor catre institutii financiare partenere.' },
  ELECTRONIC_SIGNATURE: { label: 'Semnatura Electronica', desc: 'Acord pentru utilizarea semnaturii electronice in documente.' },
  BROKER_MANDATE: { label: 'Mandat Broker', desc: 'Autorizare pentru brokerul MoneyShop sa actioneze in numele tau.' },
};

const getConsentLabel = (type: string) => CONSENT_LABELS[type] || { label: type, desc: '' };

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

      <div className="flex items-center gap-2 bg-brand-primary/5 border border-brand-primary/15 rounded-xl px-4 py-3">
        <Info size={16} className="text-brand-primary flex-shrink-0" />
        <p className="text-xs text-light-60">
          Aici poti vedea si gestiona toate consimtamintele acordate. Revocare unui consimtamant poate afecta functionarea anumitor servicii.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : consents.length === 0 ? (
        <p className="text-center py-12 text-light-60">Nu ai consimtaminte inregistrate.</p>
      ) : (
        <div className="space-y-3">
          {consents.map(c => {
            const { label, desc } = getConsentLabel(c.consentType);
            return (
              <div key={c.consentId} className="bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 hover:border-brand-primary/20 transition-all duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-light-90">{label}</p>
                    {desc && <p className="text-xs text-light-50 mt-1">{desc}</p>}
                    <p className="text-xs text-light-60 mt-1.5">
                      Acordat: {new Date(c.grantedAt).toLocaleDateString('ro-RO')}
                      {c.docType && ` · ${c.docType} v${c.docVersion}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      c.status === 'active' ? 'bg-success-500/15 text-success-400' :
                      'bg-error-500/15 text-error-400'
                    }`}>{c.status === 'active' ? 'Activ' : 'Revocat'}</span>
                    {c.status === 'active' && (
                      <button
                        onClick={() => revoke(c.consentId)}
                        className="p-1.5 rounded-lg text-error-400 hover:bg-error-500/10 transition-colors"
                        title="Revoca consimtamantul"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
