import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const TOAST_ID = 'pwa-update';
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    immediate: false,
    onRegisteredSW: (_, registration) => {
      if (!registration) return;
      window.setInterval(() => { if (navigator.onLine) void registration.update(); }, UPDATE_CHECK_MS);
    },
    onRegisterError: err => console.warn('Service worker registration failed', err),
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast(
      t => (
        <div className="flex items-center gap-3">
          <RefreshCw size={18} className="text-brand-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-light-100">Versiune nouă disponibilă</p>
            <p className="text-xs text-light-60">Actualizează ca să ai ultimele îmbunătățiri.</p>
          </div>
          <button
            type="button"
            onClick={() => { toast.dismiss(t.id); setNeedRefresh(false); void updateServiceWorker(true); }}
            className="shrink-0 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            Actualizează
          </button>
        </div>
      ),
      { id: TOAST_ID, duration: Infinity },
    );
    return () => toast.dismiss(TOAST_ID);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
