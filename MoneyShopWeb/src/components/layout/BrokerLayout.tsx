import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderOpen, BarChart2, Settings,
  Bell, Menu, X, LogOut, ChevronRight, TrendingUp
} from 'lucide-react';
import { useBrokerAuthStore } from '@/store/brokerAuthStore';
import clsx from 'clsx';

const navItems = [
  { to: '/broker/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/broker/clients', icon: Users, label: 'Clienti & Leads' },
  { to: '/broker/dosare', icon: FolderOpen, label: 'Dosare' },
  { to: '/broker/rapoarte', icon: BarChart2, label: 'Rapoarte' },
  { to: '/broker/setari', icon: Settings, label: 'Setari cont' },
];

function BrokerSidebar({ onClose }: { onClose?: () => void }) {
  const { brokerUser, logout } = useBrokerAuthStore();
  const profile = brokerUser?.brokerProfile;

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">MoneyShop CRM</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-brand-primary font-bold text-sm">
            {brokerUser?.name?.charAt(0).toUpperCase() ?? 'B'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{brokerUser?.name}</p>
            <p className="text-xs text-gray-500 truncate">{brokerUser?.email}</p>
          </div>
        </div>
        {profile && (
          <div className="mt-2 flex items-center gap-2">
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              profile.plan === 'Full' ? 'bg-yellow-100 text-yellow-700' :
              profile.plan === 'Basic' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            )}>
              {profile.plan}
            </span>
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full',
              profile.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            )}>
              {profile.isActive ? 'Activ' : 'Inactiv'}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 text-brand-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        {profile && (
          <div className="px-3 py-2 mb-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Link unic</p>
            <p className="text-xs text-brand-primary font-mono truncate">
              moneyshop.ro/apply/{profile.slug}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Deconectare
        </button>
      </div>
    </div>
  );
}

export function BrokerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { brokerUser } = useBrokerAuthStore();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden lg:flex">
        <BrokerSidebar />
      </div>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <BrokerSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <BrokerBreadcrumb />
          </div>
          <div className="flex items-center gap-2">
            <BrokerNotificationBell />
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-brand-primary font-bold text-xs">
                {brokerUser?.name?.charAt(0).toUpperCase() ?? 'B'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function BrokerBreadcrumb() {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500">
      <span className="font-medium text-gray-900">CRM Broker</span>
    </nav>
  );
}

function BrokerNotificationBell() {
  return (
    <button className="relative p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
      <Bell className="w-5 h-5" />
    </button>
  );
}
