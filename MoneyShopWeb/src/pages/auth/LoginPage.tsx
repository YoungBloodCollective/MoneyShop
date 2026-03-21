import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { isConfigured } from '@/services/firebase/config';
import { signInWithGoogle, signInWithApple } from '@/services/firebase/authHelpers';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const result = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      loginWithToken(result.token, { ...result.user, id: Number(result.user.id), role: result.user.role || 'User', kycStatus: (result.user.kycStatus as 'none' | 'pending' | 'verified' | 'rejected') || 'none', emailVerified: result.user.emailVerified ?? false, phoneVerified: result.user.phoneVerified ?? false });
      toast.success('Autentificare reusita!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la autentificare';
      if (!msg.includes('popup-closed')) {
        toast.error(msg);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Completeaza email si parola');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Autentificare reusita!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(msg || 'Email sau parola incorecte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
      <h1 className="text-2xl font-medium text-light-100 mb-2">Bine ai revenit</h1>
      <p className="text-sm text-light-60 mb-8">Autentifica-te pentru a continua</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplu.ro"
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Parola</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Parola ta"
              className="w-full h-12 pl-11 pr-11 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-light-50 hover:text-light-80"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link to="/auth/forgot-password" className="text-sm text-brand-primary hover:underline">
            Am uitat parola
          </Link>
          <Link to="/auth/otp-login" className="text-sm text-brand-secondary hover:underline">
            Login cu SMS
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-brand-primary text-white font-medium hover:bg-brand-deep-purple disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Se autentifica...' : 'Autentificare'}
        </button>
      </form>

      {/* Social login */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-dark-600" />
          <span className="text-xs text-light-50">sau continua cu</span>
          <div className="flex-1 h-px bg-dark-600" />
        </div>

        <div className="flex gap-3">
          {isConfigured ? (
            <>
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading}
                className="flex-1 h-12 rounded-full bg-white border border-gray-200 text-gray-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {socialLoading === 'google' ? 'Se conecteaza...' : 'Google'}
              </button>
              <button
                onClick={() => handleSocialLogin('apple')}
                disabled={!!socialLoading}
                className="flex-1 h-12 rounded-full bg-black text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg width="16" height="18" viewBox="0 0 17 20" fill="white"><path d="M12.15 0c.17 1.26-.37 2.52-1.12 3.42-.77.91-1.96 1.6-3.15 1.5-.2-1.22.44-2.5 1.14-3.3C9.74.73 11.01.05 12.15 0zM16.54 14.7c-.42.97-.62 1.4-1.16 2.26-.76 1.2-1.83 2.7-3.16 2.71-1.18.01-1.48-.77-3.08-.76-1.6.01-1.93.78-3.12.77-1.33-.01-2.34-1.36-3.1-2.56C1.16 14.28.65 10.73 2.09 8.58c1.01-1.51 2.6-2.4 4.08-2.4 1.52 0 2.47.78 3.72.78 1.22 0 1.96-.78 3.72-.78.64 0 2.44.24 3.6 1.85-.1.06-2.15 1.25-2.12 3.74.03 2.97 2.61 3.96 2.64 3.97-.02.06-.41 1.42-1.19 2.96z"/></svg>
                {socialLoading === 'apple' ? 'Se conecteaza...' : 'Apple'}
              </button>
            </>
          ) : (
            <div className="flex-1 text-center py-3 rounded-full border border-dark-600 text-light-50 text-sm">
              Autentificare sociala — in curand
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-light-60">
        Nu ai cont?{' '}
        <Link to="/auth/register" className="text-brand-primary font-medium hover:underline">
          Creeaza cont
        </Link>
      </p>
    </div>
  );
}
