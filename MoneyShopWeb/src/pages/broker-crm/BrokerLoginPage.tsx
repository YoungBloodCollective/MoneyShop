import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useBrokerAuthStore } from '@/store/brokerAuthStore';
import toast from 'react-hot-toast';

export default function BrokerLoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useBrokerAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Bine ai venit!');
      navigate('/broker/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Email sau parola incorecte.';
      toast.error(msg);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MoneyShop CRM</h1>
          <p className="text-gray-500 mt-1 text-sm">Autentificare cont broker</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="email@exemplu.ro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Parola</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent pr-11"
                  placeholder="Parola"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Se incarca...' : 'Autentificare'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Nu ai cont?{' '}
            <Link to="/broker/register" className="text-brand-primary font-medium hover:underline">
              Inregistreaza-te gratuit
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/" className="hover:underline">← Inapoi la site</Link>
        </p>
      </div>
    </div>
  );
}
