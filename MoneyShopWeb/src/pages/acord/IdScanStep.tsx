import { useEffect, useRef, useState } from 'react';
import { Camera, Check, FileText, Loader2, RefreshCw, TriangleAlert, UploadCloud } from 'lucide-react';
import { DocumentScanner } from './DocumentScanner';
import { type SlotKey, type useIdScan } from './useIdScan';

type IdScanState = ReturnType<typeof useIdScan>;

const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/jpg,image/heic,image/heif,image/webp';
const ACCEPTED_ANY = 'image/png,image/jpeg,image/jpg,image/heic,image/heif,application/pdf';

const MANUAL_SLOTS: { key: SlotKey; title: string }[] = [
  { key: 'front', title: 'Față' },
  { key: 'back', title: 'Verso' },
  { key: 'proof', title: 'Dovadă de adresă (opțional)' },
];

function Thumb({ file }: { file: File }) {
  const [loaded, setLoaded] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setLoaded({ file, url: String(reader.result) });
    reader.readAsDataURL(file);
    return () => { reader.onload = null; reader.abort(); };
  }, [file]);
  const url = loaded?.file === file ? loaded.url : null;
  if (!url) return <FileText size={26} className="text-light-50" />;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}

interface CaptureActionsProps {
  slot: 'front' | 'back';
  state: IdScanState;
  label: string;
  onFile: (file: File | undefined) => void;
}

function CaptureActions({ slot, state, label, onFile }: CaptureActionsProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      {!state.cameraDenied && (
        <button
          type="button"
          onClick={() => state.openCamera(slot)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-primary text-white text-base font-semibold active:scale-[0.99] transition"
        >
          <Camera size={20} /> {label}
        </button>
      )}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={state.cameraDenied
          ? 'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-primary text-white text-base font-semibold'
          : 'text-[13px] font-medium text-brand-primary min-h-[36px] flex items-center gap-1'}
      >
        <UploadCloud size={15} /> Încarcă o poză
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGES}
        className="hidden"
        onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}

function SidePreview({ file, onRedo, disabled }: { file: File; onRedo: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-16 rounded-lg overflow-hidden bg-dark-800 ring-1 ring-dark-500 flex items-center justify-center shrink-0">
        <Thumb file={file} />
      </div>
      <button
        type="button"
        onClick={onRedo}
        disabled={disabled}
        className="text-[13px] font-medium text-brand-primary flex items-center gap-1 min-h-[36px] disabled:opacity-40"
      >
        <RefreshCw size={14} /> Refă poza
      </button>
    </div>
  );
}

