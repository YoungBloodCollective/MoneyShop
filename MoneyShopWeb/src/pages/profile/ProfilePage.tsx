import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Shield, FileText, Users, FileSearch,
  ChevronRight, CheckCircle, XCircle, Phone, Bell,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const menuSections = [
    {
      title: 'DATE PERSONALE',
      items: [
        { label: 'Notificari', path: '/profile/notifications', icon: Bell, desc: 'Setari notificari' },
        { label: 'Consimtaminte', path: '/profile/consents', icon: CheckCircle, desc: 'Gestioneaza acorduri' },
      ],
    },
    {
      title: 'FINANCIAR',
      items: [
        { label: 'Date financiare', path: '/profile/financial', icon: DollarSign, desc: 'Venituri si obligatii' },
        { label: 'Raport Birou de Credit', path: '/profile/bc-report', icon: FileSearch, desc: 'Incarca si analizeaza raportul BC' },
      ],
    },
    {
      title: 'DOCUMENTE',
      items: [
        { label: 'Verificare KYC', path: '/profile/kyc', icon: Shield, desc: 'Verificare identitate' },
        { label: 'Mandate', path: '/profile/mandates', icon: FileText, desc: 'Mandate active' },
      ],
    },
    {
      title: 'ALTELE',
      items: [
        { label: 'Brokerul meu', path: '/profile/brokers', icon: Users, desc: 'Contacteaza brokerul tau' },
        { label: 'Programeaza un apel', path: '/profile/schedule-call', icon: Phone, desc: 'Vorbeste cu un broker' },
        { label: 'Documente legale', path: '/legal', icon: FileText, desc: 'Termeni, confidentialitate' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Profile card with centered avatar */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 flex flex-col items-center text-center">
        {/* Large centered avatar with gradient border */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-brand-primary p-[3px] mb-4">
          <div className="w-full h-full rounded-full bg-dark-700 flex items-center justify-center text-3xl font-bold text-brand-primary">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>

        <h1 className="text-xl font-bold text-light-100">{user?.name || 'Utilizator'}</h1>
        {user?.email && <p className="text-sm text-light-60 mt-1">{user.email}</p>}
        {user?.phone && <p className="text-sm text-light-60">{user.phone}</p>}

        {/* Verification badges */}
        <div className="flex items-center gap-5 mt-5 pt-5 border-t border-dark-400 w-full justify-center">
          <div className="flex items-center gap-2">
            {user?.emailVerified ? (
              <CheckCircle size={16} className="text-success-500" />
            ) : (
              <XCircle size={16} className="text-error-400" />
            )}
            <span className="text-sm text-light-70">Email verificat</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.phoneVerified ? (
              <CheckCircle size={16} className="text-success-500" />
            ) : (
              <XCircle size={16} className="text-error-400" />
            )}
            <span className="text-sm text-light-70">Telefon verificat</span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div>
        {menuSections.map((section, idx) => (
          <div key={section.title}>
            <p className={`text-xs text-light-40 uppercase tracking-wider mb-2 ${idx === 0 ? '' : 'mt-4'}`}>
              {section.title}
            </p>
            <div className="space-y-2">
              {section.items.map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-between w-full bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 hover:border-brand-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary/20 transition-colors">
                      <item.icon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-light-90">{item.label}</p>
                      <p className="text-xs text-light-60">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-light-50 group-hover:text-brand-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
