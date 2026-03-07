import { Menu, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/shared/Logo';

interface HeaderProps {
  onToggleSidebar?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onToggleSidebar, showMenuButton }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-4 lg:px-6 bg-dark-900 border-b border-dark-400">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-light-70 hover:bg-dark-600 hover:text-light-90 transition-colors lg:hidden"
          >
            <Menu size={22} />
          </button>
        )}
        <div className="lg:hidden">
          <Logo size="sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-light-60 hover:bg-dark-600 hover:text-light-90 transition-colors relative">
          <Bell size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-dark-400">
          <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm text-light-80">{user?.name}</span>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-lg text-light-60 hover:bg-error-500/10 hover:text-error-400 transition-colors"
          title="Deconectare"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
