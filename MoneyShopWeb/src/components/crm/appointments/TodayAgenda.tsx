import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Phone } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useCrmPath } from '@/lib/crmPath';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';
import { CANCELLED_STATUS, STATUS_PILL, addDays, statusLabel, timeRange, type Appointment } from './appointmentModel';
import { AppointmentDrawer } from './AppointmentDrawer';

/** Today's calls and meetings, first thing on the dashboard. Refreshes every 30 seconds. */
export function TodayAgenda() {
  const crm = useCrmPath();
  const [items, setItems] = useState<Appointment[] | null>(null);
  // Moment of the last refresh; used to dim calls that are already over.
  const [now, setNow] = useState(0);
  // A failed refresh must never look like a free day: the broker could miss calls.
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Appointment | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      apiClient.get('/appointments', { params: { from: start.toISOString(), to: addDays(start, 1).toISOString() } })
        .then(r => {
          if (!active) return;
          const list = (r.data as Appointment[])
            .filter(a => a.scheduledAt && a.status !== CANCELLED_STATUS)
            .sort((x, y) => new Date(x.scheduledAt!).getTime() - new Date(y.scheduledAt!).getTime());
          setItems(list);
          setNow(Date.now());
          setFailed(false);
        })
        .catch(() => { if (active) setFailed(true); });
    };
    queueMicrotask(() => { if (active) load(); });
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [reloadKey]);

  const lastUpdate = now ? new Date(now).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarClock className="h-4 w-4 text-brand-primary" /> Agenda de azi
        </h2>
        <Link to={crm('/crm/programari')} className={`text-xs font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>Calendar</Link>
      </div>
      {failed && (
        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>
            Nu am putut încărca agenda.{lastUpdate ? ` Afișăm datele de la ${lastUpdate}.` : ''}
          </span>
          <button
            type="button"
            onClick={() => setReloadKey(k => k + 1)}
            className={`shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 font-medium text-red-700 hover:bg-red-100 ${FOCUS_RING}`}
          >
            Reîncearcă
          </button>
        </div>
      )}
      {items === null ? (
        failed ? null : <div className="h-12 animate-pulse rounded-lg bg-slate-50" />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">Nicio programare azi.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map(a => {
            const past = new Date(a.scheduledAt!).getTime() + (a.durationMinutes ?? 15) * 60_000 < now;
            return (
              <li key={a.id} className={`flex items-center justify-between gap-3 py-2 ${past ? 'opacity-50' : ''}`}>
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  className={`min-w-0 flex-1 rounded-lg py-1 text-left hover:bg-slate-50 ${FOCUS_RING}`}
                  title="Detalii, rezultat apel, notițe"
                >
                  <span className="mr-2 text-xs font-semibold text-brand-primary">{timeRange(a)}</span>
                  <span className="text-sm text-slate-800">{a.nume} {a.prenume}</span>
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_PILL[a.status] ?? 'bg-slate-100 text-slate-600'}`}>{statusLabel(a.status)}</span>
                </button>
                <a href={`tel:${a.telefon}`} className={`flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}>
                  <Phone className="h-3 w-3" /> Sună
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {selected && (
        <AppointmentDrawer
          key={selected.id}
          appointment={selected}
          onClose={() => setSelected(null)}
          onChanged={a => setItems(prev => (prev ?? [])
            .map(x => (x.id === a.id ? a : x))
            .filter(x => x.status !== CANCELLED_STATUS && !!x.scheduledAt))}
        />
      )}
    </div>
  );
}
