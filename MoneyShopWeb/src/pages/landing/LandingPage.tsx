import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, PiggyBank, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';

const features = [
  { icon: Zap, title: 'Simulator rapid', desc: 'Afla in 2 minute cat poti imprumuta' },
  { icon: Shield, title: 'Securitate', desc: 'Date protejate prin criptare end-to-end' },
  { icon: PiggyBank, title: 'Oferte personalizate', desc: 'Compara ofertele bancilor in timp real' },
  { icon: MessageCircle, title: 'Asistent virtual', desc: 'Intrebari? Asistentul nostru te ajuta non-stop' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-16 py-5">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth/login')}
            className="px-5 py-2.5 text-sm font-medium text-light-80 hover:text-light-100 transition-colors"
          >
            Autentificare
          </button>
          <button
            onClick={() => navigate('/auth/register')}
            className="px-5 py-2.5 text-sm font-medium bg-brand-primary text-white rounded-full hover:bg-brand-primary/90 transition-colors"
          >
            Inregistrare
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 lg:px-16 pt-16 pb-24 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl lg:text-6xl font-extrabold text-light-100 leading-tight tracking-tight mb-6">
          Creditul potrivit,{' '}
          <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
            la un click distanta
          </span>
        </h1>
        <p className="text-lg text-light-60 max-w-2xl mx-auto mb-10">
          Compara ofertele bancilor, simuleaza rate si aplica online — totul intr-un singur loc, simplu si transparent.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/auth/register')}
            className="flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-brand-primary text-white rounded-full hover:bg-brand-primary/90 transition-colors"
          >
            Incepe acum <ArrowRight size={20} />
          </button>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-8 py-4 text-lg font-semibold text-light-80 border border-dark-400 rounded-full hover:bg-dark-700 transition-colors"
          >
            Am deja cont
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-16 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-dark-700 border border-dark-400 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-brand-primary/15 flex items-center justify-center text-brand-primary">
                <f.icon size={24} />
              </div>
              <h3 className="text-lg font-semibold text-light-100 mb-2">{f.title}</h3>
              <p className="text-sm text-light-60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-400 px-6 py-6 text-center text-xs text-light-50">
        &copy; {new Date().getFullYear()} MoneyShop. Toate drepturile rezervate.
      </footer>
    </div>
  );
}
