import { Outlet, Navigate } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';

export function GuestLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="w-full max-w-[440px]">
        <Outlet />
      </div>
      <p className="mt-8 text-xs text-light-50">
        &copy; {new Date().getFullYear()} MoneyShop. Toate drepturile rezervate.
      </p>
    </div>
  );
}
