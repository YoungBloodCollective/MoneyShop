import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Clock, Loader2, FileText, ExternalLink, Eye, X } from 'lucide-react';
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
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [viewing, setViewing] = useState<{ code: string; title: string } | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  // Fetch the document and show it from a same-origin blob URL: cross-origin PDFs do not
  // render inside an iframe in every browser, a blob does. The "Filă nouă" link stays as a
  // fallback for the browsers (notably iOS Safari) that refuse to show a PDF in a frame.
  useEffect(() => {
    if (!viewing) { setViewUrl(null); return; }
    let url: string | null = null;
    let cancelled = false;
    fetch(acordApi.bankConsentDocumentUrl(token, viewing.code))
      .then(r => r.blob())
      .then(b => { if (!cancelled) { url = URL.createObjectURL(b); setViewUrl(url); } })
      .catch(() => { if (!cancelled) setViewUrl(null); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [viewing, token]);
  const [accepted, setAccepted] = useState(false);
  const [cnp, setCnp] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = (initial: boolean) =>
      acordApi.getBankConsent(token)
        .then(v => {
          if (cancelled) return;
          setView(v);
          if (initial) { setAddress(v.address ?? ''); setBirthDate(v.birthDate ?? ''); }
          setState('ready');
        })
        .catch(() => { if (!cancelled) setState('invalid'); });

    load(true);

    // A broker can replace this link (or it can be signed or expire) while the client keeps
    // the page open; re-check when the tab comes back so a dead link shows its status screen
    // instead of forms that now answer 404.
    const recheck = () => { if (document.visibilityState === 'visible') load(false); };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [token]);

  const submit = async () => {
    if (!accepted || !signature) return;
    setSubmitting(true);
    setError('');
    try {
      await acordApi.signBankConsent(token, signature, {
        cnp: cnp || undefined,
        address: address.trim() || undefined,
        birthDate: birthDate.trim() || undefined,
      });
      setState('done');
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError('Nu ne putem conecta la server. Verifică conexiunea și încearcă din nou.');
      } else {
        const msg = axios.isAxiosError(err) ? (err.response?.data?.message as string) : undefined;
        setError(msg || 'Nu am putut salva semnătura. Încearcă din nou.');
        // The link may have been replaced, signed or expired since the page loaded; refresh
        // the status so the client sees the right screen instead of retrying a dead link.
        acordApi.getBankConsent(token).then(v => setView(v)).catch(() => undefined);
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
        text={`Documentele pentru ${view?.bankName ?? 'bancă'} au fost semnate. Brokerul tău se ocupă de restul.`}
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

  const cnpDigits = cnp.replace(/\D/g, '');
  const cnpReady = !view.requiresCnp || cnpDigits.length === 13;
  const cnpHintMismatch =
    view.requiresCnp && cnpDigits.length === 13 && !!view.cnpHint && !cnpDigits.endsWith(view.cnpHint);
  const addressReady = !view.requiresAddress || address.trim().length >= 10;
  const birthDateReady = !view.requiresBirthDate || /^\d{2}\.\d{2}\.\d{4}$/.test(birthDate.trim());
  const allOpened = view.documents.every(d => opened[d.code]);

  return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
        <h1 className="text-[22px] leading-snug font-bold text-light-100">
          Documente pentru {view.bankName}
        </h1>
        <p className="text-sm text-light-60 mt-1.5 mb-5">
          Deschide și citește fiecare document, apoi semnează o singură dată. Datele tale sunt deja completate.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
          {([['Nume și prenume', view.fullName], ['Telefon', view.telefon], ['E-mail', view.email || '—']] as const).map(([label, value]) => (
            <div key={label} className="bg-dark-800 rounded-xl px-3.5 py-2.5 min-w-0">
              <p className="text-[11px] text-light-50">{label}</p>
              <p className="text-[13.5px] font-medium text-light-90 break-words">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2.5 mb-5">
          {view.documents.map(doc => (
            <button
              key={doc.code}
              type="button"
              onClick={() => {
                setOpened(prev => ({ ...prev, [doc.code]: true }));
                setViewing({ code: doc.code, title: doc.title });
              }}
              className={`flex w-full items-start gap-3 rounded-xl px-4 py-3.5 ring-1 text-left transition ${
                opened[doc.code] ? 'bg-success-500/5 ring-success-500/40' : 'bg-dark-800 ring-dark-600'
              }`}
            >
              <FileText size={18} className="text-brand-primary shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-light-90">{doc.title}</span>
                <span className="block text-[12.5px] text-light-60 leading-snug mt-0.5">{doc.summary}</span>
                <span className="block text-[12px] font-medium text-brand-primary mt-1.5">
                  {opened[doc.code] ? 'Deschide din nou' : 'Deschide documentul'}
                </span>
              </span>
              <Eye size={15} className="text-light-50 shrink-0 mt-0.5" />
            </button>
          ))}
        </div>

        {view.requiresCnp && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-light-80 mb-1.5">
              CNP <span className="text-error-500">*</span>
            </label>
            <input
              value={cnp}
              onChange={e => setCnp(e.target.value.replace(/\D/g, '').slice(0, 13))}
              inputMode="numeric"
              placeholder="Cele 13 cifre de pe actul tău"
              className="w-full px-3.5 py-3 text-base rounded-xl bg-white ring-1 ring-dark-500 text-light-90 placeholder:text-light-50 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            />
            <p className="text-[12px] text-light-60 mt-1.5">
              {cnpHintMismatch
                ? 'CNP-ul nu se potrivește cu actul încărcat la semnarea acordului.'
                : 'Banca are nevoie de CNP ca să îți poată consulta veniturile la ANAF.'}
            </p>
          </div>
        )}

        {view.requiresAddress && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-light-80 mb-1.5">
              Adresa de domiciliu <span className="text-error-500">*</span>
            </label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value.slice(0, 250))}
              rows={2}
              placeholder="Strada, numărul, blocul, localitatea, județul"
              className="w-full px-3.5 py-3 text-base rounded-xl bg-white ring-1 ring-dark-500 text-light-90 placeholder:text-light-50 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            />
            <p className="text-[12px] text-light-60 mt-1.5">
              {view.address
                ? 'Am completat adresa din actul tău. Verific-o și corecteaz-o dacă e nevoie.'
                : 'Scrie adresa exact cum apare pe actul tău de identitate.'}
            </p>
          </div>
        )}

        {view.requiresBirthDate && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-light-80 mb-1.5">
              Data nașterii <span className="text-error-500">*</span>
            </label>
            <input
              value={birthDate}
              onChange={e => setBirthDate(e.target.value.replace(/[^\d.]/g, '').slice(0, 10))}
              inputMode="numeric"
              placeholder="zz.ll.aaaa"
              className="w-full px-3.5 py-3 text-base rounded-xl bg-white ring-1 ring-dark-500 text-light-90 placeholder:text-light-50 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
            />
            <p className="text-[12px] text-light-60 mt-1.5">
              {view.birthDate
                ? 'Am completat data din actul tău. Verific-o și corecteaz-o dacă e nevoie.'
                : 'Scrie data nașterii așa cum apare pe actul tău de identitate.'}
            </p>
          </div>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-brand-primary shrink-0"
          />
          <span className="text-[13px] text-light-70 leading-snug">
            Am citit documentele de mai sus și sunt de acord cu ele.
          </span>
        </label>

        {!allOpened && accepted && (
          <p className="text-[12px] text-warning-600 bg-warning-500/10 rounded-xl px-4 py-2.5 -mt-3 mb-5">
            Deschide fiecare document înainte de a semna.
          </p>
        )}

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
          disabled={!accepted || !signature || !cnpReady || !addressReady || !birthDateReady || submitting}
          className="w-full py-4 mt-5 rounded-xl bg-success-600 hover:bg-success-500 text-white text-base font-semibold shadow-sm active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? 'Se trimite...' : view.documents.length > 1 ? 'Semnează toate documentele' : 'Semnează'}
        </button>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-dark-600 shrink-0">
            <span className="text-[14px] font-semibold text-light-90 truncate">{viewing.title}</span>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={acordApi.bankConsentDocumentUrl(token, viewing.code)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[12px] font-medium text-brand-primary"
              >
                <ExternalLink size={13} /> Filă nouă
              </a>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-dark-700 text-light-90 text-[13px] font-medium"
              >
                <X size={15} /> Închide
              </button>
            </div>
          </div>
          {viewUrl ? (
            <iframe
              title={viewing.title}
              src={viewUrl}
              className="flex-1 w-full bg-white"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <Loader2 size={28} className="text-brand-primary animate-spin" />
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
