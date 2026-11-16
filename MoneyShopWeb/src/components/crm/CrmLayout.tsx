import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, Sparkles,
  BarChart3, Search,
  Menu, X, LogOut, ChevronDown, ExternalLink, FileSignature, CalendarClock, UserCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBrokerSlug } from '@/lib/brokerHost';
import { CrmCommandPalette } from './CrmCommandPalette';
import { useDialogBehavior } from './useDialogBehavior';
import { FOCUS_RING, isMac } from '@/pages/crm/crmHelpers';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/crm' },
  { label: 'Clienți', icon: Users, to: '/crm/clienti' },
  { label: 'Acorduri', icon: FileSignature, to: '/crm/acorduri' },
  { label: 'Dosare', icon: FolderKanban, to: '/crm/dosare' },
  { label: 'Lead-uri', icon: Sparkles, to: '/crm/leaduri' },
  { label: 'Programări', icon: CalendarClock, to: '/crm/programari' },
  { label: 'Rapoarte', icon: BarChart3, to: '/crm/rapoarte' },
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
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/crm'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMobileOpen(false);
  }
  const closeDrawer = useCallback(() => setMobileOpen(false), []);
  useDialogBehavior(mobileOpen, drawerRef, closeDrawer);
  const mac = isMac();
  const { user, logout, isSuperAdmin, isBroker } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setMobileOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setUserMenuOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
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
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-hidden="true" onClick={() => setMobileOpen(false)} />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Meniu"
            tabIndex={-1}
            className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden ${FOCUS_RING}`}
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            className={`rounded-lg p-1 text-slate-600 lg:hidden ${FOCUS_RING}`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Meniu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Caută în CRM"
            aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}
            className={`relative hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-2.5 text-sm hover:border-slate-300 hover:bg-white sm:flex ${FOCUS_RING}`}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <span className="flex-1 text-left text-slate-400">Caută clienți, dosare...</span>
            <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">{mac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>

          <div className="flex flex-1 sm:flex-none items-center justify-end gap-1.5">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Caută"
              className={`rounded-xl p-2 text-slate-600 hover:bg-slate-100 sm:hidden ${FOCUS_RING}`}
            >
              <Search className="h-5 w-5" />
            </button>
            {/* User menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                className={`flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 hover:bg-slate-100 ${FOCUS_RING} ${userMenuOpen ? 'bg-slate-100' : ''}`}
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
                        className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}
                      >
                        <ExternalLink className="h-4 w-4 text-slate-400" /> Panou admin
                      </button>
                    )}
                    {isBroker && (
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate('/crm/profil'); }}
                        className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}
                      >
                        <UserCircle className="h-4 w-4 text-slate-400" /> Profilul meu
                      </button>
                    )}
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 ${FOCUS_RING}`}
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
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      <CrmCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
