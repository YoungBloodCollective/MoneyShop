import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-light-100 mb-2">Bine ai revenit</h1>
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
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
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
              className="w-full h-12 pl-11 pr-11 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
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
          className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Se autentifica...' : 'Autentificare'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-light-60">
        Nu ai cont?{' '}
        <Link to="/auth/register" className="text-brand-primary font-medium hover:underline">
          Creeaza cont
        </Link>
      </p>
    </div>
  );
}
