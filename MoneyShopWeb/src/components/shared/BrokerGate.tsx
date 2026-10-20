import { SearchX, WifiOff } from 'lucide-react';
import { ROOT_DOMAIN_NAME } from '@/lib/brokerHost';
import { useBroker } from '@/context/brokerContextValue';
import { Logo } from '@/components/shared/Logo';

export function BrokerGate({ children }: { children: React.ReactNode }) {
  const { status, slug } = useBroker();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-6 text-center">
        <Logo size="md" clickable={false} />
        <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center mt-10 mb-6">
          <SearchX size={38} className="text-light-50" />
        </div>
        <h1 className="text-2xl font-bold text-light-100 mb-2">Brokerul nu a fost găsit</h1>
        <p className="text-light-60 max-w-sm mb-8">
          Adresa <span className="font-medium text-light-80">{slug}.{ROOT_DOMAIN_NAME}</span> nu aparține unui broker activ.
        </p>
        <a href={`https://${ROOT_DOMAIN_NAME}`} className="px-6 py-3 rounded-xl bg-brand-primary text-white font-semibold">
          Mergi la MoneyShop
        </a>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-6 text-center">
        <Logo size="md" clickable={false} />
        <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center mt-10 mb-6">
          <WifiOff size={36} className="text-light-50" />
        </div>
        <h1 className="text-2xl font-bold text-light-100 mb-2">Nu ne putem conecta</h1>
        <p className="text-light-60 max-w-sm mb-8">Verifică conexiunea la internet și încearcă din nou.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-brand-primary text-white font-semibold">
          Încearcă din nou
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
