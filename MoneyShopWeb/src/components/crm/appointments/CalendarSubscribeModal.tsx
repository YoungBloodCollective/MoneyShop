import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Copy, Loader2, X } from 'lucide-react';
import { crmApi, type CalendarFeedLink } from '@/services/api/crmApi';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';

/**
 * The broker's secret calendar link: subscribed once in Outlook / iPhone / Google Calendar, it keeps
 * showing new, moved and cancelled appointments (calendar apps refresh it on their own schedule).
 */
export function CalendarSubscribeModal({ onClose }: { onClose: () => void }) {
  const [link, setLink] = useState<CalendarFeedLink | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    crmApi.getCalendarFeed()
      .then(l => { if (active) setLink(l); })
      .catch(err => {
        if (!active) return;
        const msg = axios.isAxiosError(err) && typeof err.response?.data?.message === 'string' ? err.response.data.message : null;
        setError(msg ?? 'Nu am putut genera linkul de calendar.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copiat');
    } catch {
      toast.error('Nu am putut copia. Selectează linkul și copiază-l manual.');
    }
  };

  const step = 'text-sm text-slate-600';
  const btn = `inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold ${FOCUS_RING}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="calendar-subscribe-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="calendar-subscribe-title" className="text-base font-semibold text-slate-900">Vezi programările în Outlook / iPhone</h2>
          <button onClick={onClose} className={`rounded-lg p-1 text-slate-400 hover:text-slate-700 ${FOCUS_RING}`} aria-label="Închide"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {!link && !error && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {link && (
            <>
              <p className={step}>
                Abonează-te o singură dată la calendarul tău MoneyShop. Programările noi, mutate sau anulate apar singure
                (Outlook și Google îl reîmprospătează la câteva ore, iPhone mai des).
              </p>
              <div className="flex gap-2">
                <input readOnly value={link.url} onFocus={e => e.currentTarget.select()} aria-label="Link calendar"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700" />
                <button onClick={copy} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}><Copy className="h-4 w-4" /> Copiază</button>
              </div>
              <a href={link.webcalUrl} className={`${btn} w-full bg-brand-primary text-white hover:opacity-90`}>Deschide în aplicația de calendar</a>

              <div className="space-y-3 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Outlook</p>
                  <p className={step}>Calendar → Adaugă calendar → Abonare de pe web → lipește linkul → Importă.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">iPhone</p>
                  <p className={step}>Apasă butonul de mai sus pe telefon, sau Setări → Calendar → Conturi → Adaugă cont → Altul → Adaugă calendar abonat.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Google Calendar</p>
                  <p className={step}>Alte calendare → + → Din URL → lipește linkul.</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Linkul este personal: oricine îl are vede numele și telefonul clienților tăi programați. Nu-l trimite altcuiva.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
