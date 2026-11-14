import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, Calendar, ShieldCheck, ShieldAlert, PenLine, AlertTriangle, Check, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { acordApi, type AcordDetails } from '@/services/api/acordApi';
import { BankConsentsSection } from '@/components/crm/acord/BankConsentsSection';
import { AcordFilePreview } from '@/components/crm/acord/AcordFilePreview';
import { CnpField } from '@/components/crm/acord/CnpField';
import {
  ACORD_STATUS_LABELS, ACORD_STATUS_STYLES, TIP_ACT_LABELS, formatDateTime,
} from '@/components/crm/acord/acordLabels';
import { Spinner } from './crmShared';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const H2 = 'mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500';
const ROW = 'flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm';

function AcordStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${ACORD_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {ACORD_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function CrmAcordDetailPage() {
  const { acordId } = useParams<{ acordId: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AcordDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async (initial: boolean) => {
    if (!acordId) return;
    if (initial) { setLoading(true); setError(false); }
    try {
      const details = await acordApi.adminDetails(acordId);
      setSelected(details);
      if (initial) setReviewNote(details.reviewNote ?? '');
    } catch {
      if (initial) setError(true);
      else toast.error('Nu s-au putut încărca detaliile');
    } finally {
      if (initial) setLoading(false);
    }
  }, [acordId]);

  useEffect(() => { queueMicrotask(() => { void load(true); }); }, [load]);

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/crm/acorduri');
  };

  const updateStatus = async (status: 'completed' | 'rejected') => {
    if (!selected) return;
    const question = status === 'completed'
      ? 'Marchezi acordul ca finalizat?'
      : 'Respingi acordul?';
    if (!window.confirm(question)) return;
    try {
      await acordApi.adminUpdateStatus(selected.acordId, status, reviewNote || undefined);
      toast.success('Status actualizat');
      setSelected({ ...selected, status, reviewNote });
    } catch {
      toast.error('Nu s-a putut actualiza statusul');
    }
  };

  const back = (
    <button onClick={goBack} className="mb-5 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
      <ArrowLeft size={18} /> Înapoi
    </button>
  );

  if (loading) return <Spinner />;

  if (error || !selected) {
    return (
      <div>
        {back}
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Nu s-au putut încărca detaliile acordului.
          <button onClick={() => { void load(true); }} className="ml-3 font-medium underline underline-offset-2">Reîncearcă</button>
        </div>
      </div>
    );
  }

  const ocr = selected.ocr;

  return (
    <div className="max-w-4xl">
      {back}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{selected.nume} {selected.prenume}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <a href={`tel:${selected.telefon}`} className="flex items-center gap-1.5 hover:text-slate-800"><Phone size={14} /> {selected.telefon}</a>
            {selected.email && <span className="flex items-center gap-1.5"><Mail size={14} /> {selected.email}</span>}
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatDateTime(selected.createdAt)}</span>
          </div>
        </div>
        <AcordStatusBadge status={selected.status} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className={`${CARD} p-4`}>
          <p className="mb-1 text-xs text-slate-500">Tip act declarat</p>
          <p className="text-sm font-medium text-slate-800">
            {selected.tipAct ? (TIP_ACT_LABELS[selected.tipAct] ?? selected.tipAct) : '—'}
          </p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="mb-1 text-xs text-slate-500">Semnătură</p>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
            {selected.signedAt
              ? <><PenLine size={14} className="text-emerald-600" /> {formatDateTime(selected.signedAt)}</>
              : <span className="text-slate-500">Nesemnat</span>}
          </p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="mb-1 text-xs text-slate-500">Verificare facială</p>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {selected.livenessPassed === true && <><ShieldCheck size={14} className="text-emerald-600" /> <span className="text-emerald-700">Trecută</span></>}
            {selected.livenessPassed === false && <><ShieldAlert size={14} className="text-amber-600" /> <span className="text-amber-700">Nereușită</span></>}
            {selected.livenessPassed == null && (
              <span className="text-slate-500">{selected.automaticChecksRan ? 'Neefectuată' : 'Indisponibilă'}</span>
            )}
          </p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="mb-1 text-xs text-slate-500">Potrivire cu actul</p>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {selected.faceMatchPassed === true && <span className="text-emerald-700">Da</span>}
            {selected.faceMatchPassed === false && <span className="text-amber-700">Nu</span>}
            {selected.faceMatchPassed == null && <span className="text-slate-500">-</span>}
          </p>
        </div>
      </div>

      {(selected.livenessPassed === false || selected.faceMatchPassed === false) && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Verificarea facială nu a trecut. Documentele au fost păstrate, dar identitatea
            nu a putut fi confirmată automat - verifică manual înainte de a folosi dosarul.
          </p>
        </div>
      )}

      <h2 className={H2}>Documente</h2>
      {selected.files.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500">Niciun document încărcat.</p>
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {selected.files.map(f => <AcordFilePreview key={f.fileId} file={f} />)}
        </div>
      )}

      <BankConsentsSection acord={selected} onSigned={() => { void load(false); }} />

      {!selected.automaticChecksRan && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-sky-600" />
          <div>
            <p className="mb-1 text-sm font-medium text-slate-800">
              Verificarea automată nu a rulat pentru acest dosar
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Serviciul de citire a actului nu a fost disponibil, așa că nu s-au extras
              date și nu s-a făcut verificarea facială. Documentele încărcate de client
              sunt complete și pot fi verificate manual mai sus.
            </p>
          </div>
        </div>
      )}

      {selected.declaredData?.length > 0 && (
        <>
          <h2 className={H2}>Date declarate de client</h2>
          <div className={`${CARD} mb-6 p-5`}>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {selected.declaredData.map(({ label, value }) => (
                <div key={label} className={ROW}>
                  <span className="shrink-0 text-slate-500">{label}</span>
                  <span className="break-words text-right text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <h2 className={H2}>Date extrase din act</h2>
      {ocr ? (
        <div className={`${CARD} mb-6 p-5`}>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {([
              ['Nume', ocr.lastName],
              ['Prenume', ocr.firstName],
              ['CNP', <CnpField key="cnp" acordId={selected.acordId} masked={ocr.cnpMasked} available={selected.cnpAvailable} />],
              ['Serie act', ocr.idSeries],
              ['Număr act', ocr.idNumber],
              ['Data nașterii', ocr.birthDate],
              ['Sex', ocr.sex],
              ['Loc naștere', ocr.placeOfBirth],
              ['Cetățenie', ocr.nationality],
              ['Emis de', ocr.issuedBy],
              ['Data emiterii', ocr.issueDate],
              ['Valabil până la', ocr.expiryDate],
            ] as const).map(([label, value]) => (
              <div key={label} className={ROW}>
                <span className="shrink-0 text-slate-500">{label}</span>
                <span className="break-words text-right text-slate-800">{value || '—'}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between gap-4 text-sm">
            <span className="shrink-0 text-slate-500">Adresă</span>
            <span className="break-words text-right text-slate-800">{ocr.address || '—'}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-500">
              Tip act:{' '}
              <span className="text-slate-800">{ocr.isNewFormat ? 'Carte de identitate electronică' : 'Buletin clasic'}</span>
            </span>
            {ocr.confidenceScore != null && (
              <span className="text-sm text-slate-500">
                Încredere citire: <span className="text-slate-800">{Math.round(ocr.confidenceScore * 100)}%</span>
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              ['CNP valid', ocr.cnpChecksumValid],
              ['CNP ↔ data nașterii', ocr.cnpBirthDateMatch],
              ['CNP ↔ sex', ocr.cnpSexMatch],
              ['Act neexpirat', ocr.documentNotExpired],
            ] as const).map(([label, ok]) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  ok === true ? 'bg-emerald-50 text-emerald-700'
                    : ok === false ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {ok === true ? <Check size={13} /> : ok === false ? <XCircle size={13} /> : null}
                {label}
              </span>
            ))}
          </div>
          {ocr.validationErrors.length > 0 && (
            <ul className="mt-4 space-y-1">
              {ocr.validationErrors.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-rose-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className={`${CARD} mb-6 space-y-2 p-5 text-sm`}>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">CNP</span>
            <span className="text-slate-800">
              {selected.cnpMasked || selected.cnpAvailable ? (
                <CnpField acordId={selected.acordId} masked={selected.cnpMasked} available={selected.cnpAvailable} />
              ) : (selected.automaticChecksRan ? 'necitit' : 'neverificat')}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Adresă</span>
            <span className="text-right text-slate-800">
              {selected.address ?? (selected.automaticChecksRan ? 'necitit' : 'neverificat')}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Tip act</span>
            <span className="text-slate-800">
              {selected.idIsNewFormat == null
                ? (selected.automaticChecksRan ? 'necitit' : 'neverificat')
                : selected.idIsNewFormat ? 'Carte de identitate electronică' : 'Buletin clasic'}
            </span>
          </div>
        </div>
      )}

      {selected.consentTextSnapshot && (
        <>
          <h2 className={H2}>Acord semnat {selected.consentVersion && `(versiunea ${selected.consentVersion})`}</h2>
          <div className={`${CARD} mb-3 space-y-2 p-4 text-sm`}>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Prelucrare date (intermediere)</span>
              <span className="font-medium text-emerald-700">Acceptat</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Comunicări comerciale</span>
              <span className={selected.marketingAccepted ? 'font-medium text-emerald-700' : 'text-slate-600'}>
                {selected.marketingAccepted ? 'Acceptat' : 'Refuzat'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Renunțare perioadă OUG 52/2016</span>
              <span className={selected.oug52Waived ? 'font-medium text-emerald-700' : 'text-slate-600'}>
                {selected.oug52Waived ? 'Da' : 'Nu'}
              </span>
            </div>
          </div>
          <div className={`${CARD} mb-6 p-4`}>
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
              {selected.consentTextSnapshot}
            </p>
            {selected.consentIp && <p className="mt-3 text-xs text-slate-400">Semnat de la IP {selected.consentIp}</p>}
          </div>
        </>
      )}

      <h2 className={H2}>Acțiuni</h2>
      <textarea
        value={reviewNote}
        onChange={e => setReviewNote(e.target.value)}
        placeholder="Notiță internă..."
        rows={3}
        className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
      />
      <div className="flex flex-wrap gap-3 pb-6">
        <button onClick={() => updateStatus('completed')} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
          Marchează finalizat
        </button>
        <button onClick={() => updateStatus('rejected')} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700">
          Respinge
        </button>
      </div>
    </div>
  );
}
