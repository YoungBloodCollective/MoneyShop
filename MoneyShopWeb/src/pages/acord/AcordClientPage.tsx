import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Camera, Upload, CheckCircle, XCircle, ArrowRight, ShieldCheck,
  FileText, X, Loader2, IdCard, Home, UserCircle,
} from 'lucide-react';
import axios from 'axios';
import { acordApi, type AcordConsentText } from '@/services/api/acordApi';
import { SignaturePad } from '@/components/ui/SignaturePad';

type Step =
  | 'welcome'
  | 'form'
  | 'doc_front'
  | 'doc_back'
  | 'selfie'
  | 'address_proof'
  | 'consent'
  | 'submitting'
  | 'done'
  | 'error';

const STEP_ORDER: Step[] = ['form', 'doc_front', 'doc_back', 'selfie', 'address_proof', 'consent'];

function dataUriToBlob(dataUri: string): Blob {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URI');
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}


function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function Progress({ step, requiresAddressProof }: { step: Step; requiresAddressProof: boolean }) {
  const visible = STEP_ORDER.filter(s => s !== 'address_proof' || requiresAddressProof);
  const current = visible.indexOf(step);
  if (current < 0) return null;

  return (
    <div className="flex gap-1.5 mb-6">
      {visible.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-brand-primary' : 'bg-dark-400'}`}
        />
      ))}
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
}

function CameraStage({
  videoRef, fileInputRef, cameraOn, busy, error, guide, uploadLabel,
  onOpenCamera, onCapture, onFilePicked, allowSkip, onSkip,
}: CameraStageProps) {
  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] mb-4">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {!cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-600">
            <Camera size={40} className="text-light-50" />
          </div>
        )}
        {cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`border-2 border-white/50 rounded-xl ${
              guide === 'face' ? 'w-40 h-52' : 'w-64 h-40'
            }`} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {!cameraOn ? (
          <button
            onClick={onOpenCamera}
            disabled={busy}
            className="w-full py-4 rounded-full bg-brand-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera size={20} /> Deschide camera
          </button>
        ) : (
          <button
            onClick={onCapture}
            disabled={busy}
            className="w-full py-4 rounded-full bg-brand-primary text-white font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Fotografiaza'}
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="w-full py-3.5 rounded-full border border-dark-400 text-light-70 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Upload size={18} /> {uploadLabel}
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

        {error && <p className="text-error-500 text-sm text-center">{error}</p>}
      </div>
    </>
  );
}

