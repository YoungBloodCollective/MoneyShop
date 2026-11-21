import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from '@/lib/consent';

/**
 * Cookie consent banner. "Accept" and "Refuz" have the same weight, nothing is pre-ticked, and the
 * choice can be changed later from "Setări cookie-uri" in the footer. Necessary storage (login,
 * preferences) is always on; marketing (Google Ads) only after "Accept".
 */
export function CookieBanner() {
  const [open, setOpen] = useState(() => readConsent() === null);
  const [details, setDetails] = useState(false);
  const [marketing, setMarketing] = useState(() => readConsent()?.marketing ?? false);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reopen = () => {
      setMarketing(readConsent()?.marketing ?? false);
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (open && details) firstButton.current?.focus();
  }, [open, details]);

  if (!open) return null;

  const choose = (value: boolean) => {
    saveConsent(value);
    setOpen(false);
    setDetails(false);
  };

  const btn = 'flex-1 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Setări cookie-uri"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Folosim cookie-uri</p>
            <p className="mt-1 text-sm text-gray-600">
              Cele necesare țin site-ul funcțional (autentificare, preferințe). Cu acordul tău folosim și cookie-uri de
              marketing Google Ads, ca să știm ce reclame ne aduc clienți. Poți schimba oricând alegerea din „Setări
              cookie-uri”, jos în pagină. Detalii în{' '}
              <Link to="/legal" className="text-blue-600 underline hover:text-blue-700">politica de cookie-uri</Link>.
            </p>

            {details && (
              <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked disabled className="mt-1 h-4 w-4" />
                  <span><span className="font-medium text-gray-900">Necesare</span><span className="block text-gray-600">Mereu active: fără ele nu funcționează contul și formularele.</span></span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={e => setMarketing(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span><span className="font-medium text-gray-900">Marketing (Google Ads)</span><span className="block text-gray-600">Măsurarea reclamelor, inclusiv emailul și telefonul trimise criptat (hash) când ceri o programare.</span></span>
                </label>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {details ? (
                <>
                  <button ref={firstButton} type="button" onClick={() => choose(marketing)} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
                    Salvează alegerea
                  </button>
                  <button type="button" onClick={() => choose(true)} className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
                    Accept toate
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => choose(true)} className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
                    Accept
                  </button>
                  <button type="button" onClick={() => choose(false)} className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
                    Refuz
                  </button>
                  <button type="button" onClick={() => setDetails(true)} className={`${btn} text-blue-600 hover:bg-blue-50`}>
                    Personalizez
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
