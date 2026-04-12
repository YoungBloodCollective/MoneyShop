import { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Phone, Lock, Menu, X, Shield, Award, FileCheck } from 'lucide-react';

export function PublicLayout() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Despre MoneyShop', path: '/despre' },
    { label: 'Verifica Broker', path: '/verifica-broker' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center">
            <img src="/images/logo/logo-trimmed.png" alt="MoneyShop" className="h-8 sm:h-9 object-contain" />
          </button>
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="tel:+40770548447" className="hidden md:flex items-center gap-1.5 text-sm text-gray-700 font-medium hover:text-gray-900 transition-colors">
              <Phone size={14} /> 0770 548 447
            </a>
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth/login')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              <Lock size={14} /> {isAuthenticated ? 'Dashboard' : 'Login'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-16 z-40 bg-white overflow-y-auto">
            <div className="flex flex-col p-6 gap-2">
              {navItems.map(item => (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                  className="text-left px-4 py-3 text-base text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <hr className="my-3 border-gray-200" />
              <a href="tel:+40770548447" className="flex items-center gap-2 px-4 py-3 text-base text-gray-700 font-medium">
                <Phone size={16} /> 0770 548 447
              </a>
              <button
                onClick={() => { navigate(isAuthenticated ? '/dashboard' : '/auth/login'); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-4 py-3 text-base text-gray-700 hover:text-gray-900 font-medium rounded-lg transition-colors"
              >
                <Lock size={16} /> {isAuthenticated ? 'Dashboard' : 'Login'}
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1 bg-gradient-to-b from-blue-50/40 to-white">
        <Outlet />
      </main>
      <footer className="bg-gray-900 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <img src="/images/logo/logo-trimmed.png" alt="MoneyShop" className="h-8 brightness-0 invert object-contain" />
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Broker de credite autorizat BNR. Comparam ofertele tuturor bancilor pentru tine, complet gratuit.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Credite</p>
              <div className="space-y-1.5 text-[11px] text-gray-400">
                <p className="hover:text-white cursor-pointer transition-colors">Nevoi Personale</p>
                <p className="hover:text-white cursor-pointer transition-colors">Credit Ipotecar</p>
                <p className="hover:text-white cursor-pointer transition-colors">Refinantare</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Companie</p>
              <div className="space-y-1.5 text-[11px] text-gray-400">
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/despre')}>Despre MoneyShop</p>
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/verifica-broker')}>Verifica un broker</p>
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/legal')}>Termeni si conditii</p>
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/legal')}>Politica de confidentialitate</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Contact</p>
              <div className="space-y-1.5 text-[11px] text-gray-400">
                <p className="flex items-center gap-1.5"><Phone size={11} /> 0770 548 447</p>
                <p className="flex items-center gap-1.5"><Phone size={11} /> 031 434 0940</p>
                <p>contact@moneyshop.ro</p>
                <p>Bucuresti, Romania</p>
                <p>L-V: 09:00 - 18:00</p>
              </div>
              <div className="mt-3">
                <p className="text-[10px] text-gray-500 mb-1.5">Inregistrat ASF &bull; Autorizat BNR</p>
                <div className="flex gap-2">
                  <FileCheck size={14} className="text-gray-600" />
                  <Shield size={14} className="text-gray-600" />
                  <Award size={14} className="text-gray-600" />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-5 flex flex-col items-center gap-3">
            <p className="text-[10px] text-gray-600 text-center">
              ANPC — Autoritatea Nationala pentru Protectia Consumatorilor:{' '}
              <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400 transition-colors">SAL</a>
              {' | '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400 transition-colors">SOL</a>
            </p>
            <div className="w-full text-center sm:text-left space-y-1 mt-3 pt-3 border-t border-gray-200">
              <p className="text-[11px] text-gray-600 font-medium">MONEYSHOP FINTECH SRL</p>
              <p className="text-[10px] text-gray-500">CUI: 53986951 &bull; ONRC: J2026010941009 &bull; EUID: ROONRC.J2026010941009</p>
              <p className="text-[10px] text-gray-500">Adresa: Str. Constantin Brancusi, nr.8, Rm. Valcea, Jud. Valcea &bull; E-mail: office@moneyshop.ro</p>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-1">
                <p className="text-[10px] text-gray-400">&copy; {new Date().getFullYear()} MoneyShop. Toate drepturile rezervate.</p>
                <div className="flex items-center gap-4 text-[10px] text-gray-500">
                  <button onClick={() => navigate('/legal')} className="hover:text-gray-700 transition-colors">Legal</button>
                  <button onClick={() => navigate('/despre')} className="hover:text-gray-700 transition-colors">Despre</button>
                  <button onClick={() => navigate('/')} className="hover:text-gray-700 transition-colors">Acasa</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
