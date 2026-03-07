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

  // Redirect to onboarding if registration is incomplete
  if (!skipOnboardingCheck && user) {
    const onboardingComplete = user.emailVerified && user.phoneVerified && user.kycStatus === 'verified';
    if (!onboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}
