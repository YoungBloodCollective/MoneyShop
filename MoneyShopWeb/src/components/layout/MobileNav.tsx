import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calculator, ClipboardList, User } from 'lucide-react';

const tabs = [
  { label: 'Acasa', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Simulator', path: '/simulator', icon: Calculator },
  { label: 'Aplicatii', path: '/dashboard/applications', icon: ClipboardList },
  { label: 'Profil', path: '/profile', icon: User },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-700 border-t border-dark-600 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all ${
                isActive ? 'text-brand-primary' : 'text-light-60'
              }`
            }
          >
            <tab.icon size={22} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
