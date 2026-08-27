import { Navigate, useLocation } from 'react-router-dom';
import { useBrokerAuthStore } from '@/store/brokerAuthStore';
import { useEffect, useRef } from 'react';

interface BrokerProtectedRouteProps {
  children: React.ReactNode;
}

export function BrokerProtectedRoute({ children }: BrokerProtectedRouteProps) {
  const { isBrokerAuthenticated, isLoading, checkAuth } = useBrokerAuthStore();
  const location = useLocation();
  const checked = useRef(false);

  useEffect(() => {
    if (!checked.current) {
      checked.current = true;
      checkAuth();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isBrokerAuthenticated) {
    return <Navigate to="/broker/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
