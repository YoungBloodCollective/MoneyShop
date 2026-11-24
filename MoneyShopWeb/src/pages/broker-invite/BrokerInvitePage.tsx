import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, ChevronDown, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { COUNTIES } from '@/lib/counties';
import { ROOT_DOMAIN_NAME } from '@/lib/brokerHost';
import {
  brokerInvitesApi,
  type BrokerInvitePreview,
  type BrokerTermsText,
  type SlugAvailability,
} from '@/services/api/brokerInvitesApi';

const MIN_PASSWORD = 8;
const MAX_SLUG = 30;
const SLUG_FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

const inputClass =
  'w-full px-3.5 py-3 text-base rounded-xl bg-white ring-1 ring-dark-500 text-light-90 placeholder:text-light-50 focus:outline-none focus:ring-2 focus:ring-brand-primary transition';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, MAX_SLUG);
}

function validPhone(value: string): boolean {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0040') && digits.length === 13) digits = `0${digits.slice(4)}`;
  if (digits.startsWith('40') && digits.length === 11) digits = `0${digits.slice(2)}`;
  return /^0\d{9}$/.test(digits);
}

function FieldLabel({ label, htmlFor, required, optional }: { label: string; htmlFor: string; required?: boolean; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-light-80 mb-1.5">
      {label}
      {required && <span className="text-error-500"> *</span>}
      {optional && <span className="font-normal text-light-50"> (opțional)</span>}
    </label>
  );
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'problem'; message: string; code?: string }
  | { kind: 'ready'; invite: BrokerInvitePreview }
  | { kind: 'done'; slug: string; email: string };

function problemFrom(err: unknown): { message: string; code?: string } {
  if (axios.isAxiosError(err)) {
    if (!err.response) return { message: 'Nu ne putem conecta la server. Verifică conexiunea și reîncarcă pagina.' };
    const data = err.response.data as { message?: string; code?: string } | undefined;
    if (data?.message) return { message: data.message, code: data.code };
  }
  return { message: 'Nu am putut verifica invitația. Încearcă din nou mai târziu.' };
}

