import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Camera, Upload, CheckCircle, XCircle, ArrowRight, ShieldCheck,
  FileText, X, Loader2, IdCard, Home, UserCircle, Lock, Clock, Check,
  Smartphone, Copy, Monitor,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Logo } from '@/components/shared/Logo';
import axios from 'axios';
import { acordApi, type AcordConsentText, type AcordSession } from '@/services/api/acordApi';
import { SignaturePad } from '@/components/ui/SignaturePad';

type Step =
  | 'welcome'
  | 'form'
  | 'handoff'
  | 'doc_front'
  | 'doc_back'
  | 'selfie'
  | 'address_proof'
  | 'consent'
  | 'submitting'
  | 'done'
  | 'error';

const STEP_ORDER: Step[] = ['form', 'doc_front', 'doc_back', 'selfie', 'address_proof', 'consent'];

const STEP_LABELS: Partial<Record<Step, string>> = {
  form: 'Datele tale',
  doc_front: 'Fata buletinului',
  doc_back: 'Spatele buletinului',
  selfie: 'O poza cu tine',
  address_proof: 'Dovada de adresa',
  consent: 'Acordul tau',
};

/**
 * Photographing an ID is a phone job: desktops often have no camera, and a
 * webcam rarely produces a readable document. Coarse pointer is the most
 * reliable signal for "this is a touch device".
 */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Works out where a resumed session left off. */
function stepFromSession(session: AcordSession): Step {
  if (session.isSigned) return 'done';
  if (!session.hasIdFront) return 'doc_front';
  if (!session.hasIdBack) return 'doc_back';
  if (!session.hasSelfie) return 'selfie';
  if (session.requiresProofOfAddress && !session.hasProofOfAddress) return 'address_proof';
  return 'consent';
}

function dataUriToBlob(dataUri: string): Blob {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URI');
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}


