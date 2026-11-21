import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { acordApi, type AcordDetails } from '@/services/api/acordApi';
import { AssignBrokerControl } from '@/components/crm/AssignBrokerControl';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';

/**
 * The parts of the agreement that used to live only on the separate Acorduri page: the client's
 * answers, the signed text, the internal note and the review actions. Shown inside the client page.
 */
export function AcordReviewPanel({ acordId, onStatusChange }: { acordId: string; onStatusChange?: (status: string) => void }) {
  const [details, setDetails] = useState<AcordDetails | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    let active = true;
    acordApi.adminDetails(acordId)
      .then(d => {
        if (!active) return;
        setDetails(d);
        setNote(d.reviewNote ?? '');
        setSavedNote(d.reviewNote ?? '');
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [acordId]);

  if (failed) return <p className="mt-4 text-sm text-slate-400">Nu am putut încărca răspunsurile și acțiunile acordului.</p>;
  if (!details) return <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-50" />;

  const update = async (status: 'completed' | 'rejected' | null) => {
    if (status && !window.confirm(status === 'completed' ? 'Marchezi acordul ca finalizat?' : 'Respingi acordul?')) return;
    const target = status ?? details.status;
    setBusy(true);
    try {
      await acordApi.adminUpdateStatus(details.acordId, target, note || undefined);
      setDetails(prev => (prev ? { ...prev, status: target, reviewNote: note } : prev));
      setSavedNote(note);
      if (status) onStatusChange?.(status);
      toast.success(status ? 'Status actualizat' : 'Notiță salvată');
    } catch {
      toast.error(status ? 'Nu s-a putut actualiza statusul' : 'Nu s-a putut salva notița');
    } finally {
      setBusy(false);
    }
  };

  const faceFailed = details.livenessPassed === false || details.faceMatchPassed === false;

  return (
    <div className="mt-4 space-y-4">
      <AssignBrokerControl
        entityType="acord"
        id={details.acordId}
        currentBrokerId={details.brokerProfileId}
        onAssigned={brokerId => setDetails(prev => (prev ? { ...prev, brokerProfileId: brokerId } : prev))}
      />

      {faceFailed && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          Verificarea facială nu a trecut. Verifică manual identitatea înainte de a folosi dosarul.
        </div>
      )}
      {!details.automaticChecksRan && (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          Verificarea automată nu a rulat: actul nu a fost citit și nu s-a făcut verificarea facială. Documentele sunt complete și se pot verifica manual.
        </div>
      )}

      {details.declaredData?.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Răspunsurile clientului</h3>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {details.declaredData.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-50 py-2 text-sm">
                <span className="shrink-0 text-slate-500">{label}</span>
                <span className="break-words text-right font-medium text-slate-800">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.consentTextSnapshot && (
        <div>
          <button
            type="button"
            onClick={() => setShowText(v => !v)}
            aria-expanded={showText}
            className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-brand-primary hover:underline ${FOCUS_RING}`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showText ? 'rotate-180' : ''}`} />
            {showText ? 'Ascunde textul semnat' : `Vezi textul semnat${details.consentVersion ? ` (versiunea ${details.consentVersion})` : ''}`}
          </button>
          {showText && (
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{details.consentTextSnapshot}</p>
              {details.consentIp && <p className="mt-2 text-xs text-slate-400">Semnat de la IP {details.consentIp}</p>}
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor={`acord-note-${details.acordId}`} className="mb-1 block text-xs text-slate-500">Notiță internă</label>
        <textarea
          id={`acord-note-${details.acordId}`}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Notiță internă..."
          rows={2}
          className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {note !== savedNote && (
            <button type="button" onClick={() => update(null)} disabled={busy} className={`rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${FOCUS_RING}`}>
              Salvează notița
            </button>
          )}
          {details.status !== 'completed' && (
            <button type="button" onClick={() => update('completed')} disabled={busy} className={`rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 ${FOCUS_RING}`}>
              Marchează finalizat
            </button>
          )}
          {details.status !== 'rejected' && (
            <button type="button" onClick={() => update('rejected')} disabled={busy} className={`rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 ${FOCUS_RING}`}>
              Respinge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
