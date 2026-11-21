import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAdminWorkspace, useCrmPath } from '@/lib/crmPath';
import { Phone, Mail, MapPin, CreditCard, UserPlus, AlertTriangle, Gavel, CalendarPlus, CalendarClock, List, CalendarDays, CalendarSync } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { brokersApi, type BrokerAdminItem } from '@/services/api/brokersApi';
import { AssignBrokerControl } from '@/components/crm/AssignBrokerControl';
import { apiClient } from '@/services/api/apiClient';
import { adminApi } from '@/services/api/adminApi';
import { useAuth } from '@/hooks/useAuth';
import { WeekCalendar } from '@/components/crm/appointments/WeekCalendar';
import { AppointmentFormModal } from '@/components/crm/appointments/AppointmentFormModal';
import { CalendarSubscribeModal } from '@/components/crm/appointments/CalendarSubscribeModal';
import { startOfWeek, addDays, timeRange, type Appointment } from '@/components/crm/appointments/appointmentModel';
import { PageHeader, SkeletonCards, EmptyState, SegmentChips, Pagination } from './crmShared';
import { usePaged, FIELD_FOCUS, FOCUS_RING } from './crmHelpers';

const STATUS_OPTIONS = ['Nou', 'Contactat', 'In lucru', 'Trimis Lead', 'BC Probleme', 'DTI', 'Nu se incadreaza', 'Finalizat', 'Anulat'];

const STATUS_LABEL: Record<string, string> = {
  'In lucru': 'În lucru',
  'Nu se incadreaza': 'Nu se încadrează',
};

const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

const STATUS_PILL: Record<string, string> = {
  Nou: 'bg-sky-50 text-sky-700',
  Contactat: 'bg-amber-50 text-amber-700',
  'In lucru': 'bg-violet-50 text-violet-700',
  'Trimis Lead': 'bg-indigo-50 text-indigo-700',
  'BC Probleme': 'bg-orange-50 text-orange-700',
  DTI: 'bg-yellow-50 text-yellow-700',
  'Nu se incadreaza': 'bg-rose-50 text-rose-700',
  Finalizat: 'bg-emerald-50 text-emerald-700',
  Anulat: 'bg-slate-100 text-slate-600',
};

const SEGMENTS = [{ key: 'toate', label: 'Toate' }, ...STATUS_OPTIONS.map(s => ({ key: s, label: statusLabel(s) }))];

