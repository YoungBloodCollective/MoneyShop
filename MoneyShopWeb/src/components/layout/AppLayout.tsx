import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { useIsDesktop } from '@/hooks/useMediaQuery';

export function AppLayout() {
  const isDesktop = useIsDesktop();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      {/* Desktop sidebar */}
      {isDesktop && <Sidebar />}

      {/* Mobile sidebar overlay */}
      {!isDesktop && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          showMenuButton={!isDesktop}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {!isDesktop && <MobileNav />}

      {/* Floating chat widget */}
      <ChatWidget />
    </div>
  );
}