export default function BrokerInvitePage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('t') ?? '');
  const [state, setState] = useState<PageState>(token ? { kind: 'loading' } : { kind: 'problem', message: 'Linkul de invitație nu este complet. Deschide-l din nou din email.' });
  const [terms, setTerms] = useState<BrokerTermsText | null>(null);

  const [prenume, setPrenume] = useState('');
  const [nume, setNume] = useState('');
  const [telefon, setTelefon] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oras, setOras] = useState('');
  const [judet, setJudet] = useState('');
  const [slugInput, setSlugInput] = useState<string | null>(null);
  const [firmaNume, setFirmaNume] = useState('');
  const [firmaCui, setFirmaCui] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [availability, setAvailability] = useState<SlugAvailability | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('t');
    window.history.replaceState(window.history.state, '', url);

    let active = true;
    brokerInvitesApi.preview(token)
      .then(invite => {
        if (!active) return;
        setState({ kind: 'ready', invite });
        const parts = (invite.name ?? '').trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          setPrenume(v => v || parts.slice(0, -1).join(' '));
          setNume(v => v || parts[parts.length - 1]);
        }
      })
      .catch(err => { if (active) setState({ kind: 'problem', ...problemFrom(err) }); });
    brokerInvitesApi.terms().then(t => { if (active) setTerms(t); }).catch(() => undefined);
    return () => { active = false; };
  }, [token]);

  const suggested = useMemo(() => slugify(`${prenume} ${nume}`).replace(/-$/, ''), [prenume, nume]);
  const slug = slugInput ?? suggested;
  const slugFormatOk = SLUG_FORMAT.test(slug);

  useEffect(() => {
    if (!token || !slugFormatOk) return;
    let active = true;
    const timer = window.setTimeout(() => {
      brokerInvitesApi.slugAvailable(token, slug)
        .then(result => { if (active) setAvailability(result); })
        .catch(() => { if (active) setAvailability(null); });
    }, 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [token, slug, slugFormatOk]);

  const slugCheck = availability && availability.slug === slug ? availability : null;
  const slugStatus: 'empty' | 'invalid' | 'checking' | 'free' | 'taken' =
    !slug ? 'empty' : !slugFormatOk ? 'invalid' : !slugCheck ? 'checking' : slugCheck.available ? 'free' : 'taken';

  const passwordLong = password.length >= MIN_PASSWORD;
  const passwordsMatch = password === passwordConfirm;

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!prenume.trim()) list.push('prenumele');
    if (!nume.trim()) list.push('numele');
    if (!validPhone(telefon)) list.push('telefonul');
    if (!passwordLong) list.push(`parola (minim ${MIN_PASSWORD} caractere)`);
    else if (!passwordsMatch) list.push('confirmarea parolei');
    if (oras.trim().length < 2) list.push('orașul');
    if (!judet) list.push('județul');
    if (slugStatus !== 'free') list.push('adresa ta în CRM');
    if (!accepted) list.push('acceptul termenilor');
    return list;
  }, [prenume, nume, telefon, passwordLong, passwordsMatch, oras, judet, slugStatus, accepted]);

  const submit = async () => {
    if (state.kind !== 'ready' || !terms || missing.length > 0 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await brokerInvitesApi.accept(token, {
        nume: nume.trim(),
        prenume: prenume.trim(),
        telefon: telefon.trim(),
        password,
        passwordConfirm,
        oras: oras.trim(),
        judet,
        slug,
        firmaNume: firmaNume.trim(),
        firmaCui: firmaCui.trim(),
        acceptTerms: accepted,
        termsVersion: terms.version,
      });
      setState({ kind: 'done', slug: result.slug, email: state.invite.email });
    } catch (err) {
      const problem = problemFrom(err);
      if (axios.isAxiosError(err) && err.response && [404, 410].includes(err.response.status)) {
        setState({ kind: 'problem', ...problem });
      } else {
        setError(problem.message);
        setAvailability(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 size={30} className="animate-spin text-brand-primary" aria-label="Se verifică invitația" />
      </div>
    );
  }

  if (state.kind === 'problem') {
    return (
      <div className="min-h-screen bg-dark-900 px-4 py-8">
        <div className="w-full max-w-lg mx-auto">
          <div className="flex justify-center mb-6"><Logo size="md" clickable={false} /></div>
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.04] p-6 text-center">
            <h1 className="text-[22px] font-bold text-light-100 mb-3">Invitația nu este disponibilă</h1>
            <p role="alert" className="text-[15px] text-light-70 leading-relaxed">{state.message}</p>
            {state.code === 'used' && (
              <Link to="/auth/login" className="mt-6 block w-full py-4 rounded-xl bg-success-600 hover:bg-success-500 text-white text-base font-semibold">
                Autentifică-te
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'done') {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div className="w-24 h-24 rounded-full bg-success-500/12 flex items-center justify-center mb-6">
            <CheckCircle size={46} className="text-success-600" />
          </div>
          <h1 className="text-[26px] font-bold text-light-100 mb-3">Contul tău este gata</h1>
          <p className="text-[15px] text-light-70 leading-relaxed max-w-sm">
            Autentifică-te cu {state.email} și parola pe care ai ales-o.
          </p>
          <p className="text-[15px] text-light-70 leading-relaxed max-w-sm mt-3">
            Adresa ta în CRM este <span className="font-semibold text-light-90">{state.slug}.{ROOT_DOMAIN_NAME}</span>.
          </p>
          <Link to="/auth/login" className="mt-8 w-full max-w-sm py-4 rounded-xl bg-success-600 hover:bg-success-500 text-white text-base font-semibold shadow-sm">
            Intră în cont
          </Link>
        </div>
      </div>
    );
  }

  const greeting = state.invite.name ? `Bun venit, ${state.invite.name}!` : 'Bun venit!';
  const canSubmit = missing.length === 0 && !!terms && !submitting;

  return (
    <div className="min-h-screen bg-dark-900 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex justify-center mb-6"><Logo size="md" clickable={false} /></div>

        <form
          onSubmit={e => { e.preventDefault(); void submit(); }}
          className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6"
          noValidate
        >
          <h1 className="text-[22px] leading-snug font-bold text-light-100">Creează-ți contul de broker</h1>
          <p className="text-sm text-light-60 mt-1.5 mb-6">{greeting} Completează datele de mai jos și intri în CRM-ul MoneyShop.</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <FieldLabel label="Prenume" htmlFor="bi-prenume" required />
              <input id="bi-prenume" value={prenume} onChange={e => setPrenume(e.target.value)} autoComplete="given-name" className={inputClass} />
            </div>
            <div>
              <FieldLabel label="Nume" htmlFor="bi-nume" required />
              <input id="bi-nume" value={nume} onChange={e => setNume(e.target.value)} autoComplete="family-name" className={inputClass} />
            </div>
          </div>

          <div className="mb-3">
            <FieldLabel label="Telefon" htmlFor="bi-telefon" required />
            <input id="bi-telefon" type="tel" inputMode="tel" value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="07xxxxxxxx" autoComplete="tel" className={inputClass} />
          </div>

          <div className="mb-3">
            <FieldLabel label="Email" htmlFor="bi-email" />
            <input id="bi-email" type="email" value={state.invite.email} readOnly className={`${inputClass} bg-dark-800 text-light-60`} />
            <p className="text-[12px] text-light-50 mt-1">Cu acest email te autentifici. Nu poate fi schimbat aici.</p>
          </div>

          <div className="mb-3">
            <FieldLabel label="Parolă" htmlFor="bi-parola" required />
            <div className="relative">
              <input
                id="bi-parola"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={`Cel puțin ${MIN_PASSWORD} caractere`}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-light-50 hover:text-light-80"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="mb-3">
            <FieldLabel label="Repetă parola" htmlFor="bi-parola2" required />
            <input id="bi-parola2" type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} autoComplete="new-password" className={inputClass} />
            {passwordConfirm && !passwordsMatch && <p className="text-[12px] text-error-600 mt-1">Parolele nu coincid.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <FieldLabel label="Oraș" htmlFor="bi-oras" required />
              <input id="bi-oras" value={oras} onChange={e => setOras(e.target.value)} autoComplete="address-level2" maxLength={100} className={inputClass} />
            </div>
            <div>
              <FieldLabel label="Județ" htmlFor="bi-judet" required />
              <div className="relative">
                <select
                  id="bi-judet"
                  value={judet}
                  onChange={e => setJudet(e.target.value)}
                  className={`w-full appearance-none pl-3.5 pr-9 py-3 text-base rounded-xl bg-white ring-1 ring-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition ${judet ? 'text-light-90' : 'text-light-50'}`}
                >
                  <option value="">Alege</option>
                  {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-light-50 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <FieldLabel label="Adresa ta în CRM" htmlFor="bi-slug" required />
            <div className="flex items-center gap-1">
              <input
                id="bi-slug"
                value={slug}
                onChange={e => setSlugInput(slugify(e.target.value))}
                maxLength={MAX_SLUG}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={inputClass}
              />
              <span className="text-sm text-light-60 shrink-0">.{ROOT_DOMAIN_NAME}</span>
            </div>
            <p className="text-[12px] mt-1" aria-live="polite">
              {slugStatus === 'empty' && <span className="text-light-50">Litere mici, cifre și cratime, 3-{MAX_SLUG} caractere.</span>}
              {slugStatus === 'invalid' && <span className="text-error-600">3-{MAX_SLUG} caractere: litere mici, cifre și cratime (nu la început sau la sfârșit).</span>}
              {slugStatus === 'checking' && <span className="text-light-50">Se verifică...</span>}
              {slugStatus === 'free' && <span className="text-success-600">Disponibilă</span>}
              {slugStatus === 'taken' && <span className="text-error-600">{slugCheck?.reason ?? 'Adresa nu este disponibilă.'}</span>}
            </p>
          </div>

          <p className="text-sm font-semibold text-light-90 mt-5 mb-2.5">Firma <span className="font-normal text-light-50">(opțional, o poți completa mai târziu)</span></p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <FieldLabel label="Nume firmă" htmlFor="bi-firma" />
              <input id="bi-firma" value={firmaNume} onChange={e => setFirmaNume(e.target.value)} autoComplete="organization" maxLength={255} className={inputClass} />
            </div>
            <div>
              <FieldLabel label="CUI" htmlFor="bi-cui" />
              <input id="bi-cui" value={firmaCui} onChange={e => setFirmaCui(e.target.value)} maxLength={20} className={inputClass} />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer mb-1">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-brand-primary shrink-0"
            />
            <span className="text-[13px] text-light-70 leading-snug">
              Am citit și accept{' '}
              <button type="button" onClick={() => setTermsOpen(true)} className="inline text-left font-medium text-brand-primary underline underline-offset-2">
                Termenii de utilizare a CRM-ului MoneyShop
              </button>
              <span className="text-error-500"> *</span>
            </span>
          </label>

          {error && <p role="alert" className="text-error-600 text-sm mt-4 bg-error-500/8 rounded-xl px-4 py-3">{error}</p>}

          {missing.length > 0 && (
            <p className="mt-4 text-[13px] text-light-60" aria-live="polite">Mai ai de completat: {missing.join(', ')}.</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 mt-5 rounded-xl bg-success-600 hover:bg-success-500 text-white text-base font-semibold shadow-sm active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
          >
            {submitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={20} className="animate-spin" /> Se creează contul...</span>
              : 'Creează contul'}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[12px] text-light-60 mt-3">
            <ShieldCheck size={13} /> Linkul tău este personal și se poate folosi o singură dată.
          </p>
        </form>
      </div>

      {termsOpen && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div role="dialog" aria-modal="true" aria-label="Termenii de utilizare" className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600">
              <h2 className="font-semibold text-light-100 pr-4 leading-snug">{terms?.title ?? 'Termenii de utilizare a CRM-ului MoneyShop'}</h2>
              <button onClick={() => setTermsOpen(false)} aria-label="Închide" className="w-9 h-9 rounded-full hover:bg-dark-800 flex items-center justify-center text-light-60 shrink-0">
                <X size={21} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <p className="text-[14px] text-light-80 whitespace-pre-wrap leading-relaxed">
                {terms?.body ?? 'Textul termenilor nu este disponibil momentan. Reîncarcă pagina.'}
              </p>
              {terms && <p className="text-[12px] text-light-50 mt-4">Versiunea {terms.version}</p>}
            </div>
            <div className="px-5 py-4 border-t border-dark-600">
              <button onClick={() => setTermsOpen(false)} className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-semibold">
                Am înțeles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
