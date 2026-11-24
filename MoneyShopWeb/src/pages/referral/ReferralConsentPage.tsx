import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { clearReferralToken, readReferralToken } from '@/lib/inviteToken';
import { referralsApi, type ReferralAnswer, type ReferralConsentView } from '@/services/api/referralsApi';

type PageState =
  | { kind: 'loading' }
  | { kind: 'problem'; message: string }
  | { kind: 'ready'; view: ReferralConsentView }
  | { kind: 'done'; answer: ReferralAnswer };

const ANSWERED_KEY = 'moneyshop:referral-answered';

function readAnswered(): 'yes' | 'no' | null {
  try {
    const value = sessionStorage.getItem(ANSWERED_KEY);
    return value === 'yes' || value === 'no' ? value : null;
  } catch {
    return null;
  }
}

function markAnswered(accepted: boolean) {
  try { sessionStorage.setItem(ANSWERED_KEY, accepted ? 'yes' : 'no'); } catch { /* storage unavailable */ }
}

function problemFrom(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Nu ne putem conecta la server. Verifică conexiunea și reîncarcă pagina.';
    const message = (err.response.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return 'Nu am putut verifica linkul. Încearcă din nou mai târziu.';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-900 px-4 py-6">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex justify-center"><Logo size="md" clickable={false} /></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ReferralConsentPage() {
  const [token] = useState(readReferralToken);
  const [state, setState] = useState<PageState>(() => {
    if (token) return { kind: 'loading' };
    if (readAnswered()) return { kind: 'problem', message: 'Ai răspuns deja. Mulțumim!' };
    return { kind: 'problem', message: 'Linkul nu este complet. Deschide-l din nou din mesajul primit.' };
  });
  const [submitting, setSubmitting] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    referralsApi.consentPreview(token)
      .then(view => { if (active) setState({ kind: 'ready', view }); })
      .catch(err => { if (active) setState({ kind: 'problem', message: problemFrom(err) }); });
    return () => { active = false; };
  }, [token]);

  const respond = async (accept: boolean) => {
    if (submitting) return;
    setSubmitting(accept ? 'yes' : 'no');
    setError('');
    try {
      const answer = await referralsApi.consentRespond(token, accept);
      clearReferralToken();
      markAnswered(accept);
      setState({ kind: 'done', answer });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response && [404, 410].includes(err.response.status)) {
        setState({ kind: 'problem', message: problemFrom(err) });
      } else {
        setError(problemFrom(err));
        setSubmitting(null);
      }
    }
  };

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <Loader2 size={30} className="animate-spin text-brand-primary" aria-label="Se verifică linkul" />
      </div>
    );
  }

  if (state.kind === 'problem') {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="mb-3 text-[22px] font-bold text-light-100">Linkul nu este disponibil</h1>
          <p role="alert" className="text-[15px] leading-relaxed text-light-70">{state.message}</p>
        </div>
      </Shell>
    );
  }

  if (state.kind === 'done') {
    const { accepted, fromName, toName } = state.answer;
    return (
      <Shell>
        <div className="flex flex-col items-center py-6 text-center">
          <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${accepted ? 'bg-success-500/12' : 'bg-dark-800'}`}>
            {accepted ? <CheckCircle size={40} className="text-success-600" /> : <XCircle size={40} className="text-light-60" />}
          </div>
          <h1 className="mb-3 text-[22px] font-bold text-light-100">{accepted ? 'Mulțumim, am transmis datele' : 'Am înțeles, nu transmitem nimic'}</h1>
          <p className="max-w-sm text-[15px] leading-relaxed text-light-70">
            {accepted
              ? `${toName} te va contacta în curând. Poți închide pagina.`
              : `Nu am transmis niciun fel de date către ${toName}. ${fromName} rămâne brokerul tău. Poți închide pagina.`}
          </p>
        </div>
      </Shell>
    );
  }

  const { view } = state;
  const where = view.toOras ? ` din ${view.toOras}` : '';

  return (
    <Shell>
      <h1 className="text-[22px] font-bold leading-snug text-light-100">Un coleg te poate ajuta cu creditul</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-light-80">
        Brokerul tău, <span className="font-semibold">{view.fromName}</span>, îți recomandă colegul{' '}
        <span className="font-semibold">{view.toName}</span>{where} pentru creditul tău. Ești de acord să-i transmitem numele, telefonul și emailul tău?
      </p>
      {view.mode === 'Colaborare' && (
        <p className="mt-3 text-[15px] leading-relaxed text-light-70">{view.fromName} va fi ținut la curent cu stadiul dosarului tău.</p>
      )}
      <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-light-60">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success-600" />
        Nu se transmit documente și nici date de identitate. Colegul îți va cere separat să semnezi acordul lui, dacă vrei să mergi mai departe.
      </p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-error-500/10 px-3.5 py-2.5 text-sm text-error-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void respond(true)}
          disabled={submitting !== null}
          className="flex items-center justify-center gap-2 rounded-xl bg-success-600 py-4 text-base font-semibold text-white shadow-sm hover:bg-success-500 disabled:opacity-60"
        >
          {submitting === 'yes' && <Loader2 size={18} className="animate-spin" />} Da, sunt de acord
        </button>
        <button
          type="button"
          onClick={() => void respond(false)}
          disabled={submitting !== null}
          className="flex items-center justify-center gap-2 rounded-xl bg-dark-800 py-4 text-base font-semibold text-light-80 ring-1 ring-dark-500 hover:bg-dark-600 disabled:opacity-60"
        >
          {submitting === 'no' && <Loader2 size={18} className="animate-spin" />} Nu
        </button>
      </div>
    </Shell>
  );
}
