import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  skipOnboardingCheck?: boolean;
}

export function ProtectedRoute({ children, adminOnly, skipOnboardingCheck }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin users go to admin panel, not user dashboard
  if (isAdmin && !adminOnly && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  // No longer force redirect to onboarding — users can access the app
  // and will see verification prompts inside the dashboard

  return <>{children}</>;
}
