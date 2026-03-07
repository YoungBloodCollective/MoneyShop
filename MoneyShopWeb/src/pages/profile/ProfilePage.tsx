import { useNavigate } from 'react-router-dom';
import {
  User, DollarSign, Shield, FileText, Users,
  ChevronRight, CheckCircle, XCircle, Receipt,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const menuItems = [
    { label: 'Date financiare', path: '/profile/financial', icon: DollarSign, desc: 'Venituri si obligatii' },
    { label: 'Verificare KYC', path: '/profile/kyc', icon: Shield, desc: 'Verificare identitate' },
    { label: 'Consimtaminte', path: '/profile/consents', icon: CheckCircle, desc: 'Gestioneaza acorduri' },
    { label: 'Mandate', path: '/profile/mandates', icon: FileText, desc: 'Mandate active' },
    { label: 'Documente legale', path: '/profile/legal', icon: FileText, desc: 'Termeni, confidentialitate' },
    { label: 'Director brokeri', path: '/profile/brokers', icon: Users, desc: 'Brokeri autorizati' },
    { label: 'Facturare Oblio', path: '/profile/invoicing', icon: Receipt, desc: 'Facturi si proforma' },
  ];

  return (
    <div className="space-y-8">
      {/* Profile card */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-light-100">{user?.name || 'Utilizator'}</h1>
            <p className="text-sm text-light-60">{user?.email}</p>
            {user?.phone && <p className="text-sm text-light-60">{user.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-5 pt-5 border-t border-dark-400">
          <div className="flex items-center gap-2">
            {user?.emailVerified ? (
              <CheckCircle size={16} className="text-success-500" />
            ) : (
              <XCircle size={16} className="text-error-400" />
            )}
            <span className="text-sm text-light-70">Email</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.phoneVerified ? (
              <CheckCircle size={16} className="text-success-500" />
            ) : (
              <XCircle size={16} className="text-error-400" />
            )}
            <span className="text-sm text-light-70">Telefon</span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center justify-between w-full bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 hover:border-dark-300 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center text-light-70">
                <item.icon size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-light-90">{item.label}</p>
                <p className="text-xs text-light-60">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-light-50" />
          </button>
        ))}
      </div>
    </div>
  );
}
