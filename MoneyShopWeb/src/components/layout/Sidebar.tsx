import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  User,
  MessageCircle,
  FileText,
  Shield,
  Users,
  Receipt,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={20} />,
    children: [
      { label: 'Aplicatii', path: '/dashboard/applications' },
      { label: 'Aplicatie noua', path: '/dashboard/apply' },
    ],
  },
  {
    label: 'Simulator',
    path: '/simulator',
    icon: <Calculator size={20} />,
  },
  {
    label: 'Profil',
    path: '/profile',
    icon: <User size={20} />,
    children: [
      { label: 'Date financiare', path: '/profile/financial' },
      { label: 'Verificare KYC', path: '/profile/kyc' },
    ],
  },
  {
    label: 'Chat',
    path: '/chat',
    icon: <MessageCircle size={20} />,
  },
  {
    label: 'Legal',
    path: '/profile/legal',
    icon: <FileText size={20} />,
    children: [
      { label: 'Termeni', path: '/profile/legal/terms' },
      { label: 'Confidentialitate', path: '/profile/legal/privacy' },
      { label: 'Mandat', path: '/profile/legal/mandate' },
      { label: 'Conformitate', path: '/profile/legal/compliance' },
      { label: 'Transfer date', path: '/profile/legal/data-transfer' },
    ],
  },
  {
    label: 'Consimtaminte',
    path: '/profile/consents',
    icon: <Shield size={20} />,
  },
  {
    label: 'Mandate',
    path: '/profile/mandates',
    icon: <FileText size={20} />,
  },
  {
    label: 'Brokeri',
    path: '/profile/brokers',
    icon: <Users size={20} />,
  },
  {
    label: 'Facturare',
    path: '/profile/invoicing',
    icon: <Receipt size={20} />,
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Dashboard', 'Profil']);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label],
    );
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-primary/15 text-brand-primary'
        : 'text-light-70 hover:bg-dark-600 hover:text-light-90'
    }`;

  return (
    <aside className="flex flex-col w-64 h-full bg-dark-900 border-r border-dark-400">
      {/* Logo */}
      <div className="flex items-center px-5 py-6">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {navItems.map(item => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium text-light-70 hover:bg-dark-600 hover:text-light-90 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${expandedItems.includes(item.label) ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedItems.includes(item.label) && (
                  <div className="ml-9 mt-1 space-y-0.5">
                    <NavLink to={item.path} end className={linkClass}>
                      General
                    </NavLink>
                    {item.children.map(child => (
                      <NavLink key={child.path} to={child.path} className={linkClass}>
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink to={item.path} className={linkClass}>
                {item.icon}
                {item.label}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-dark-400">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-light-90 truncate">{user?.name || 'Utilizator'}</p>
            <p className="text-xs text-light-60 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-error-400 hover:bg-error-500/10 transition-colors"
        >
          <LogOut size={16} />
          Deconectare
        </button>
      </div>
    </aside>
  );
}
