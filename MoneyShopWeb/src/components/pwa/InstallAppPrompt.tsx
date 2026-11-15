import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Smartphone, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { isIosSafari, isStandalone, rememberInstallDismissed, wasInstallDismissedRecently } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TOAST_ID = 'pwa-install';
const SHOW_DELAY_MS = 4000;
const NATIVE_DELAY_MS = 800;
const TOAST_DURATION_MS = 25000;

function dismiss() {
  rememberInstallDismissed();
  toast.dismiss(TOAST_ID);
}

function InstallToast({ onInstall }: { onInstall: (() => void) | null }) {
  return (
    <div className="flex items-start gap-3 max-w-xs">
      <Smartphone size={18} className="text-brand-primary shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-light-100">Instalează aplicația MoneyShop</p>
        {onInstall ? (
          <p className="text-xs text-light-60 mt-0.5">O ai pe ecranul principal, ca pe orice aplicație.</p>
        ) : (
          <p className="text-xs text-light-60 mt-0.5">
            Apasă <span className="font-semibold">Partajează</span> în Safari, apoi <span className="font-semibold">Adaugă pe ecranul principal</span>.
          </p>
        )}
        {onInstall && (
          <button
            type="button"
            onClick={onInstall}
            className="mt-2 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            Instalează
          </button>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Închide" className="shrink-0 text-light-50 hover:text-light-80">
        <X size={16} />
      </button>
    </div>
  );
}

export function InstallAppPrompt() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setInstallable(true);
    };
    const onInstalled = () => { deferred.current = null; setInstallable(false); toast.dismiss(TOAST_ID); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isStandalone() || wasInstallDismissedRecently()) return;
    if (!installable && !isIosSafari()) return;
    const timer = window.setTimeout(() => {
      const native = deferred.current;
      const onInstall = native
        ? async () => {
          toast.dismiss(TOAST_ID);
          try {
            await native.prompt();
            const { outcome } = await native.userChoice;
            if (outcome === 'dismissed') rememberInstallDismissed();
          } catch {
            rememberInstallDismissed();
          } finally {
            deferred.current = null;
            setInstallable(false);
          }
        }
        : null;
      toast(<InstallToast onInstall={onInstall} />, { id: TOAST_ID, duration: TOAST_DURATION_MS });
      window.setTimeout(() => { if (!wasInstallDismissedRecently()) rememberInstallDismissed(); }, TOAST_DURATION_MS);
    }, installable ? NATIVE_DELAY_MS : SHOW_DELAY_MS);
    return () => { window.clearTimeout(timer); toast.dismiss(TOAST_ID); };
  }, [isAuthenticated, installable]);

  return null;
}
