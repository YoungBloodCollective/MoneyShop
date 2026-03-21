import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  User,
  Users,
  ChevronDown,
  LogOut,
  ShieldCheck,
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
      { label: 'Raport BC', path: '/profile/bc-report' },
      { label: 'Verificare KYC', path: '/profile/kyc' },
      { label: 'Notificari', path: '/profile/notifications' },
    ],
  },
  {
    label: 'Brokeri',
    path: '/profile/brokers',
    icon: <Users size={20} />,
  },
];

const adminNavItems: NavItem[] = [
  {
    label: 'Admin',
    path: '/admin',
    icon: <ShieldCheck size={20} />,
    children: [
      { label: 'Aplicatii', path: '/admin/applications' },
      { label: 'Verificari KYC', path: '/admin/kyc' },
      { label: 'Rapoarte', path: '/admin/reports' },
      { label: 'Brokeri', path: '/admin/brokers' },
    ],
  },
];

export function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(
    ['Profil'],
  );

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label],
    );
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-brand-primary text-white'
        : 'text-light-70 hover:bg-dark-800 hover:text-light-90'
    }`;

  return (
    <aside className="flex flex-col w-64 h-full bg-dark-700 border-r border-dark-600">
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
                <NavLink
                  to={item.path}
                  className={linkClass}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
                <div className="ml-9 mt-1 space-y-0.5">
                  {item.children.map(child => (
                    <NavLink key={child.path} to={child.path} className={linkClass}>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </>
            ) : (
              <NavLink to={item.path} className={linkClass}>
                {item.icon}
                {item.label}
              </NavLink>
            )}
          </div>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="my-3 mx-4 border-t border-dark-600" />
            {adminNavItems.map(item => (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl text-sm font-medium text-brand-primary hover:bg-brand-primary/10 transition-all"
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
                    {item.children?.map(child => (
                      <NavLink key={child.path} to={child.path} className={linkClass}>
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-dark-600">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-light-90 truncate">{user?.name || 'Utilizator'}</p>
            <p className="text-xs text-light-60 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-2xl text-sm text-error-500 hover:bg-error-500/10 transition-all"
        >
          <LogOut size={16} />
          Deconectare
        </button>
      </div>
    </aside>
  );
}
