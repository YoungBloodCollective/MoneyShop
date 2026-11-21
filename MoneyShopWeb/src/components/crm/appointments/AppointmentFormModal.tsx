import { useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import type { BrokerAdminItem } from '@/services/api/brokersApi';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';
import { useDialogBehavior } from '../useDialogBehavior';
import {
  DURATION_OPTIONS, fromLocalInputs, timeRange, toLocalInputs, type Appointment,
} from './appointmentModel';

interface SlotConflict { appointmentId: number; clientName: string; startUtc: string; durationMinutes: number }

/**
 * New appointment (manual booking) or a new time for an existing one. The server refuses times
 * that overlap another appointment of the same broker and says which one is in the way.
 */
/** Client details to start a new booking with (from a lead or a client file), so nothing is retyped. */
export interface AppointmentPrefill {
  nume?: string;
  prenume?: string;
  telefon?: string;
  email?: string;
  tipCredit?: string;
  notes?: string;
}

export function AppointmentFormModal({
  appointment, prefill, brokers, chooseBroker, onClose, onSaved,
}: {
  /** Set = change the time of this appointment; unset = book a new one. */
  appointment?: Appointment | null;
  prefill?: AppointmentPrefill;
  brokers: BrokerAdminItem[];
  /** Super Admin in /admin picks the broker; brokers always book on their own calendar. */
  chooseBroker: boolean;
  onClose: () => void;
  onSaved: (a: Appointment) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(true, panelRef, onClose);
  const editing = !!appointment;
  const initial = toLocalInputs(appointment?.scheduledAt);

  const [nume, setNume] = useState(prefill?.nume ?? '');
  const [prenume, setPrenume] = useState(prefill?.prenume ?? '');
  const [telefon, setTelefon] = useState(prefill?.telefon ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [tipCredit, setTipCredit] = useState(prefill?.tipCredit ?? '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [duration, setDuration] = useState(appointment?.durationMinutes ?? 15);
  const [brokerId, setBrokerId] = useState(appointment?.brokerProfileId != null ? String(appointment.brokerProfileId) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const scheduledAt = fromLocalInputs(date, time);
    if (!scheduledAt) { setError('Alege data și ora.'); return; }
    if (!editing && (nume.trim().length < 2 || telefon.trim().length < 6)) {
      setError('Completează numele și telefonul clientului.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = editing
        ? await apiClient.patch(`/appointments/${appointment!.id}/schedule`, { scheduledAt, durationMinutes: duration })
        : await apiClient.post('/appointments/manual', {
            nume: nume.trim(), prenume: prenume.trim(), telefon: telefon.trim(),
            email: email.trim() || undefined, tipCredit: tipCredit || undefined, notes: notes.trim() || undefined,
            scheduledAt, durationMinutes: duration,
            brokerProfileId: chooseBroker && brokerId ? Number(brokerId) : undefined,
          });
      toast.success(editing ? 'Programare mutată' : 'Programare creată');
      onSaved(res.data as Appointment);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const conflict = (err.response.data?.conflict ?? err.response.data?.data?.conflict) as SlotConflict | undefined;
        setError(conflict
          ? `Intervalul se suprapune cu programarea lui ${conflict.clientName} (${timeRange({ scheduledAt: conflict.startUtc, durationMinutes: conflict.durationMinutes })}). Alege altă oră.`
          : 'Intervalul se suprapune cu altă programare. Alege altă oră.');
      } else if (axios.isAxiosError(err) && typeof err.response?.data?.message === 'string') {
        setError(err.response.data.message);
      } else {
        setError('Nu s-a putut salva programarea.');
      }
    } finally {
      setSaving(false);
    }
  };

  const input = `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 ${FIELD_FOCUS}`;
  const label = 'mb-1 block text-xs font-medium text-slate-600';
  const activeBrokers = brokers.filter(b => b.status === 'Active');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-form-title"
        tabIndex={-1}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="appointment-form-title" className="text-base font-semibold text-slate-900">
            {editing ? `Mută programarea – ${appointment!.nume} ${appointment!.prenume}` : 'Programare nouă'}
          </h2>
          <button onClick={onClose} className={`rounded-lg p-1 text-slate-400 hover:text-slate-700 ${FOCUS_RING}`} aria-label="Închide"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          {!editing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="ap-nume">Nume *</label><input id="ap-nume" className={input} value={nume} onChange={e => setNume(e.target.value)} autoComplete="off" /></div>
                <div><label className={label} htmlFor="ap-prenume">Prenume</label><input id="ap-prenume" className={input} value={prenume} onChange={e => setPrenume(e.target.value)} autoComplete="off" /></div>
                <div><label className={label} htmlFor="ap-tel">Telefon *</label><input id="ap-tel" className={input} value={telefon} onChange={e => setTelefon(e.target.value)} inputMode="tel" autoComplete="off" /></div>
                <div><label className={label} htmlFor="ap-email">Email</label><input id="ap-email" className={input} value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="off" /></div>
              </div>
              <div>
                <label className={label} htmlFor="ap-tip">Tip credit</label>
                <select id="ap-tip" className={input} value={tipCredit} onChange={e => setTipCredit(e.target.value)}>
                  <option value="">—</option>
                  <option value="Nevoi personale">Nevoi personale</option>
                  <option value="Ipotecar">Ipotecar</option>
                  <option value="Refinantare">Refinanțare</option>
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1"><label className={label} htmlFor="ap-date">Data *</label><input id="ap-date" type="date" className={input} value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div><label className={label} htmlFor="ap-time">Ora *</label><input id="ap-time" type="time" step={300} className={input} value={time} onChange={e => setTime(e.target.value)} required /></div>
            <div>
              <label className={label} htmlFor="ap-dur">Durată</label>
              <select id="ap-dur" className={input} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>

          {!editing && chooseBroker && (
            <div>
              <label className={label} htmlFor="ap-broker">Broker</label>
              <select id="ap-broker" className={input} value={brokerId} onChange={e => setBrokerId(e.target.value)}>
                <option value="">Neatribuit (inbox Super Admin)</option>
                {activeBrokers.map(b => <option key={b.id} value={b.id}>{b.displayName}</option>)}
              </select>
            </div>
          )}

          {!editing && (
            <div><label className={label} htmlFor="ap-notes">Note</label><textarea id="ap-notes" className={`${input} min-h-[4rem]`} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} /></div>
          )}

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={`rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}>Renunță</button>
            <button type="submit" disabled={saving} className={`rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}>
              {saving ? 'Se salvează…' : editing ? 'Mută programarea' : 'Programează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
