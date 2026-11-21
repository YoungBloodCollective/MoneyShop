import { useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarClock, CalendarX2, CreditCard, Gavel, Mail, MapPin, MessageCircle, Phone, X } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import type { BrokerAdminItem } from '@/services/api/brokersApi';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';
import { useDialogBehavior } from '../useDialogBehavior';
import { AppointmentFormModal } from './AppointmentFormModal';
import {
  CALL_OUTCOMES, CANCELLED_STATUS, STATUS_PILL, awaitingConfirmation, fromLocalInputs, statusLabel, timeRange,
  toLocalInputs, whatsAppNumber, type Appointment, type CallOutcomeKey,
} from './appointmentModel';

const errorMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data;
  if (typeof data === 'string' && data) return data;
  if (typeof data?.message === 'string') return data.message;
  return fallback;
};

/**
 * Everything about one call in a side panel: who, when, call / WhatsApp, the one-tap result of
 * the call (which sets the status and, for "call back", the new time), dated notes, move, cancel.
 * Opened from today's agenda and from the calendar.
 */
export function AppointmentDrawer({
  appointment, brokers = [], chooseBroker = false, onClose, onChanged,
}: {
  appointment: Appointment;
  brokers?: BrokerAdminItem[];
  chooseBroker?: boolean;
  onClose: () => void;
  onChanged: (a: Appointment) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(appointment);
  const [moving, setMoving] = useState(false);
  useDialogBehavior(!moving, panelRef, onClose);

  const [pending, setPending] = useState<CallOutcomeKey | null>(null);
  const [followUp, setFollowUp] = useState(() => toLocalInputs(null));
  const [outcomeNote, setOutcomeNote] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = (a: Appointment) => {
    setCurrent(a);
    onChanged(a);
  };

  const run = async (action: () => Promise<Appointment>, success: string, fallback: string) => {
    setBusy(true);
    try {
      apply(await action());
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveOutcome = async (key: CallOutcomeKey, withTime: boolean) => {
    const followUpAt = withTime ? fromLocalInputs(followUp.date, followUp.time) : null;
    if (withTime && !followUpAt) { toast.error('Alege data și ora la care revii.'); return; }
    const ok = await run(
      () => apiClient.post(`/appointments/${current.id}/outcome`, { outcome: key, note: outcomeNote || undefined, followUpAt: followUpAt ?? undefined }).then(r => r.data as Appointment),
      'Rezultat salvat',
      'Nu am putut salva rezultatul.',
    );
    if (ok) { setPending(null); setOutcomeNote(''); }
  };

  const pick = (key: CallOutcomeKey) => {
    const outcome = CALL_OUTCOMES.find(o => o.key === key)!;
    // "Revin" always asks for a time; "Nu a răspuns" offers one; the rest save at once.
    if (outcome.needsTime || key === 'no_answer') { setPending(key); return; }
    void saveOutcome(key, false);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const ok = await run(
      () => apiClient.post(`/appointments/${current.id}/notes`, { text: note.trim() }).then(r => r.data as Appointment),
      'Notiță adăugată',
      'Nu am putut salva notița.',
    );
    if (ok) setNote('');
  };

  const cancel = () => {
    if (!window.confirm('Anulezi programarea? Dispare din calendar și din Outlook.')) return;
    void run(
      () => apiClient.patch(`/appointments/${current.id}/status`, { status: CANCELLED_STATUS }).then(r => r.data as Appointment),
      'Programare anulată',
      'Nu am putut anula programarea.',
    );
  };

  const wa = whatsAppNumber(current.telefon);
  const cancelled = current.status === CANCELLED_STATUS;
  const notes = (current.notes ?? '').split('\n').map(n => n.trim()).filter(Boolean);
  const pendingOutcome = pending ? CALL_OUTCOMES.find(o => o.key === pending)! : null;
  const chip = `rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${FOCUS_RING}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-drawer-title"
          tabIndex={-1}
          className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
            <div className="min-w-0">
              <h2 id="appointment-drawer-title" className="truncate text-base font-semibold text-slate-900">{current.nume} {current.prenume}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_PILL[current.status] ?? 'bg-slate-100 text-slate-600'}`}>{statusLabel(current.status)}</span>
                {current.scheduledAt
                  ? <span className="font-medium text-brand-primary">{new Date(current.scheduledAt).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}, {timeRange(current)}</span>
                  : <span>fără oră</span>}
                {awaitingConfirmation(current) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">neconfirmat de client</span>}
              </div>
            </div>
            <button onClick={onClose} className={`rounded-lg p-1 text-slate-400 hover:text-slate-700 ${FOCUS_RING}`} aria-label="Închide"><X className="h-5 w-5" /></button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${current.telefon}`} className={`flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 ${FOCUS_RING}`}>
                <Phone className="h-4 w-4" /> Sună
              </a>
              {wa ? (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 ${FOCUS_RING}`}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              ) : <span />}
            </div>

            <dl className="grid grid-cols-1 gap-1.5 text-sm text-slate-600">
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /><dd>{current.telefon}</dd></div>
              {current.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /><dd className="truncate">{current.email}</dd></div>}
              {current.tipCredit && <div className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-slate-400" /><dd>{current.tipCredit}{current.salariuNet > 0 ? ` · ${current.salariuNet.toLocaleString('ro-RO')} RON net` : ''}</dd></div>}
              {current.judet && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /><dd>{current.judet}</dd></div>}
              {current.intarzieriBirou && current.intarzieriBirou !== 'NU' && (
                <div className="flex items-center gap-2 text-orange-700"><AlertTriangle className="h-3.5 w-3.5" /><dd>Birou de Credit: {current.intarzieriBirou.replace(/^Da-/, '').toLowerCase()} întârziere</dd></div>
              )}
              {current.popriRecuperare && current.popriRecuperare !== 'NU' && (
                <div className="flex items-center gap-2 text-rose-700"><Gavel className="h-3.5 w-3.5" /><dd>Popriri / recuperare: {current.popriRecuperare}</dd></div>
              )}
            </dl>

            {!cancelled && (
              <section aria-labelledby="outcome-title">
                <h3 id="outcome-title" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Rezultat apel</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map(o => (
                    <button
                      key={o.key}
                      type="button"
                      disabled={busy}
                      onClick={() => pick(o.key)}
                      aria-pressed={pending === o.key}
                      className={`${chip} ${pending === o.key ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {pendingOutcome && (
                  <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-medium text-slate-700">
                      {pendingOutcome.needsTime ? 'Când revii?' : 'Încerci din nou la o anumită oră? (opțional)'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" aria-label="Data" value={followUp.date} onChange={e => setFollowUp(f => ({ ...f, date: e.target.value }))} className={`rounded-xl border border-slate-200 px-3 py-2 text-sm ${FIELD_FOCUS}`} />
                      <input type="time" aria-label="Ora" step={900} value={followUp.time} onChange={e => setFollowUp(f => ({ ...f, time: e.target.value }))} className={`rounded-xl border border-slate-200 px-3 py-2 text-sm ${FIELD_FOCUS}`} />
                    </div>
                    <input
                      value={outcomeNote}
                      onChange={e => setOutcomeNote(e.target.value)}
                      placeholder="Notiță scurtă (opțional)"
                      aria-label="Notiță la rezultat"
                      maxLength={500}
                      className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm ${FIELD_FOCUS}`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => saveOutcome(pendingOutcome.key, true)} className={`${chip} border-brand-primary bg-brand-primary text-white hover:opacity-90`}>
                        {pendingOutcome.needsTime ? 'Salvează și mută apelul' : 'Salvează cu ora nouă'}
                      </button>
                      {!pendingOutcome.needsTime && (
                        <button type="button" disabled={busy} onClick={() => saveOutcome(pendingOutcome.key, false)} className={`${chip} border-slate-200 text-slate-700 hover:bg-slate-50`}>
                          Salvează fără oră
                        </button>
                      )}
                      <button type="button" onClick={() => setPending(null)} className={`${chip} border-transparent text-slate-500 hover:text-slate-800`}>Renunță</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            <section aria-labelledby="notes-title">
              <h3 id="notes-title" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Notițe</h3>
              <div className="flex gap-2">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Ce ați discutat, ce urmează…"
                  aria-label="Notiță nouă"
                  className={`min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm ${FIELD_FOCUS}`}
                />
                <button type="button" onClick={addNote} disabled={busy || !note.trim()} className={`self-end rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 ${FOCUS_RING}`}>
                  Adaugă
                </button>
              </div>
              {notes.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {notes.map((n, i) => (
                    <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{n}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Nicio notiță încă.</p>
              )}
            </section>

            {!cancelled && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setMoving(true)} className={`${chip} flex items-center gap-1.5 border-brand-primary/20 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10`}>
                  <CalendarClock className="h-3.5 w-3.5" /> {current.scheduledAt ? 'Mută' : 'Programează'}
                </button>
                <button type="button" onClick={cancel} disabled={busy} className={`${chip} flex items-center gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50`}>
                  <CalendarX2 className="h-3.5 w-3.5" /> Anulează
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {moving && (
        <AppointmentFormModal
          appointment={current}
          brokers={brokers}
          chooseBroker={chooseBroker}
          onClose={() => setMoving(false)}
          onSaved={a => { apply(a); setMoving(false); }}
        />
      )}
    </>
  );
}
