import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api/authApi';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const loginWithToken = useAuthStore(s => s.loginWithToken);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptGdpr: false,
    acceptCosts: false,
    mandateAnaf: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password) {
      toast.error('Completeaza toate campurile obligatorii');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Parolele nu coincid');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Parola trebuie sa aiba minim 8 caractere');
      return;
    }
    if (!form.acceptTerms || !form.acceptGdpr || !form.acceptCosts || !form.mandateAnaf) {
      toast.error('Trebuie sa accepti toate acordurile obligatorii');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        acceptTerms: true,
        acceptGdpr: true,
        acceptCosts: true,
        mandateAnaf: true,
        ipAddress: '',
        userAgent: navigator.userAgent,
        deviceHash: btoa(navigator.userAgent).slice(0, 32),
      });
      // Auto-login with token from registration response
      loginWithToken(res.token, res.user);
      toast.success('Cont creat! Continua cu verificarea.');
      navigate('/onboarding');
    } catch (err: unknown) {
      let msg = 'Eroare la inregistrare';
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
        if (data) {
          if (typeof data.message === 'string') {
            msg = data.message;
          } else if (data.errors && typeof data.errors === 'object') {
            const firstMsg = Object.values(data.errors as Record<string, string[]>)
              .flat()
              .find(m => typeof m === 'string' && !m.includes('$.'));
            msg = firstMsg || (typeof data.title === 'string' ? data.title : msg);
          }
        }
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-light-100 mb-2">Creeaza cont</h1>
      <p className="text-sm text-light-60 mb-8">Incepe sa compari ofertele bancilor</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-70 mb-1.5">Prenume *</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
              <input
                type="text"
                value={form.firstName}
                onChange={e => update('firstName', e.target.value)}
                placeholder="Ion"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-light-70 mb-1.5">Nume *</label>
            <input
              type="text"
              value={form.lastName}
              onChange={e => update('lastName', e.target.value)}
              placeholder="Popescu"
              className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Email *</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="email@exemplu.ro"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Telefon *</label>
          <div className="relative">
            <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Parola *</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => update('password', e.target.value)}
              placeholder="Minim 8 caractere"
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

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Confirma parola *</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              placeholder="Repeta parola"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Consents */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-light-60 uppercase tracking-wider">Acorduri obligatorii</p>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={e => update('acceptTerms', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-dark-400 bg-dark-600 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm text-light-80">
              Accept <Link to="/profile/legal/terms" target="_blank" className="text-brand-primary hover:underline">Termenii si Conditiile</Link> *
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptGdpr}
              onChange={e => update('acceptGdpr', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-dark-400 bg-dark-600 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm text-light-80">
              Accept <Link to="/profile/legal/privacy" target="_blank" className="text-brand-primary hover:underline">Politica GDPR</Link> *
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptCosts}
              onChange={e => update('acceptCosts', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-dark-400 bg-dark-600 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm text-light-80">Accept informatiile despre costuri *</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.mandateAnaf}
              onChange={e => update('mandateAnaf', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-dark-400 bg-dark-600 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm text-light-80">Acord mandat ANAF *</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? 'Se creeaza contul...' : 'Creeaza cont'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-light-60">
        Ai deja cont?{' '}
        <Link to="/auth/login" className="text-brand-primary font-medium hover:underline">
          Autentifica-te
        </Link>
      </p>
    </div>
  );
}
