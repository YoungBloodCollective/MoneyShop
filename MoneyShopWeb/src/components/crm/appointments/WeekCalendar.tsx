import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';
import { CANCELLED_STATUS, addDays, sameDay, timeRange, type Appointment } from './appointmentModel';

const DAY_NAMES = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

/**
 * One week of scheduled appointments, a column per day (a list per day on phones). Clicking an
 * appointment opens it; the same appointment is shown to the broker and to the Super Admin.
 */
export function WeekCalendar({
  weekStart, appointments, brokerNames, onPrev, onNext, onToday, onOpen,
}: {
  weekStart: Date;
  appointments: Appointment[];
  brokerNames?: Record<number, string>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (a: Appointment) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const weekEnd = addDays(weekStart, 6);
  const label = `${weekStart.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const byDay = days.map(day => appointments
    .filter(a => a.scheduledAt && sameDay(new Date(a.scheduledAt), day))
    .sort((x, y) => new Date(x.scheduledAt!).getTime() - new Date(y.scheduledAt!).getTime()));

  const navBtn = `rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{label}</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={onPrev} className={navBtn} aria-label="Săptămâna anterioară"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={onToday} className={`rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}>Azi</button>
          <button onClick={onNext} className={navBtn} aria-label="Săptămâna următoare"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-7 md:divide-x md:divide-y-0">
        {days.map((day, i) => {
          const isToday = sameDay(day, today);
          const items = byDay[i];
          return (
            <section key={day.toISOString()} aria-label={`${DAY_NAMES[i]} ${day.getDate()}`} className={`min-h-[7rem] p-2.5 ${isToday ? 'bg-brand-primary/[0.03]' : ''}`}>
              <div className="mb-2 flex items-baseline gap-1.5">
                <span className={`text-xs font-semibold ${isToday ? 'text-brand-primary' : 'text-slate-500'}`}>{DAY_NAMES[i]}</span>
                <span className={`text-xs ${isToday ? 'rounded-full bg-brand-primary px-1.5 text-white' : 'text-slate-400'}`}>{day.getDate()}</span>
              </div>
              {items.length === 0 ? (
                <p className="hidden text-[11px] text-slate-300 md:block">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map(a => {
                    const cancelled = a.status === CANCELLED_STATUS;
                    return (
                      <li key={a.id}>
                        <button
                          onClick={() => onOpen(a)}
                          className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors ${FOCUS_RING} ${
                            cancelled
                              ? 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                              : 'border-brand-primary/20 bg-brand-primary/[0.06] text-slate-800 hover:bg-brand-primary/10'
                          }`}
                        >
                          <span className="block text-[11px] font-semibold text-brand-primary">{timeRange(a)}</span>
                          <span className="block truncate text-xs font-medium">{a.nume} {a.prenume}</span>
                          {brokerNames && a.brokerProfileId != null && brokerNames[a.brokerProfileId] && (
                            <span className="block truncate text-[10px] text-slate-500">{brokerNames[a.brokerProfileId]}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
