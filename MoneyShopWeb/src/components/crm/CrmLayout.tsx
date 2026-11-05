import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, Landmark, Sparkles,
  Megaphone, Workflow, BarChart3, Settings, Search, Bell,
  Menu, X, LogOut, ChevronDown, ExternalLink,
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(t)) setBellOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setUserMenuOpen(false); setBellOpen(false); }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

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

          <div className="flex flex-1 sm:flex-none items-center justify-end gap-1.5">
            {/* Notifications */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => { setBellOpen(v => !v); setUserMenuOpen(false); }}
                className={`rounded-xl p-2 text-slate-500 hover:bg-slate-100 ${bellOpen ? 'bg-slate-100 text-slate-700' : ''}`}
                aria-label="Notificări"
              >
                <Bell className="h-5 w-5" />
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Notificări</div>
                  <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
                    <Bell className="h-6 w-6 text-slate-300" />
                    <p className="text-sm text-slate-400">Nicio notificare nouă</p>
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => { setUserMenuOpen(v => !v); setBellOpen(false); }}
                className={`flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 hover:bg-slate-100 ${userMenuOpen ? 'bg-slate-100' : ''}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary">
                  {initials(user?.name)}
                </div>
                <div className="hidden text-left leading-tight sm:block">
                  <div className="text-sm font-semibold text-slate-800">{user?.name ?? 'Broker'}</div>
                  <div className="max-w-[160px] truncate text-[11px] text-slate-400">{user?.email}</div>
                </div>
                <ChevronDown className={`hidden h-4 w-4 shrink-0 text-slate-400 transition-transform sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="truncate text-sm font-semibold text-slate-800">{user?.name ?? 'Broker'}</div>
                    <div className="truncate text-xs text-slate-400">{user?.email}</div>
                  </div>
                  <div className="py-1">
                    {isSuperAdmin && (
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate('/admin'); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4 text-slate-400" /> Panou admin
                      </button>
                    )}
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" /> Ieși din cont
                    </button>
                  </div>
                </div>
              )}
            </div>
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
