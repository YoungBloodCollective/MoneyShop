import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText, UploadCloud, Check, X, Info, ChevronRight,
  Loader2, CheckCircle, ShieldCheck,
} from 'lucide-react';
import axios from 'axios';
import { acordApi, type AcordConsentText } from '@/services/api/acordApi';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { Logo } from '@/components/shared/Logo';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = 'image/png,image/jpeg,image/jpg,image/heic,image/heif,application/pdf';

/**
 * Which documents each type of ID needs. Only the chipped electronic card omits
 * the printed address, so that one needs a separate proof of address; every
 * other card carries its address and needs just both sides.
 */
const TIP_ACT_OPTIONS = [
  { value: 'buletin', label: 'Buletin', back: true, proof: false },
  { value: 'buletin_electronic', label: 'Carte electronică (cu cip)', back: false, proof: true },
  { value: 'carte_identitate', label: 'Carte electronică simplă', back: true, proof: false },
] as const;

type SlotKey = 'front' | 'back' | 'proof';

/**
 * Mirrors the three opt-ins the API serves. Kept locally so a failed
 * consent-text call cannot leave the form without its required checkbox.
 */
const FALLBACK_CONSENT_OPTIONS = [
  {
    key: 'intermediere',
    label: 'Sunt de acord cu prelucrarea datelor mele în scopul intermedierii creditului.',
    required: true,
  },
  {
    key: 'marketing',
    label: 'Sunt de acord să primesc comunicări comerciale și oferte.',
    required: false,
  },
  {
    key: 'oug52Waiver',
    label: 'Solicit începerea imediată a serviciilor și, în măsura permisă de lege, renunț la perioada de așteptare.',
    required: false,
  },
];

const DOCUMENT_SLOTS: { key: SlotKey; step: string; title: string }[] = [
  { key: 'front', step: '1', title: 'Poză față' },
  { key: 'back', step: '2', title: 'Poză spate/verso' },
  { key: 'proof', step: '3', title: 'Dovadă de adresă' },
];

function Field({
  label, value, onChange, placeholder, type = 'text', inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'email';
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-light-80 mb-1.5">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-3 text-base rounded-xl bg-white ring-1 ring-dark-500 text-light-90 placeholder:text-light-50 focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
      />
    </div>
  );
}

