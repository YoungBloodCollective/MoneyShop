import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, setUser } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    setUser,
    isAdmin: user?.role === 'Admin',
  };
};