function ManualSlots({ state }: { state: IdScanState }) {
  const refs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    proof: useRef<HTMLInputElement>(null),
  };
  const slots = MANUAL_SLOTS.filter(slot => slot.key !== 'proof' || state.electronic === true);
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {slots.map(slot => {
          const file = state.files[slot.key];
          return (
            <div
              key={slot.key}
              className={`rounded-xl p-3 flex flex-col items-center text-center transition ${
                file ? 'ring-2 ring-success-500 bg-success-500/5' : 'ring-1 ring-dark-500 bg-white'
              }`}
            >
              <p className="text-[13px] font-medium text-light-80 leading-tight mb-2">{slot.title}</p>
              {file ? <Check size={26} className="text-success-600 mb-2" />
                    : <FileText size={26} className="text-light-50 mb-2" />}
              <button
                type="button"
                onClick={() => refs[slot.key].current?.click()}
                className="text-[12px] font-medium text-brand-primary flex items-center gap-1 min-h-[32px]"
              >
                <UploadCloud size={14} /> {file ? 'Schimbă' : 'Încarcă'}
              </button>
              {file && <span className="text-[10px] text-light-60 truncate w-full mt-0.5">{file.name}</span>}
              <input
                ref={refs[slot.key]}
                type="file"
                accept={ACCEPTED_ANY}
                className="hidden"
                onChange={e => { void state.pick(slot.key, e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-light-60 mt-2.5 mb-5">
        Formate acceptate: PNG, JPG, PDF. Dimensiune max: 10MB / fișier.
      </p>
      <fieldset className="mb-2">
        <legend className="text-sm font-medium text-light-80 mb-2">Cartea ta de identitate are cip (e electronică)?</legend>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: false, label: 'Nu' }, { value: true, label: 'Da' }].map(option => (
            <label
              key={option.label}
              className={`flex items-center justify-center rounded-xl py-3 text-base font-medium cursor-pointer transition ${
                state.electronic === option.value ? 'bg-brand-primary text-white' : 'bg-white ring-1 ring-dark-500 text-light-80'
              }`}
            >
              <input
                type="radio"
                name="carte-electronica"
                checked={state.electronic === option.value}
                onChange={() => state.chooseElectronic(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        {state.electronic && (
          <p className="text-[12px] text-light-60 mt-2">
            Dacă ai certificatul de atestare a domiciliului, încarcă-l. Poți continua și fără el.
          </p>
        )}
      </fieldset>
    </>
  );
}

function ProofSlot({ state }: { state: IdScanState }) {
  const input = useRef<HTMLInputElement>(null);
  const file = state.files.proof;
  return (
    <div className="mt-3 rounded-xl ring-1 ring-dark-500 bg-white p-4">
      <p className="text-sm font-semibold text-light-90">
        Certificat de atestare a domiciliului <span className="font-normal text-light-50">(opțional)</span>
      </p>
      <p className="text-[13px] text-light-60 mt-1">
        Buletinul tău nu are adresa tipărită pe el. Dacă ai certificatul, încarcă-l. Dacă nu, poți continua și fără.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold"
        >
          <UploadCloud size={16} /> {file ? 'Schimbă' : 'Încarcă sau fotografiază'}
        </button>
        {file && (
          <span className="flex items-center gap-1 text-[12px] text-success-600 min-w-0">
            <Check size={14} className="shrink-0" /> <span className="truncate">{file.name}</span>
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_ANY}
        className="hidden"
        onChange={e => { void state.pick('proof', e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}

export function IdScanStep({ state }: { state: IdScanState }) {
  const { scan, files, reading, manual, message } = state;
  const fullName = [scan?.lastName, scan?.firstName].filter(Boolean).join(' ');

  return (
    <>
      <p className="text-sm font-semibold text-light-90 mb-2.5">Buletinul (față și verso)</p>

      {manual ? (
        <>
          {message && (
            <p className="text-[13px] text-warning-600 bg-warning-500/10 rounded-xl px-4 py-3 mb-3">{message}</p>
          )}
          <ManualSlots state={state} />
        </>
      ) : (
        <>
          <div className="rounded-xl ring-1 ring-dark-500 bg-white p-4">
            <p className="text-[13px] font-medium text-light-80 mb-3">
              {files.front ? 'Fața buletinului' : 'Începe cu fața buletinului'}
            </p>
            {!files.front ? (
              <CaptureActions slot="front" state={state} label="Scanează buletinul" onFile={f => { void state.pick('front', f); }} />
            ) : (
              <SidePreview file={files.front} onRedo={() => state.redo('front')} />
            )}

            {reading && (
              <p className="mt-3 flex items-center gap-2 text-[13px] text-light-70" aria-live="polite">
                <Loader2 size={16} className="animate-spin" /> Citim buletinul…
              </p>
            )}

            {scan?.readable && !reading && (
              <div className="mt-3 rounded-lg bg-success-500/8 ring-1 ring-success-500/30 px-3.5 py-3" aria-live="polite">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success-600">
                  <Check size={15} /> Am citit buletinul
                </p>
                {fullName && <p className="text-[15px] font-semibold text-light-100 mt-1.5">{fullName}</p>}
                {scan.cnpMasked && <p className="text-[13px] text-light-70 mt-0.5">CNP {scan.cnpMasked}</p>}
                {scan.expiryDate && <p className="text-[13px] text-light-70">Valabil până la {scan.expiryDate}</p>}
              </div>
            )}

            {scan?.expired && !reading && (
              <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-warning-600 bg-warning-500/10 rounded-lg px-3 py-2">
                <TriangleAlert size={15} className="shrink-0 mt-0.5" />
                Actul a expirat. Poți continua, dar brokerul îți va cere un act valabil.
              </p>
            )}

            {scan?.readable && !reading && scan.problems.filter(p => p !== 'Actul a expirat.').map(p => (
              <p key={p} className="mt-2 text-[12.5px] text-light-70">{p}</p>
            ))}

            {message && !reading && (
              <p className="mt-3 text-[13px] text-error-600" role="alert">{message}</p>
            )}
          </div>

          {(files.back || (scan?.readable && scan.needsBack)) && (
            <div className="mt-3 rounded-xl ring-1 ring-dark-500 bg-white p-4">
              <p className="text-[13px] font-medium text-light-80 mb-3">
                {files.back ? 'Versoul buletinului' : 'Acum întoarce buletinul și scanează verso'}
              </p>
              {!files.back ? (
                <CaptureActions slot="back" state={state} label="Scanează verso" onFile={f => { void state.pick('back', f); }} />
              ) : (
                <SidePreview file={files.back} onRedo={() => state.redo('back')} disabled={reading} />
              )}
            </div>
          )}

          {files.back && message && !reading && !scan?.tipAct && (
            <p className="mt-2 text-[12.5px] text-light-60">Refă poza cu versoul ca să putem continua.</p>
          )}

          {state.needsProof && !reading && <ProofSlot state={state} />}
        </>
      )}

      {state.cameraSlot && (
        <DocumentScanner
          instruction={state.cameraSlot === 'front' ? 'Așază fața buletinului în cadru' : 'Întoarce buletinul și așază versoul în cadru'}
          onCapture={blob => { void state.capture(blob); }}
          onClose={state.closeCamera}
          onUnavailable={state.cameraUnavailable}
        />
      )}
    </>
  );
}