export default function CrmProgramariPage() {
  const crm = useCrmPath();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [segment, setSegment] = useState('toate');
  const [converting, setConverting] = useState<number | null>(null);
  const [brokerNames, setBrokerNames] = useState<Record<number, string>>({});
  const [brokers, setBrokers] = useState<BrokerAdminItem[]>([]);
  const { pathname } = useLocation();
  const inAdmin = isAdminWorkspace(pathname);
  const [view, setView] = useState<'calendar' | 'lista'>('calendar');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [form, setForm] = useState<{ appointment: Appointment | null } | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    let active = true;
    const load = (initial: boolean) => {
      if (initial) { setLoading(true); setError(false); }
      apiClient.get('/appointments')
        .then(r => { if (active) setAppointments(r.data); })
        .catch(() => { if (active && initial) setError(true); })
        .finally(() => { if (active && initial) setLoading(false); });
    };
    queueMicrotask(() => { if (active) load(true); });
    // New bookings (site, colleagues, Super Admin) show up without reloading the page.
    const timer = window.setInterval(() => load(false), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [reloadKey]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    brokersApi.list()
      .then(list => { setBrokers(list); setBrokerNames(Object.fromEntries(list.map(b => [b.id, b.displayName]))); })
      .catch(() => undefined);
  }, [isSuperAdmin]);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await apiClient.patch(`/appointments/${id}/status`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? res.data : a));
      toast.success(`Status actualizat: ${statusLabel(status)}`);
    } catch {
      toast.error('Eroare la actualizare');
    }
  };

  const convertToLead = async (id: number) => {
    setConverting(id);
    try {
      await adminApi.convertAppointmentToLead(id);
      toast.success('Lead creat! Redirecționare...');
      navigate(crm('/crm/leaduri'));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) toast.error('Lead-ul există deja');
      else toast.error('Eroare la conversie');
    } finally {
      setConverting(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { toate: appointments.length };
    for (const s of STATUS_OPTIONS) c[s] = appointments.filter(a => a.status === s).length;
    return c;
  }, [appointments]);

  const filtered = useMemo(
    () => segment === 'toate' ? appointments : appointments.filter(a => a.status === segment),
    [appointments, segment],
  );

  const { page, setPage, pageCount, slice, total, pageSize } = usePaged(filtered, 25);

  const unscheduled = useMemo(
    () => appointments.filter(a => !a.scheduledAt && a.status !== 'Anulat' && a.status !== 'Finalizat').length,
    [appointments],
  );

  const saved = (a: Appointment) => {
    setAppointments(prev => (prev.some(x => x.id === a.id) ? prev.map(x => (x.id === a.id ? a : x)) : [a, ...prev]));
    if (a.scheduledAt) setWeekStart(startOfWeek(new Date(a.scheduledAt)));
    setForm(null);
  };

  const tabBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${FOCUS_RING} ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
    }`;

  const header = (
    <PageHeader
      title="Programări"
      subtitle="Apeluri și întâlniri programate, plus cererile de apel venite de pe site."
      action={
        <div className="flex flex-wrap gap-2">
          {!inAdmin && (
            <button
              onClick={() => setSubscribing(true)}
              className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${FOCUS_RING}`}
            >
              <CalendarSync className="h-4 w-4" /> Adaugă în Outlook / iPhone
            </button>
          )}
          <button
            onClick={() => setForm({ appointment: null })}
            className={`inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 ${FOCUS_RING}`}
          >
            <CalendarPlus className="h-4 w-4" /> Programare nouă
          </button>
        </div>
      }
    />
  );

  return (
    <div className="space-y-5">
      {header}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Mod de afișare" className="inline-flex rounded-xl bg-slate-100 p-1">
          <button role="tab" aria-selected={view === 'calendar'} onClick={() => setView('calendar')} className={tabBtn(view === 'calendar')}>
            <CalendarDays className="h-4 w-4" /> Calendar
          </button>
          <button role="tab" aria-selected={view === 'lista'} onClick={() => setView('lista')} className={tabBtn(view === 'lista')}>
            <List className="h-4 w-4" /> Listă
          </button>
        </div>
        {view === 'calendar' && unscheduled > 0 && (
          <button onClick={() => setView('lista')} className={`text-sm text-amber-700 underline underline-offset-2 ${FOCUS_RING}`}>
            {unscheduled} {unscheduled === 1 ? 'cerere de apel fără oră' : 'cereri de apel fără oră'} – vezi lista
          </button>
        )}
      </div>

      {subscribing && <CalendarSubscribeModal onClose={() => setSubscribing(false)} />}
      {form && (
        <AppointmentFormModal
          appointment={form.appointment}
          brokers={brokers}
          chooseBroker={isSuperAdmin && inAdmin}
          onClose={() => setForm(null)}
          onSaved={saved}
        />
      )}

      {view === 'calendar' ? (
        loading ? <SkeletonCards count={2} /> : (
          <WeekCalendar
            weekStart={weekStart}
            appointments={appointments}
            brokerNames={inAdmin ? brokerNames : undefined}
            onPrev={() => setWeekStart(w => addDays(w, -7))}
            onNext={() => setWeekStart(w => addDays(w, 7))}
            onToday={() => setWeekStart(startOfWeek(new Date()))}
            onOpen={a => setForm({ appointment: a })}
          />
        )
      ) : (
      <>
      <SegmentChips segments={SEGMENTS} active={segment} onChange={setSegment} counts={counts} />
      {loading ? (
        <SkeletonCards count={4} />
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <span>Nu s-au putut încărca programările.</span>
          <button onClick={() => setReloadKey(k => k + 1)} className="font-medium underline underline-offset-2">Reîncearcă</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={segment === 'toate' ? 'Nicio programare.' : `Nicio programare cu status „${statusLabel(segment)}”.`} />
      ) : (
        <div className="space-y-3">
          {slice.map(a => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{a.nume} {a.prenume}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_PILL[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <a href={`tel:${a.telefon}`} className="flex items-center gap-1 hover:text-slate-800"><Phone size={11} />{a.telefon}</a>
                    {a.email && <span className="flex items-center gap-1"><Mail size={11} />{a.email}</span>}
                    {a.judet && <span className="flex items-center gap-1"><MapPin size={11} />{a.judet}</span>}
                    {a.tipCredit && <span className="flex items-center gap-1"><CreditCard size={11} />{a.tipCredit}</span>}
                    {a.salariuNet > 0 && <span className="text-slate-400">{a.salariuNet.toLocaleString('ro-RO')} RON</span>}
                    {isSuperAdmin && a.brokerProfileId != null && brokerNames[a.brokerProfileId] && (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-brand-primary">{brokerNames[a.brokerProfileId]}</span>
                    )}
                  </div>
                  {(a.intarzieriBirou || a.popriRecuperare) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.intarzieriBirou && (() => {
                        const isNu = a.intarzieriBirou === 'NU';
                        const label = isNu ? 'fără întârzieri' : a.intarzieriBirou.replace(/^Da-/, '').toLowerCase() + ' întârziere';
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isNu ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                            <AlertTriangle size={10} /> Birou: {label}
                          </span>
                        );
                      })()}
                      {a.popriRecuperare && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${a.popriRecuperare === 'NU' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <Gavel size={10} /> Popriri/Recuperare: {a.popriRecuperare}
                        </span>
                      )}
                    </div>
                  )}
                  {a.notes && <p className="mt-2 text-xs text-slate-600">{a.notes}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">
                    {a.scheduledAt
                      ? <span className="font-medium text-brand-primary">
                          Programat {new Date(a.scheduledAt).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}, {timeRange(a)}
                        </span>
                      : <>Cerere primită {new Date(a.createdAt).toLocaleString('ro-RO')}</>}
                  </p>
                  <AssignBrokerControl
                    entityType="appointment"
                    id={String(a.id)}
                    currentBrokerId={a.brokerProfileId}
                    brokers={brokers}
                    onAssigned={brokerId => setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, brokerProfileId: brokerId } : x))}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setForm({ appointment: a })}
                    className={`flex items-center gap-1.5 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 ${FOCUS_RING}`}
                    title={a.scheduledAt ? 'Mută programarea' : 'Programează apelul'}
                  >
                    <CalendarClock size={13} /> {a.scheduledAt ? 'Mută' : 'Programează'}
                  </button>
                  <button
                    onClick={() => convertToLead(a.id)}
                    disabled={converting === a.id}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    title="Convertește în lead"
                  >
                    <UserPlus size={13} /> {converting === a.id ? '...' : 'Lead'}
                  </button>
                  <select
                    value={a.status}
                    aria-label={`Status programare ${a.nume} ${a.prenume}`}
                    onChange={e => updateStatus(a.id, e.target.value)}
                    className={`rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 ${FIELD_FOCUS}`}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      )}
      </>
      )}
    </div>
  );
}
