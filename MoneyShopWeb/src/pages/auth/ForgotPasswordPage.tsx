import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Introdu adresa de email'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Instructiunile au fost trimise pe email');
    } catch {
      toast.error('Eroare. Verifica adresa de email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
      <Link to="/auth/login" className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80 mb-6">
        <ArrowLeft size={16} /> Inapoi la autentificare
      </Link>

      <h1 className="text-2xl font-medium text-light-100 mb-2">Resetare parola</h1>
      <p className="text-sm text-light-60 mb-8">Introdu email-ul pentru a primi link-ul de resetare</p>

      {sent ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-500/15 flex items-center justify-center">
            <Mail size={28} className="text-success-500" />
          </div>
          <p className="text-light-80 mb-2">Email trimis!</p>
          <p className="text-sm text-light-60">Verifica inbox-ul (si spam) pentru instructiuni de resetare.</p>
        </div>
      ) : (
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
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25"
          >
            {loading ? 'Se trimite...' : 'Trimite link de resetare'}
          </button>
        </form>
      )}
    </div>
  );
}
