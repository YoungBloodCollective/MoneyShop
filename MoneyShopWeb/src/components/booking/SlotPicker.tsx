import { useEffect, useRef, useState } from 'react';
import { bookingApi, type BookingDay } from '@/services/api/bookingApi';

/**
 * Pick a day, then a time, from the times that are really free in the broker's calendar.
 * Calls back with the chosen start (ISO, UTC) or null. Shows nothing it cannot honour.
 */
export function SlotPicker({ brokerSlug, value, onChange, onUnavailable, accent = 'green' }: {
  brokerSlug?: string | null;
  value: string | null;
  onChange: (startUtc: string | null) => void;
  /** Called when no free time could be loaded (the form can then fall back to a callback request). */
  onUnavailable?: () => void;
  accent?: 'green' | 'blue';
}) {
  const [days, setDays] = useState<BookingDay[] | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  // onUnavailable is a notification, not an input: keep the latest one without reloading the slots.
  const unavailableRef = useRef(onUnavailable);
  useEffect(() => { unavailableRef.current = onUnavailable; });

  useEffect(() => {
    let active = true;
    bookingApi.slots(brokerSlug)
      .then(r => {
        if (!active) return;
        setDays(r.days);
        if (r.days.length === 0) unavailableRef.current?.();
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        unavailableRef.current?.();
      });
    return () => { active = false; };
  }, [brokerSlug]);

  const on = accent === 'green' ? 'bg-green-500 text-white border-green-500' : 'bg-blue-600 text-white border-blue-600';
  const off = 'bg-white text-gray-700 border-gray-200 hover:border-gray-400';

  if (failed) return <p className="text-xs text-gray-500">Nu am putut încărca orele libere. Trimite cererea și te sunăm noi cât mai curând.</p>;
  if (days === null) return <div className="h-20 animate-pulse rounded-xl bg-gray-100" />;
  if (days.length === 0) return <p className="text-xs text-gray-500">Momentan nu sunt ore libere afișate. Trimite cererea și te sunăm noi cât mai curând.</p>;

  const day = days[Math.min(dayIndex, days.length - 1)];

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Alege ziua">
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            role="tab"
            aria-selected={i === dayIndex}
            onClick={() => { setDayIndex(i); onChange(null); }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${i === dayIndex ? on : off}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={`Ore libere ${day.label}`}>
        {day.slots.map(s => (
          <button
            key={s.startUtc}
            type="button"
            role="radio"
            aria-checked={value === s.startUtc}
            onClick={() => onChange(s.startUtc)}
            className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${value === s.startUtc ? on : off}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
