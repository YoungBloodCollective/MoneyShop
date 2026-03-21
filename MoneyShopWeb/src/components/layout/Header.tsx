import { Menu, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/shared/Logo';

interface HeaderProps {
  onToggleSidebar?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onToggleSidebar, showMenuButton }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between h-16 px-4 lg:px-6 bg-dark-700 border-b border-dark-600">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onToggleSidebar}
            aria-label="Deschide meniu"
            className="p-2 rounded-xl text-light-70 hover:bg-dark-600 hover:text-light-90 transition-colors lg:hidden"
          >
            <Menu size={22} />
          </button>
        )}
        <div className="lg:hidden">
          <Logo size="sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/profile/notifications')}
          className="p-2 rounded-xl text-light-60 hover:bg-dark-600 hover:text-light-90 transition-colors relative"
          title="Notificari"
          aria-label="Notificari"
        >
          <Bell size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-dark-600">
          <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-light-80">{user?.name}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 p-2 rounded-xl text-light-60 hover:bg-error-500/10 hover:text-error-400 transition-colors"
          title="Deconectare"
          aria-label="Deconectare"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline text-sm font-medium">Iesire</span>
        </button>
      </div>
    </header>
  );
}
