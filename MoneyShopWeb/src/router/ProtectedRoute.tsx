import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  brokerOnly?: boolean;
  skipOnboardingCheck?: boolean;
}

export function ProtectedRoute({ children, adminOnly, superAdminOnly, brokerOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isSuperAdmin, isBroker } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if ((adminOnly || superAdminOnly || brokerOnly) && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if ((superAdminOnly && !isSuperAdmin) || (brokerOnly && !isBroker)) {
    return <Navigate to="/admin" replace />;
  }

  // Admin users go to admin panel, not user dashboard
  if (isAdmin && !(adminOnly || superAdminOnly || brokerOnly) && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  // No longer force redirect to onboarding — users can access the app
  // and will see verification prompts inside the dashboard

  return <>{children}</>;
}