export default function AcordClientPage() {
  const [searchParams] = useSearchParams();
  const agentCode = searchParams.get('ag') ?? undefined;

  const [nume, setNume] = useState('');
  const [prenume, setPrenume] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [tipAct, setTipAct] = useState<string>('buletin');

  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    front: null, back: null, proof: null,
  });

  const [consentText, setConsentText] = useState<AcordConsentText | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [choices, setChoices] = useState<Record<string, boolean>>({
    intermediere: false, marketing: false, oug52Waiver: false,
  });
  const [signature, setSignature] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    proof: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    acordApi.getConsentText().then(setConsentText).catch(() => undefined);
  }, []);

  const pickFile = (key: SlotKey, file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setError(`${file.name}: fișierul depășește 10MB.`);
      return;
    }

    setError('');
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const rules = TIP_ACT_OPTIONS.find(o => o.value === tipAct) ?? TIP_ACT_OPTIONS[0];

  const isRequired = (key: SlotKey) =>
    key === 'front' ? true : key === 'back' ? rules.back : rules.proof;

  const phoneDigits = telefon.replace(/\D/g, '');
  const canSubmit =
    nume.trim().length >= 2 &&
    prenume.trim().length >= 2 &&
    (phoneDigits.length === 10 || phoneDigits.length === 11) &&
    !!files.front &&
    (!rules.back || !!files.back) &&
    (!rules.proof || !!files.proof) &&
    choices.intermediere &&
    !!signature;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      await acordApi.submit({
        nume: nume.trim(),
        prenume: prenume.trim(),
        telefon: telefon.trim(),
        email: email.trim() || undefined,
        tipAct,
        agentCode,
        documentFront: files.front!,
        documentBack: files.back,
        addressProof: files.proof,
        signatureDataUri: signature!,
        acceptIntermediere: choices.intermediere,
        acceptMarketing: choices.marketing,
        waiveOug52: choices.oug52Waiver,
      });
      setDone(true);
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError('Nu ne putem conecta la server. Verifică conexiunea și încearcă din nou.');
      } else {
        const msg = axios.isAxiosError(err) ? (err.response?.data?.message as string) : undefined;
        setError(msg || 'Nu am putut trimite formularul. Încearcă din nou.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div className="w-24 h-24 rounded-full bg-success-500/12 flex items-center justify-center mb-6">
            <CheckCircle size={46} className="text-success-600" />
          </div>
          <h1 className="text-[26px] font-bold text-light-100 mb-3">
            Gata{prenume ? `, ${prenume}` : ''}. Mulțumim!
          </h1>
          <p className="text-[15px] text-light-70 leading-relaxed max-w-sm">
            Am primit datele și documentele tale în siguranță. Te contactăm în cel mai scurt timp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex justify-center mb-6">
          <Logo size="md" clickable={false} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
          <h1 className="text-[22px] leading-snug font-bold text-light-100">
            Acord de intermediere și prelucrare date
          </h1>
          <p className="text-sm text-light-60 mt-1.5 mb-6">
            Completează datele și încarcă documentele.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Nume" value={nume} onChange={setNume} placeholder="Introdu numele" />
            <Field label="Prenume" value={prenume} onChange={setPrenume} placeholder="Introdu prenumele" />
            <Field label="Telefon" value={telefon} onChange={setTelefon} placeholder="07xxxxxxxx" type="tel" inputMode="tel" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="exemplu@email.com" type="email" inputMode="email" />
          </div>

          <p className="text-sm font-semibold text-light-90 mb-2.5">Tip act de identitate</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {TIP_ACT_OPTIONS.map(opt => {
              const active = tipAct === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipAct(opt.value)}
                  className={`flex flex-col items-start gap-2 rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? 'ring-2 ring-brand-primary bg-brand-primary/5'
                      : 'ring-1 ring-dark-500 bg-white hover:ring-dark-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-[5px] shrink-0 ${
                    active ? 'border-brand-primary' : 'border-dark-500'
                  }`} />
                  <span className="text-[13px] font-medium text-light-90 leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-sm font-semibold text-light-90 mb-2.5">Încarcă documentele</p>
          <div className="grid grid-cols-3 gap-2">
            {DOCUMENT_SLOTS.map(slot => {
              const file = files[slot.key];
              const required = isRequired(slot.key);
              return (
                <div
                  key={slot.key}
                  className={`rounded-xl p-3 flex flex-col items-center text-center transition ${
                    file ? 'ring-2 ring-success-500 bg-success-500/5'
                         : required ? 'ring-1 ring-dark-500 bg-white'
                         : 'ring-1 ring-dark-600 bg-dark-800'
                  }`}
                >
                  <p className="text-[11.5px] font-medium text-light-80 leading-tight mb-1 h-[28px] flex items-center justify-center">
                    {slot.step}. {slot.title}
                  </p>
                  <span className={`text-[10px] font-medium mb-1.5 ${
                    required ? 'text-brand-primary' : 'text-light-60'
                  }`}>
                    {required ? 'Obligatoriu' : 'Opțional'}
                  </span>
                  {file ? <Check size={26} className="text-success-600 mb-2" />
                        : <FileText size={26} className="text-light-50 mb-2" />}
                  <button
                    type="button"
                    onClick={() => inputRefs[slot.key].current?.click()}
                    className="text-[12px] font-medium text-brand-primary flex items-center gap-1 min-h-[32px]"
                  >
                    <UploadCloud size={14} /> {file ? 'Schimbă' : 'Încarcă'}
                  </button>
                  {file && (
                    <span className="text-[10px] text-light-60 truncate w-full mt-0.5">{file.name}</span>
                  )}
                  <input
                    ref={inputRefs[slot.key]}
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={e => { pickFile(slot.key, e.target.files?.[0]); e.target.value = ''; }}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-[12px] text-light-60 mt-2.5 mb-5">
            Formate acceptate: PNG, JPG, PDF. Dimensiune max: 10MB / fișier.
          </p>

          <button
            type="button"
            onClick={() => setConsentOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl bg-info-400/10 ring-1 ring-info-400/30 px-4 py-3.5 text-left mb-5"
          >
            <Info size={19} className="text-info-500 shrink-0 mt-0.5 self-start" />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-light-90">
                Informații GDPR și Intermediere credit
              </span>
              <span className="block text-[12px] text-light-60 mt-0.5">
                Te rugăm să citești informațiile înainte de a continua.
              </span>
            </span>
            <ChevronRight size={18} className="text-light-50 shrink-0 self-center" />
          </button>

          <div className="space-y-2.5 mb-5">
            {(consentText?.options?.length ? consentText.options : FALLBACK_CONSENT_OPTIONS).map(option => (
              <label key={option.key} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={choices[option.key] ?? false}
                  onChange={e => setChoices(p => ({ ...p, [option.key]: e.target.checked }))}
                  className="mt-0.5 w-5 h-5 rounded accent-brand-primary shrink-0"
                />
                <span className="text-[12.5px] text-light-70 leading-snug">
                  {option.label}
                  {option.required && <span className="text-error-500"> *</span>}
                </span>
              </label>
            ))}
          </div>

          <p className="text-sm font-semibold text-light-90 mb-2">
            Semnătură <span className="font-normal text-light-60">(desenează în chenar)</span>
          </p>
          <SignaturePad onChange={setSignature} disabled={!choices.intermediere} height={150} />
          {!choices.intermediere && (
            <p className="text-[12px] text-light-60 mt-1.5">
              Bifează întâi acordul obligatoriu ca să poți semna.
            </p>
          )}

          {error && (
            <p className="text-error-600 text-sm mt-4 bg-error-500/8 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-4 mt-5 rounded-xl bg-success-600 hover:bg-success-500 text-white text-base font-semibold shadow-sm active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
          >
            {submitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={20} className="animate-spin" /> Se trimite...</span>
              : 'Trimite acordul'}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[12px] text-light-60 mt-3">
            <ShieldCheck size={13} /> Datele tale sunt în siguranță.
          </p>
        </div>
      </div>

      {consentOpen && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600">
              <h2 className="font-semibold text-light-100 pr-4 leading-snug">
                {consentText?.title ?? 'Informații GDPR și Intermediere credit'}
              </h2>
              <button
                onClick={() => setConsentOpen(false)}
                aria-label="Închide"
                className="w-9 h-9 rounded-full hover:bg-dark-800 flex items-center justify-center text-light-60 shrink-0"
              >
                <X size={21} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <p className="text-[14px] text-light-80 whitespace-pre-wrap leading-relaxed">
                {consentText?.body ?? 'Textul acordului nu este disponibil momentan.'}
              </p>
            </div>
            <div className="px-5 py-4 border-t border-dark-600">
              <button
                onClick={() => setConsentOpen(false)}
                className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-semibold"
              >
                Am înțeles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