function Shell({ children, showTrust = true }: { children: React.ReactNode; showTrust?: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F4F7FF] to-[#EAEFFA] flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-md flex-1 flex flex-col">
        <div className="flex justify-center mb-6">
          <Logo size="md" clickable={false} />
        </div>

        <div className="flex-1">{children}</div>

        {showTrust && (
          <div className="flex items-center justify-center gap-2 mt-8 pt-4 text-light-60">
            <Lock size={13} className="shrink-0" />
            <span className="text-xs">Conexiune securizata &middot; datele tale raman confidentiale</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-3xl shadow-sm ring-1 ring-black/[0.04] ${className}`}>
      {children}
    </div>
  );
}

function Progress({ step, requiresAddressProof }: { step: Step; requiresAddressProof: boolean }) {
  const visible = STEP_ORDER.filter(s => s !== 'address_proof' || requiresAddressProof);
  const current = visible.indexOf(step);
  if (current < 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-sm font-semibold text-brand-primary">
          {STEP_LABELS[step]}
        </span>
        <span className="text-xs text-light-60">
          Pasul {current + 1} din {visible.length}
        </span>
      </div>
      <div className="flex gap-1.5">
        {visible.map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < current ? 'bg-brand-primary/40'
                : i === current ? 'bg-brand-primary'
                : 'bg-dark-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

interface CameraStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraOn: boolean;
  busy: boolean;
  error: string;
  guide: 'card' | 'face';
  uploadLabel: string;
  onOpenCamera: () => void;
  onCapture: () => void;
  onFilePicked: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowSkip?: boolean;
  onSkip?: () => void;
  hint?: string;
}

function CameraStage({
  videoRef, fileInputRef, cameraOn, busy, error, guide, uploadLabel,
  onOpenCamera, onCapture, onFilePicked, allowSkip, onSkip, hint,
}: CameraStageProps) {
  // capture() grabs the whole video frame, so the preview has to show the whole
  // frame too — otherwise the client carefully frames the document inside a box
  // and the photo that gets taken is wider than what they saw. Matching the
  // container to the stream's own aspect ratio keeps preview and capture
  // identical, with no crop and no letterboxing.
  const [streamAspect, setStreamAspect] = useState<number | null>(null);

  const fallbackAspect = guide === 'face' ? 3 / 4 : 4 / 3;

  return (
    <>
      <div
        className="relative rounded-3xl overflow-hidden bg-navy-900 mb-4 shadow-sm"
        style={{ aspectRatio: String(streamAspect ?? fallbackAspect) }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={e => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) setStreamAspect(v.videoWidth / v.videoHeight);
          }}
          className="w-full h-full object-contain"
        />

        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-3 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
              <Camera size={30} className="text-brand-primary" />
            </div>
            {hint && <p className="text-sm text-light-70 leading-relaxed">{hint}</p>}
          </div>
        )}

        {cameraOn && (
          <div className="absolute inset-2.5 flex items-center justify-center pointer-events-none">
            <div
              className="border-[3px] border-white/90 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
              style={
                guide === 'face'
                  ? { height: '100%', aspectRatio: '0.78', maxWidth: '100%' }
                  : { width: '100%', aspectRatio: '1.586', maxHeight: '100%' }
              }
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {!cameraOn ? (
          <button
            onClick={onOpenCamera}
            disabled={busy}
            className="w-full py-5 rounded-full bg-brand-primary text-white text-base font-semibold flex items-center justify-center gap-2.5 shadow-md shadow-brand-primary/20 active:scale-[0.99] transition disabled:opacity-50"
          >
            <Camera size={21} /> Deschide camera
          </button>
        ) : (
          <button
            onClick={onCapture}
            disabled={busy}
            className="w-full py-5 rounded-full bg-brand-primary text-white text-base font-semibold shadow-md shadow-brand-primary/20 active:scale-[0.99] transition disabled:opacity-50"
          >
            {busy ? <Loader2 size={21} className="animate-spin mx-auto" /> : 'Fotografiaza'}
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="w-full py-4 rounded-full bg-white ring-1 ring-dark-500 text-light-80 font-medium flex items-center justify-center gap-2.5 active:scale-[0.99] transition disabled:opacity-50"
        >
          <Upload size={19} /> {uploadLabel}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFilePicked}
        />

        {allowSkip && (
          <button
            onClick={onSkip}
            disabled={busy}
            className="w-full py-3 text-light-60 font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            Sari peste acest pas <ArrowRight size={16} />
          </button>
        )}

        {error && (
          <p className="text-error-600 text-sm text-center bg-error-500/8 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}
      </div>
    </>
  );
}

export default function AcordClientPage() {
  const [searchParams] = useSearchParams();
  const agentCode = searchParams.get('ag') ?? undefined;
  const resumeToken = searchParams.get('t');

  // A resumed session starts on 'welcome' but immediately shows the resuming
  // spinner; the effect below moves it to the right step once the session loads.
  const [step, setStep] = useState<Step>('welcome');
  const [token, setToken] = useState<string | null>(null);
  const [resuming, setResuming] = useState(Boolean(resumeToken));
  const [onDesktop] = useState(() => !isTouchDevice());
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [nume, setNume] = useState('');
  const [prenume, setPrenume] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');

  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [requiresAddressProof, setRequiresAddressProof] = useState(false);
  const [addressProofName, setAddressProofName] = useState('');

  const [consentText, setConsentText] = useState<AcordConsentText | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [choices, setChoices] = useState<Record<string, boolean>>({
    intermediere: false,
    marketing: false,
    oug52Waiver: false,
  });
  const [signature, setSignature] = useState<string | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    acordApi.getConsentText().then(setConsentText).catch(() => undefined);
  }, []);

  // A link carrying ?t=<token> resumes an existing session - this is how the
  // desktop-to-phone handoff continues where it left off.
  useEffect(() => {
    if (!resumeToken) return;

    let cancelled = false;
    acordApi.getSession(resumeToken)
      .then(session => {
        if (cancelled) return;
        setToken(resumeToken);
        setPrenume(session.prenume);
        setRequiresAddressProof(session.requiresProofOfAddress);
        setStep(stepFromSession(session));
      })
      .catch(() => {
        if (cancelled) return;
        setError('Linkul a expirat sau nu mai este valid. Te rugam sa iei legatura cu consultantul tau.');
        setStep('error');
      })
      .finally(() => { if (!cancelled) setResuming(false); });

    return () => { cancelled = true; };
  }, [resumeToken]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('Nu am putut deschide camera. Poti incarca in schimb o poza din telefon.');
    }
  };

  const capture = (): Blob | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    return dataUriToBlob(canvas.toDataURL('image/jpeg', 0.9));
  };

  // Distinguishes "we could not reach the server" from "the server rejected this".
  // Telling someone to check their details when the API is unreachable sends them
  // in circles.
  const messageFrom = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        return err.code === 'ECONNABORTED'
          ? 'Conexiunea a durat prea mult. Verifica internetul si incearca din nou.'
          : 'Nu ne putem conecta la server. Verifica conexiunea la internet si incearca din nou.';
      }

      const serverMessage = err.response.data?.message as string | undefined;
      if (serverMessage) return serverMessage;

      if (err.response.status >= 500) {
        return 'Serverul intampina o problema. Te rugam sa incerci din nou in cateva momente.';
      }
    }

    return fallback;
  };

  // ── Step actions ──

  const handleStart = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await acordApi.start({
        nume: nume.trim(),
        prenume: prenume.trim(),
        telefon: telefon.trim(),
        email: email.trim() || undefined,
        agentCode,
      });
      setToken(result.token);
      setStep(onDesktop ? 'handoff' : 'doc_front');
    } catch (err) {
      setError(messageFrom(err, 'Nu am putut incepe. Verifica datele si incearca din nou.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDocument = async (front: Blob, back?: Blob) => {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const result = await acordApi.submitDocument(token, front, back);
      setRequiresAddressProof(result.requiresProofOfAddress);
      stopCamera();
      setStep('selfie');
    } catch (err) {
      setError(messageFrom(err, 'Nu am putut incarca documentul. Incearca din nou.'));
    } finally {
      setBusy(false);
    }
  };

  const handleFrontCaptured = (blob: Blob) => {
    setFrontBlob(blob);
    stopCamera();
    setStep('doc_back');
  };

  const handleBackCaptured = (blob: Blob | null) => {
    if (!frontBlob) return;
    handleDocument(frontBlob, blob ?? undefined);
  };

  const handleSelfie = async (blob: Blob | null) => {
    stopCamera();
    if (blob && token) {
      setBusy(true);
      try {
        // The result is recorded for review; it never blocks the client.
        await acordApi.submitLiveness(token, blob);
      } catch {
        // Intentionally ignored - a failed check must not stop the submission.
      } finally {
        setBusy(false);
      }
    }
    setStep(requiresAddressProof ? 'address_proof' : 'consent');
  };

  const handleAddressProof = async (file: File) => {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await acordApi.submitAddressProof(token, file);
      setAddressProofName(file.name);
      setStep('consent');
    } catch (err) {
      setError(messageFrom(err, 'Nu am putut incarca fisierul. Incearca din nou.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSign = async () => {
    if (!token || !signature) return;
    setStep('submitting');
    try {
      const result = await acordApi.sign(token, signature, {
        acceptIntermediere: choices.intermediere,
        acceptMarketing: choices.marketing,
        waiveOug52: choices.oug52Waiver,
      });
      if (result.success) {
        setStep('done');
      } else {
        setError(result.message ?? 'Semnarea nu a reusit.');
        setStep('consent');
      }
    } catch (err) {
      setError(messageFrom(err, 'Nu am putut salva acordul. Incearca din nou.'));
      setStep('consent');
    }
  };

  const handoffUrl = token ? `${window.location.origin}/acord?t=${token}` : '';

  const copyHandoffLink = async () => {
    try {
      await navigator.clipboard.writeText(handoffUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setError('Nu am putut copia linkul. Selecteaza-l manual si copiaza-l.');
    }
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>, handler: (b: Blob) => void) => {
    const file = e.target.files?.[0];
    if (file) handler(file);
    e.target.value = '';
  };

  // ── Screens ──

  if (resuming) {
    return (
      <Shell showTrust={false}>
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
          <Loader2 size={40} className="text-brand-primary animate-spin mb-5" />
          <p className="text-[15px] text-light-70">Iti reluam sesiunea...</p>
        </div>
      </Shell>
    );
  }

  if (step === 'handoff') {
    return (
      <Shell>
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-5">
            <Smartphone size={38} className="text-brand-primary" />
          </div>
          <h1 className="text-[26px] leading-tight font-bold text-light-100 mb-3">
            Continua pe telefon
          </h1>
          <p className="text-[15px] text-light-70 leading-relaxed">
            Urmeaza sa fotografiezi actul de identitate, iar asta merge mult mai bine
            de pe telefon. Scaneaza codul de mai jos si continui exact de unde ai ramas.
          </p>
        </div>

        <Card className="p-6 mb-5">
          <div className="flex justify-center mb-5">
            <div className="p-4 bg-white rounded-2xl ring-1 ring-dark-500">
              <QRCodeSVG value={handoffUrl} size={188} level="M" />
            </div>
          </div>

          <p className="text-[13px] text-light-60 text-center mb-3">
            Deschide camera telefonului si indreapt-o spre cod
          </p>

          <div className="border-t border-dark-600 pt-4">
            <p className="text-[13px] text-light-60 mb-2">Sau copiaza linkul si trimite-ti-l:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={handoffUrl}
                onFocus={e => e.currentTarget.select()}
                className="flex-1 min-w-0 px-3 py-2.5 text-[13px] rounded-xl bg-dark-800 ring-1 ring-dark-500 text-light-70 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button
                onClick={copyHandoffLink}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium flex items-center gap-1.5 active:scale-[0.98] transition"
              >
                {linkCopied ? <><Check size={15} /> Copiat</> : <><Copy size={15} /> Copiaza</>}
              </button>
            </div>
          </div>
        </Card>

        <div className="flex items-start gap-2.5 bg-brand-accent/12 rounded-2xl px-4 py-3.5 mb-5">
          <Clock size={16} className="text-[#8a5a00] mt-0.5 shrink-0" />
          <p className="text-[13px] text-[#8a5a00] leading-relaxed">
            Linkul este valabil 3 zile. Datele completate pana acum sunt deja salvate.
          </p>
        </div>

        <button
          onClick={() => setStep('doc_front')}
          className="w-full py-4 rounded-full bg-white ring-1 ring-dark-500 text-light-80 font-medium flex items-center justify-center gap-2.5 active:scale-[0.99] transition"
        >
          <Monitor size={18} /> Continua totusi pe acest dispozitiv
        </button>

        {error && (
          <p className="text-error-600 text-sm text-center mt-4 bg-error-500/8 rounded-2xl px-4 py-3">{error}</p>
        )}
      </Shell>
    );
  }

  if (step === 'welcome') {
    return (
      <Shell>
        <div className="text-center mb-7">
          <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck size={38} className="text-brand-primary" />
          </div>
          <h1 className="text-[26px] leading-tight font-bold text-light-100 mb-3">
            Buna! Hai sa facem cunostinta
          </h1>
          <p className="text-[15px] text-light-70 leading-relaxed">
            Avem nevoie de cateva date si de o poza a actului tau de identitate,
            ca sa putem incepe analiza dosarului.
          </p>
          <div className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-full bg-brand-accent/15 text-[13px] font-medium text-[#8a5a00]">
            <Clock size={14} /> Dureaza aproximativ un minut
          </div>
        </div>

        <Card className="p-2 mb-7">
          {[
            { icon: UserCircle, title: 'Cateva date despre tine', sub: 'Nume, telefon si email' },
            { icon: IdCard, title: 'O poza cu buletinul', sub: 'Fata si, daca are, verso' },
            { icon: FileText, title: 'Semnatura pe ecran', sub: 'Pentru acordul de date' },
          ].map(({ icon: Icon, title, sub }, i) => (
            <div
              key={title}
              className={`flex items-center gap-3.5 px-4 py-4 ${i > 0 ? 'border-t border-dark-600' : ''}`}
            >
              <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                <Icon size={21} className="text-brand-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-light-90 leading-snug">{title}</p>
                <p className="text-[13px] text-light-60 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </Card>

        <button
          onClick={() => setStep('form')}
          className="w-full py-5 rounded-full bg-brand-primary text-white text-base font-semibold shadow-md shadow-brand-primary/25 active:scale-[0.99] transition"
        >
          Sa incepem
        </button>
      </Shell>
    );
  }

  if (step === 'form') {
    const phoneDigits = telefon.replace(/\D/g, '');
    const canSubmit =
      nume.trim().length >= 2 &&
      prenume.trim().length >= 2 &&
      (phoneDigits.length === 10 || phoneDigits.length === 11);

    return (
      <Shell>
        <Progress step={step} requiresAddressProof={requiresAddressProof} />
        <h1 className="text-2xl font-bold text-light-100 mb-1.5">Spune-ne cine esti</h1>
        <p className="text-[15px] text-light-60 mb-6">Ca sa stim cu cine vorbim.</p>

        <Card className="p-5 space-y-4">
          {[
            { label: 'Nume', value: nume, set: setNume, placeholder: 'Popescu', type: 'text', mode: 'text' },
            { label: 'Prenume', value: prenume, set: setPrenume, placeholder: 'Ion', type: 'text', mode: 'text' },
            { label: 'Telefon', value: telefon, set: setTelefon, placeholder: '07xx xxx xxx', type: 'tel', mode: 'tel' },
            { label: 'Email', value: email, set: setEmail, placeholder: 'ion@exemplu.ro', type: 'email', mode: 'email', optional: true },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-light-80 mb-1.5">
                {f.label}
                {f.optional && <span className="text-light-60 font-normal"> (optional)</span>}
              </label>
              <input
                type={f.type}
                inputMode={f.mode as 'text' | 'tel' | 'email'}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-4 py-4 text-base rounded-2xl bg-dark-800 ring-1 ring-dark-500 text-light-90 placeholder:text-light-40 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition"
              />
            </div>
          ))}
        </Card>

        {error && (
          <p className="text-error-600 text-sm mt-4 bg-error-500/8 rounded-2xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleStart}
          disabled={!canSubmit || busy}
          className="w-full py-5 mt-6 rounded-full bg-brand-primary text-white text-base font-semibold shadow-md shadow-brand-primary/25 active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? <Loader2 size={21} className="animate-spin mx-auto" /> : 'Continua'}
        </button>
      </Shell>
    );
  }

  if (step === 'doc_front' || step === 'doc_back') {
    const isFront = step === 'doc_front';
    return (
      <Shell>
        <Progress step={step} requiresAddressProof={requiresAddressProof} />
        <h1 className="text-2xl font-bold text-light-100 mb-1.5">
          {isFront ? 'Fotografiaza buletinul' : 'Acum spatele actului'}
        </h1>
        <p className="text-[15px] text-light-60 mb-5">
          {isFront
            ? 'Aseaza actul pe o masa, intr-o lumina buna, si apropie telefonul pana umple chenarul.'
            : 'Daca actul tau are informatii pe verso, fotografiaza-l. Daca nu, poti sari peste.'}
        </p>
        <CameraStage
          videoRef={videoRef}
          fileInputRef={fileInputRef}
          cameraOn={cameraOn}
          busy={busy}
          error={error}
          guide="card"
          hint={isFront
            ? 'Cu cat actul umple mai bine cadrul, cu atat il citim mai bine.'
            : 'Aceeasi procedura ca la fata actului.'}
          uploadLabel="Alege o poza din telefon"
          onOpenCamera={() => startCamera('environment')}
          onCapture={() => {
            const blob = capture();
            if (blob) (isFront ? handleFrontCaptured : handleBackCaptured)(blob);
          }}
          onFilePicked={e => onFilePicked(e, isFront ? handleFrontCaptured : handleBackCaptured)}
          allowSkip={!isFront}
          onSkip={() => { stopCamera(); handleBackCaptured(null); }}
        />
      </Shell>
    );
  }

  if (step === 'selfie') {
    return (
      <Shell>
        <Progress step={step} requiresAddressProof={requiresAddressProof} />
        <h1 className="text-2xl font-bold text-light-100 mb-1.5">O poza cu tine</h1>
        <p className="text-[15px] text-light-60 mb-5">
          Ne ajuta sa confirmam ca tu esti persoana din act. Daca nu reusesti, poti sari peste
          fara nicio problema.
        </p>
        <CameraStage
          videoRef={videoRef}
          fileInputRef={fileInputRef}
          cameraOn={cameraOn}
          busy={busy}
          error={error}
          guide="face"
          hint="Priveste spre camera, cu fata bine luminata si aproape de ecran."
          uploadLabel="Alege un selfie din telefon"
          onOpenCamera={() => startCamera('user')}
          onCapture={() => { const blob = capture(); if (blob) handleSelfie(blob); }}
          onFilePicked={e => onFilePicked(e, blob => handleSelfie(blob))}
          allowSkip
          onSkip={() => handleSelfie(null)}
        />
      </Shell>
    );
  }

  if (step === 'address_proof') {
    return (
      <Shell>
        <Progress step={step} requiresAddressProof={requiresAddressProof} />
        <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center mb-5">
          <Home size={28} className="text-brand-primary" />
        </div>
        <h1 className="text-2xl font-bold text-light-100 mb-1.5">Dovada de adresa</h1>
        <p className="text-[15px] text-light-60 mb-5 leading-relaxed">
          Actul tau de identitate nu contine adresa de domiciliu, asa ca mai avem nevoie de un
          document care o arata.
        </p>

        <Card className="p-4 mb-5">
          <p className="text-[13px] font-medium text-light-80 mb-2">Poti incarca, de exemplu:</p>
          <ul className="space-y-1.5">
            {['O factura recenta de utilitati', 'O adeverinta cu adresa ta', 'Un extras de cont recent'].map(t => (
              <li key={t} className="flex items-start gap-2 text-[14px] text-light-70">
                <Check size={15} className="text-success-600 mt-0.5 shrink-0" /> {t}
              </li>
            ))}
          </ul>
        </Card>

        <button
          onClick={() => proofInputRef.current?.click()}
          disabled={busy}
          className="w-full py-5 rounded-full bg-brand-primary text-white text-base font-semibold flex items-center justify-center gap-2.5 shadow-md shadow-brand-primary/25 active:scale-[0.99] transition disabled:opacity-50"
        >
          {busy
            ? <Loader2 size={21} className="animate-spin" />
            : <><Upload size={21} /> Incarca documentul</>}
        </button>
        <input
          ref={proofInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleAddressProof(f); e.target.value = ''; }}
        />

        <p className="text-xs text-light-60 text-center mt-4">Accepta poze (JPG, PNG) sau PDF.</p>
        {error && (
          <p className="text-error-600 text-sm text-center mt-4 bg-error-500/8 rounded-2xl px-4 py-3">{error}</p>
        )}
      </Shell>
    );
  }

  if (step === 'consent') {
    return (
      <Shell>
        <Progress step={step} requiresAddressProof={requiresAddressProof} />
        <h1 className="text-2xl font-bold text-light-100 mb-1.5">Ultimul pas</h1>
        <p className="text-[15px] text-light-60 mb-5">
          Citeste acordul, bifeaza ce esti de acord si semneaza mai jos.
        </p>

        {addressProofName && (
          <div className="flex items-center gap-2.5 bg-success-500/10 rounded-2xl px-4 py-3 mb-4">
            <CheckCircle size={17} className="text-success-600 shrink-0" />
            <span className="text-sm text-light-80 truncate">{addressProofName}</span>
          </div>
        )}

        <button
          onClick={() => setConsentOpen(true)}
          className="w-full flex items-center justify-between gap-3 bg-white rounded-2xl ring-1 ring-dark-500 px-4 py-4 mb-5 text-left active:scale-[0.99] transition"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
              <FileText size={19} className="text-brand-primary" />
            </span>
            <span className="text-[15px] text-light-90 leading-snug">
              {consentText?.title ?? 'Acord privind prelucrarea datelor'}
            </span>
          </span>
          <span className="text-[13px] font-semibold text-brand-primary shrink-0">Citeste</span>
        </button>

        <Card className="p-2 mb-6">
          {(consentText?.options ?? []).map((option, i) => (
            <label
              key={option.key}
              className={`flex items-start gap-3.5 px-4 py-4 cursor-pointer ${i > 0 ? 'border-t border-dark-600' : ''}`}
            >
              <input
                type="checkbox"
                checked={choices[option.key] ?? false}
                onChange={e => setChoices(prev => ({ ...prev, [option.key]: e.target.checked }))}
                className="mt-0.5 w-6 h-6 rounded-md accent-brand-primary shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-[15px] text-light-90 leading-relaxed">
                  {option.label}
                  {option.required && <span className="text-error-500"> *</span>}
                </span>
                {option.hint && (
                  <span className="block text-[13px] text-light-60 mt-1">{option.hint}</span>
                )}
              </span>
            </label>
          ))}
        </Card>

        <p className="text-sm font-medium text-light-80 mb-2">Semneaza aici</p>
        <SignaturePad onChange={setSignature} disabled={!choices.intermediere} />
        {!choices.intermediere && (
          <p className="text-[13px] text-light-60 mt-2">
            Bifeaza mai intai acordul obligatoriu ca sa poti semna.
          </p>
        )}

        {error && (
          <p className="text-error-600 text-sm mt-4 bg-error-500/8 rounded-2xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleSign}
          disabled={!choices.intermediere || !signature}
          className="w-full py-5 mt-5 rounded-full bg-brand-primary text-white text-base font-semibold shadow-md shadow-brand-primary/25 active:scale-[0.99] transition disabled:opacity-40 disabled:shadow-none"
        >
          Trimite acordul
        </button>

        {consentOpen && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600">
                <h2 className="font-semibold text-light-100 pr-4 leading-snug">
                  {consentText?.title ?? 'Acord'}
                </h2>
                <button
                  onClick={() => setConsentOpen(false)}
                  aria-label="Inchide"
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
                  className="w-full py-4 rounded-full bg-brand-primary text-white font-semibold"
                >
                  Am inteles
                </button>
              </div>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  if (step === 'submitting') {
    return (
      <Shell showTrust={false}>
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
          <Loader2 size={42} className="text-brand-primary animate-spin mb-5" />
          <h1 className="text-xl font-bold text-light-100 mb-2">Se trimite...</h1>
          <p className="text-[15px] text-light-60">Mai dureaza cateva secunde. Nu inchide pagina.</p>
        </div>
      </Shell>
    );
  }

  if (step === 'done') {
    return (
      <Shell showTrust={false}>
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
          <div className="w-24 h-24 rounded-full bg-success-500/12 flex items-center justify-center mb-6">
            <CheckCircle size={46} className="text-success-600" />
          </div>
          <h1 className="text-[26px] font-bold text-light-100 mb-3">
            Gata{prenume ? `, ${prenume}` : ''}. Multumim!
          </h1>
          <p className="text-[15px] text-light-70 leading-relaxed mb-6 max-w-xs">
            Am primit datele si documentele tale in siguranta. Te contactam in cel mai scurt timp.
          </p>
          <div className="flex items-center gap-2 text-light-60 text-sm">
            <Lock size={14} /> Poti inchide aceasta pagina
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell showTrust={false}>
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
        <div className="w-20 h-20 rounded-full bg-error-500/10 flex items-center justify-center mb-5">
          <XCircle size={38} className="text-error-500" />
        </div>
        <h1 className="text-xl font-bold text-light-100 mb-2">Ceva nu a mers</h1>
        <p className="text-[15px] text-light-60 mb-7 max-w-xs">
          {error || 'Te rugam sa incerci din nou. Datele introduse nu s-au pierdut.'}
        </p>
        <button
          onClick={() => { setStep('welcome'); setError(''); }}
          className="px-10 py-4 rounded-full bg-brand-primary text-white font-semibold shadow-md shadow-brand-primary/25"
        >
          Incearca din nou
        </button>
      </div>
    </Shell>
  );
}
