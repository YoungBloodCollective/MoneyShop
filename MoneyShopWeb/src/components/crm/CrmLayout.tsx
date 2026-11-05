import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, Landmark, Sparkles,
  Megaphone, Workflow, BarChart3, Settings, Search, Bell,
  Menu, X, LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBrokerSlug } from '@/lib/brokerHost';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  to?: string;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/crm' },
  { label: 'Clienți', icon: Users, to: '/crm/clienti' },
  { label: 'Dosare', icon: FolderKanban, to: '/crm/dosare' },
  { label: 'Oferte bancare', icon: Landmark, to: '/crm/oferte' },
  { label: 'Lead-uri', icon: Sparkles, to: '/crm/leaduri' },
  { label: 'Campanii', icon: Megaphone, soon: true },
  { label: 'Automatizări', icon: Workflow, to: '/crm/automatizari' },
  { label: 'Rapoarte', icon: BarChart3, soon: true },
  { label: 'Setări', icon: Settings, soon: true },
];

function initials(name?: string) {
  if (!name) return 'B';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const slug = getBrokerSlug();
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-white font-bold">M</div>
        <div className="leading-tight">
          <div className="text-white font-semibold text-sm">MoneyShop CRM</div>
          {slug && <div className="text-[11px] text-slate-400">{slug}.moneyshop.ro</div>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map(item => {
          const Icon = item.icon;
          if (item.soon || !item.to) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 cursor-default select-none"
                title="În curând"
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-600">curând</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/crm'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function CrmLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            className="lg:hidden text-slate-600"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Meniu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="relative hidden sm:block flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Caută clienți, dosare..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-1 sm:flex-none items-center justify-end gap-3">
            <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Notificări">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-primary" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary">
                {initials(user?.name)}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-semibold text-slate-800">{user?.name ?? 'Broker'}</div>
                <div className="text-[11px] text-slate-400">{user?.email}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Ieși din cont"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