export default function AcordClientPage() {
  const [searchParams] = useSearchParams();
  const agentCode = searchParams.get('ag') ?? undefined;

  const [step, setStep] = useState<Step>('welcome');
  const [token, setToken] = useState<string | null>(null);
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

  const messageFrom = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) && (err.response?.data?.message as string)) || fallback;

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
      setStep('doc_front');
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

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>, handler: (b: Blob) => void) => {
    const file = e.target.files?.[0];
    if (file) handler(file);
    e.target.value = '';
  };

  // ── Screens ──

  if (step === 'welcome') {
    return (
      <Shell>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/15 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck size={32} className="text-brand-primary" />
          </div>
          <h1 className="text-2xl font-bold text-light-100 mb-3">Hai sa facem cunostinta</h1>
          <p className="text-light-60 leading-relaxed">
            Avem nevoie de cateva date si de o poza a actului tau de identitate, ca sa putem
            incepe analiza dosarului. Dureaza aproximativ un minut.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            { icon: UserCircle, text: 'Numele, telefonul si emailul tau' },
            { icon: IdCard, text: 'O poza cu buletinul (fata si verso)' },
            { icon: FileText, text: 'Semnatura pe ecran pentru acordul de date' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-dark-700 rounded-2xl px-4 py-3.5">
              <Icon size={20} className="text-brand-primary shrink-0" />
              <span className="text-sm text-light-80">{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep('form')}
          className="w-full py-4 rounded-full bg-brand-primary text-white font-semibold"
        >
          Incepe
        </button>

        <p className="text-xs text-light-60 text-center mt-5 leading-relaxed">
          Datele tale sunt transmise securizat si sunt sterse automat dupa perioada de pastrare.
        </p>
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
        <h1 className="text-xl font-bold text-light-100 mb-1">Datele tale</h1>
        <p className="text-sm text-light-50 mb-6">Ca sa stim cu cine vorbim.</p>

        <div className="space-y-4">
          {[
            { label: 'Nume', value: nume, set: setNume, placeholder: 'Popescu', type: 'text' },
            { label: 'Prenume', value: prenume, set: setPrenume, placeholder: 'Ion', type: 'text' },
            { label: 'Telefon', value: telefon, set: setTelefon, placeholder: '07xx xxx xxx', type: 'tel' },
            { label: 'Email (optional)', value: email, set: setEmail, placeholder: 'ion@exemplu.ro', type: 'email' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm text-light-60 mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-4 py-3.5 rounded-2xl bg-dark-700 border border-dark-500 text-light-90 placeholder:text-light-40 focus:outline-none focus:border-brand-primary"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-error-400 text-sm mt-4">{error}</p>}

        <button
          onClick={handleStart}
          disabled={!canSubmit || busy}
          className="w-full py-4 mt-6 rounded-full bg-brand-primary text-white font-semibold disabled:opacity-40"
        >
          {busy ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Continua'}
        </button>
      </Shell>
    );
  }

  if (step === 'doc_front' || step === 'doc_back') {
    const isFront = step === 'doc_front';
    return (
      <Shell>
        <Progress step={step} requiresAddressProof={requiresAddressProof} />
        <h1 className="text-xl font-bold text-light-100 mb-1">
          {isFront ? 'Fata buletinului' : 'Spatele buletinului'}
        </h1>
        <p className="text-sm text-light-50 mb-5">
          {isFront
            ? 'Aseaza actul pe o suprafata si fotografiaza-l intreg.'
            : 'Daca actul tau are informatii pe verso, fotografiaza si aceasta parte.'}
        </p>
        <CameraStage
          videoRef={videoRef}
          fileInputRef={fileInputRef}
          cameraOn={cameraOn}
          busy={busy}
          error={error}
          guide="card"
          uploadLabel="Incarca o poza din telefon"
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
        <h1 className="text-xl font-bold text-light-100 mb-1">O poza cu tine</h1>
        <p className="text-sm text-light-50 mb-5">
          Ne ajuta sa confirmam ca tu esti persoana din act. Daca nu reusesti, poti sari peste.
        </p>
        <CameraStage
          videoRef={videoRef}
          fileInputRef={fileInputRef}
          cameraOn={cameraOn}
          busy={busy}
          error={error}
          guide="face"
          uploadLabel="Incarca un selfie"
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
        <div className="w-14 h-14 rounded-2xl bg-brand-primary/15 flex items-center justify-center mb-5">
          <Home size={26} className="text-brand-primary" />
        </div>
        <h1 className="text-xl font-bold text-light-100 mb-1">Dovada de adresa</h1>
        <p className="text-sm text-light-50 mb-5 leading-relaxed">
          Actul tau de identitate nu contine adresa de domiciliu.
          Incarca o factura de utilitati recenta sau o adeverinta cu adresa ta.
        </p>

        <button
          onClick={() => proofInputRef.current?.click()}
          disabled={busy}
          className="w-full py-4 rounded-full bg-brand-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy
            ? <Loader2 size={20} className="animate-spin" />
            : <><Upload size={20} /> Incarca documentul</>}
        </button>
        <input
          ref={proofInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleAddressProof(f); e.target.value = ''; }}
        />

        <p className="text-xs text-light-60 text-center mt-4">Accepta JPG, PNG sau PDF.</p>
        {error && <p className="text-error-400 text-sm text-center mt-4">{error}</p>}
      </Shell>
    );
  }

  if (step === 'consent') {
    return (
      <Shell>
        <Progress step={step} requiresAddressProof={requiresAddressProof} />
        <h1 className="text-xl font-bold text-light-100 mb-1">Acordul tau</h1>
        <p className="text-sm text-light-50 mb-5">
          Citeste acordul, apoi semneaza in casuta de mai jos.
        </p>

        {addressProofName && (
          <div className="flex items-center gap-2 bg-dark-700 rounded-2xl px-4 py-3 mb-4">
            <CheckCircle size={16} className="text-success-500 shrink-0" />
            <span className="text-sm text-light-70 truncate">{addressProofName}</span>
          </div>
        )}

        <button
          onClick={() => setConsentOpen(true)}
          className="w-full flex items-center justify-between gap-2 bg-dark-700 rounded-2xl px-4 py-3.5 mb-5 text-left"
        >
          <span className="flex items-center gap-2.5 text-sm text-light-80">
            <FileText size={18} className="text-brand-primary shrink-0" />
            {consentText?.title ?? 'Acord privind prelucrarea datelor'}
          </span>
          <span className="text-xs text-brand-primary shrink-0">Citeste</span>
        </button>

        <div className="space-y-3 mb-6">
          {(consentText?.options ?? []).map(option => (
            <label
              key={option.key}
              className="flex items-start gap-3 bg-dark-700 rounded-2xl px-4 py-3.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={choices[option.key] ?? false}
                onChange={e => setChoices(prev => ({ ...prev, [option.key]: e.target.checked }))}
                className="mt-0.5 w-5 h-5 rounded accent-brand-primary shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-sm text-light-80 leading-relaxed">
                  {option.label}
                  {option.required && <span className="text-error-500"> *</span>}
                </span>
                {option.hint && (
                  <span className="block text-xs text-light-60 mt-1">{option.hint}</span>
                )}
              </span>
            </label>
          ))}
        </div>

        <p className="text-sm text-light-60 mb-2">Semneaza mai jos:</p>
        <SignaturePad onChange={setSignature} disabled={!choices.intermediere} />

        {error && <p className="text-error-500 text-sm mt-4">{error}</p>}

        <button
          onClick={handleSign}
          disabled={!choices.intermediere || !signature}
          className="w-full py-4 mt-5 rounded-full bg-brand-primary text-white font-semibold disabled:opacity-40"
        >
          Trimite acordul
        </button>

        {consentOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-dark-700 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-500">
                <h2 className="font-semibold text-light-100 pr-4">
                  {consentText?.title ?? 'Acord'}
                </h2>
                <button onClick={() => setConsentOpen(false)} className="text-light-50 shrink-0">
                  <X size={22} />
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto">
                <p className="text-sm text-light-70 whitespace-pre-wrap leading-relaxed">
                  {consentText?.body ?? 'Textul acordului nu este disponibil momentan.'}
                </p>
              </div>
              <div className="px-5 py-4 border-t border-dark-500">
                <button
                  onClick={() => setConsentOpen(false)}
                  className="w-full py-3.5 rounded-full bg-brand-primary text-white font-semibold"
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
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Loader2 size={40} className="text-brand-primary animate-spin mb-5" />
          <h1 className="text-xl font-bold text-light-100 mb-2">Se trimite...</h1>
          <p className="text-sm text-light-50">Nu inchide pagina.</p>
        </div>
      </Shell>
    );
  }

  if (step === 'done') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <CheckCircle size={56} className="text-success-500 mb-5" />
          <h1 className="text-2xl font-bold text-light-100 mb-3">Gata, multumim!</h1>
          <p className="text-light-60 leading-relaxed mb-2">
            Am primit datele si documentele tale. Te contactam in cel mai scurt timp.
          </p>
          <p className="text-sm text-light-60">Poti inchide aceasta pagina.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <XCircle size={48} className="text-error-500 mb-5" />
        <h1 className="text-xl font-bold text-light-100 mb-2">Ceva nu a mers</h1>
        <p className="text-sm text-light-50 mb-6">{error || 'Incearca din nou mai tarziu.'}</p>
        <button
          onClick={() => { setStep('welcome'); setError(''); }}
          className="px-8 py-3.5 rounded-full bg-brand-primary text-white font-semibold"
        >
          Reia
        </button>
      </div>
    </Shell>
  );
}
