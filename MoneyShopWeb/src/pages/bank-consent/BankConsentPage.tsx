import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { acordApi, type BankConsentPublicView } from '@/services/api/acordApi';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { Logo } from '@/components/shared/Logo';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-900 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex justify-center mb-6">
          <Logo size="md" clickable={false} />
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusScreen({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Shell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 rounded-full bg-dark-700 flex items-center justify-center mb-6">{icon}</div>
        <h1 className="text-[24px] font-bold text-light-100 mb-3">{title}</h1>
        <p className="text-[15px] text-light-70 leading-relaxed max-w-sm">{text}</p>
      </div>
    </Shell>
  );
}

export default function BankConsentPage() {
  const { token = '' } = useParams();
  const [view, setView] = useState<BankConsentPublicView | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading');
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    acordApi.getBankConsent(token)
      .then(v => { setView(v); setState('ready'); })
      .catch(() => setState('invalid'));
  }, [token]);

  const submit = async () => {
    if (!accepted || !signature) return;
    setSubmitting(true);
    setError('');
    try {
      await acordApi.signBankConsent(token, signature);
      setState('done');
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError('Nu ne putem conecta la server. Verifică conexiunea și încearcă din nou.');
      } else {
        const msg = axios.isAxiosError(err) ? (err.response?.data?.message as string) : undefined;
        setError(msg || 'Nu am putut salva semnătura. Încearcă din nou.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <Shell>
        <div className="flex justify-center py-24"><Loader2 size={30} className="text-brand-primary animate-spin" /></div>
      </Shell>
    );
  }

  if (state === 'done' || view?.status === 'signed') {
    return (
      <StatusScreen
        icon={<CheckCircle size={46} className="text-success-600" />}
        title="Mulțumim!"
        text={`Consimțământul pentru ${view?.bankName ?? 'bancă'} a fost semnat. Brokerul tău se ocupă de restul.`}
      />
    );
  }

  if (state === 'invalid' || !view || view.status !== 'pending') {
    return (
      <StatusScreen
        icon={<Clock size={44} className="text-light-50" />}
        title="Linkul nu mai este valabil"
        text="Linkul a expirat sau a fost înlocuit cu unul nou. Cere-i brokerului tău un link nou."
      />
    );
  }

  return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
        <h1 className="text-[22px] leading-snug font-bold text-light-100">{view.title}</h1>
        <p className="text-sm text-light-60 mt-1.5 mb-5">
          Citește documentul de mai jos și semnează dacă ești de acord. Datele tale sunt deja completate.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
          {([['Nume și prenume', view.fullName], ['Telefon', view.telefon], ['E-mail', view.email || '—']] as const).map(([label, value]) => (
            <div key={label} className="bg-dark-800 rounded-xl px-3.5 py-2.5 min-w-0">
              <p className="text-[11px] text-light-50">{label}</p>
              <p className="text-[13.5px] font-medium text-light-90 break-words">{value}</p>
            </div>
          ))}
        </div>

        <div className="border border-dark-600 rounded-xl px-4 py-3.5 max-h-[45vh] overflow-y-auto mb-5">
          <p className="text-[13.5px] text-light-80 whitespace-pre-wrap leading-relaxed">{view.body}</p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-brand-primary shrink-0"
          />
          <span className="text-[13px] text-light-70 leading-snug">
            Am citit și sunt de acord ca datele mele să fie transmise către {view.bankName}, conform documentului de mai sus.
          </span>
        </label>

        <p className="text-sm font-semibold text-light-90 mb-2">
          Semnătură <span className="font-normal text-light-60">(desenează în chenar)</span>
        </p>
        <SignaturePad onChange={setSignature} disabled={!accepted} height={150} />
        {!accepted && (
          <p className="text-[12px] text-light-60 mt-1.5">Bifează întâi acordul ca să poți semna.</p>
        )}

        {error && <p className="text-error-600 text-sm mt-4 bg-error-500/8 rounded-xl px-4 py-3">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!accepted || !signature || submitting}
          className="w-full py-4 mt-5 rounded-xl bg-success-600 hover:bg-success-500 text-white text-base font-semibold shadow-sm active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? 'Se trimite...' : 'Semnează'}
        </button>
      </div>
    </Shell>
  );
}
