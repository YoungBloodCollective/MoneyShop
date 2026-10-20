import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading, login, loginWithToken, logout, setUser } = useAuthStore();
  const isSuperAdmin = user?.role === 'Admin' || user?.role === 'Administrator';
  const isBroker = user?.role === 'Broker';

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    loginWithToken,
    logout,
    setUser,
    isSuperAdmin,
    isBroker,
    isAdmin: isSuperAdmin || isBroker,
  };
};
