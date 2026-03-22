import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading, login, loginWithToken, logout, setUser } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    loginWithToken,
    logout,
    setUser,
    isAdmin: user?.role === 'Admin' || user?.role === 'Administrator',
  };
};
