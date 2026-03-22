import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Check, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api/authApi';
import { useAuthStore } from '@/store/authStore';
import { isConfigured } from '@/services/firebase/config';
import { signInWithGoogle } from '@/services/firebase/authHelpers';

const STEPS = [
  { label: 'Date personale', key: 'personal' },
  { label: 'Securitate', key: 'security' },
  { label: 'Acorduri', key: 'consents' },
] as const;

const CONSENT_EXPLANATIONS: Record<string, string> = {
  acceptTerms: 'Accepti regulile de utilizare ale platformei MoneyShop',
  acceptGdpr: 'Datele tale sunt protejate conform legislatiei europene',
  acceptCosts: 'Serviciile MoneyShop sunt 100% gratuite pentru tine',
  mandateAnaf: 'Ne permiti sa verificam automat veniturile tale la ANAF pentru a-ti oferi cele mai bune oferte',
};

function getPasswordStrength(password: string): { level: 'weak' | 'medium' | 'strong'; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { level: 'weak', score };
  if (score <= 4) return { level: 'medium', score };
  return { level: 'strong', score };
}

const strengthColors = { weak: 'bg-red-500', medium: 'bg-yellow-500', strong: 'bg-green-500' };
const strengthLabels = { weak: 'Slaba', medium: 'Medie', strong: 'Puternica' };

export default function RegisterPage() {
  const navigate = useNavigate();
  const loginWithToken = useAuthStore(s => s.loginWithToken);
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);
  const [step, setStep] = useState(0);
  const [expandedConsent, setExpandedConsent] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(provider);
    try {
      const result = await signInWithGoogle();
      loginWithToken(result.token, { ...result.user, id: Number(result.user.id), role: result.user.role || 'User', kycStatus: (result.user.kycStatus as 'none' | 'pending' | 'verified' | 'rejected') || 'none', emailVerified: result.user.emailVerified ?? false, phoneVerified: result.user.phoneVerified ?? false });
      toast.success('Cont creat cu succes!');
      navigate('/onboarding');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la autentificare';
      if (!msg.includes('popup-closed')) {
        toast.error(msg);
      }
    } finally {
      setSocialLoading(null);
    }
  };

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

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const hasMinLength = form.password.length >= 8;
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const allConsentsChecked = form.acceptTerms && form.acceptGdpr && form.acceptCosts && form.mandateAnaf;

  const toggleAllConsents = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      acceptTerms: checked,
      acceptGdpr: checked,
      acceptCosts: checked,
      mandateAnaf: checked,
    }));
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!form.firstName || !form.lastName || !form.email || !form.phone) {
        toast.error('Completeaza toate campurile obligatorii');
        return false;
      }
      return true;
    }
    if (s === 1) {
      if (!form.password) {
        toast.error('Introdu o parola');
        return false;
      }
      if (form.password.length < 8) {
        toast.error('Parola trebuie sa aiba minim 8 caractere');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Parolele nu coincid');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

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
    <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
      <h1 className="text-2xl font-medium text-light-100 mb-2">Creeaza cont</h1>
      <p className="text-sm text-light-60 mb-6">Incepe sa compari ofertele bancilor</p>
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex items-center gap-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-brand-primary' : 'bg-dark-600'
                }`}
              />
            </div>
            <span
              className={`text-xs font-medium transition-colors ${
                i <= step ? 'text-brand-primary' : 'text-light-50'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {step === 0 && (
        <>
          <div className="mb-6">
            <div className="flex gap-3">
              {isConfigured ? (
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    disabled={!!socialLoading}
                    className="flex-1 h-12 rounded-full bg-white border border-gray-200 text-gray-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    {socialLoading === 'google' ? 'Se conecteaza...' : 'Google'}
                  </button>
              ) : (
                <div className="flex-1 text-center py-3 rounded-full border border-dark-600 text-light-50 text-sm">
                  Autentificare sociala — in curand
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-px bg-dark-600" />
              <span className="text-xs text-light-50">sau cu email</span>
              <div className="flex-1 h-px bg-dark-600" />
            </div>
          </div>
          <div className="space-y-4">
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
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
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
                  className="w-full h-12 px-4 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
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
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
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
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-70 mb-1.5">Parola *</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                placeholder="Minim 8 caractere"
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
            {form.password.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-dark-600 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${strengthColors[passwordStrength.level]}`}
                      style={{ width: `${Math.min((passwordStrength.score / 6) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.level === 'weak' ? 'text-red-500' :
                    passwordStrength.level === 'medium' ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {strengthLabels[passwordStrength.level]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={14} className={hasMinLength ? 'text-green-500' : 'text-light-50'} />
                  <span className={`text-xs ${hasMinLength ? 'text-green-500' : 'text-light-50'}`}>
                    Minim 8 caractere
                  </span>
                </div>
              </div>
            )}
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
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
            {form.confirmPassword.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Check size={14} className={passwordsMatch ? 'text-green-500' : 'text-red-500'} />
                <span className={`text-xs ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                  {passwordsMatch ? 'Parolele coincid' : 'Parolele nu coincid'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer pb-3 border-b border-dark-600">
            <input
              type="checkbox"
              checked={allConsentsChecked}
              onChange={e => toggleAllConsents(e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm font-semibold text-light-90">Selecteaza toate</span>
          </label>
          {([
            { field: 'acceptTerms', label: <>Accept <Link to="/legal" target="_blank" className="text-brand-primary hover:underline">Termenii si Conditiile</Link> *</> },
            { field: 'acceptGdpr', label: <>Accept <Link to="/legal" target="_blank" className="text-brand-primary hover:underline">Politica GDPR</Link> *</> },
            { field: 'acceptCosts', label: <>Accept informatiile despre costuri *</> },
            { field: 'mandateAnaf', label: <>Acord mandat ANAF *</> },
          ] as const).map(({ field, label }) => (
            <div key={field} className="space-y-1">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={form[field] as boolean}
                  onChange={e => update(field, e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-dark-600 bg-dark-800 text-brand-primary focus:ring-brand-primary"
                />
                <div className="flex-1">
                  <label className="text-sm text-light-80 cursor-pointer">{label}</label>
                  <button
                    type="button"
                    onClick={() => setExpandedConsent(expandedConsent === field ? null : field)}
                    className="flex items-center gap-1 text-xs text-brand-primary hover:underline mt-0.5"
                  >
                    Ce inseamna asta?
                    {expandedConsent === field ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expandedConsent === field && (
                    <p className="text-xs text-light-60 mt-1 pl-0.5">
                      {CONSENT_EXPLANATIONS[field]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 h-12 rounded-full border border-dark-600 text-light-80 font-medium hover:bg-dark-800 transition-all"
          >
            Inapoi
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25"
          >
            Continua
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={loading}
            className="flex-1 h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25"
          >
            {loading ? 'Se creeaza contul...' : 'Creeaza cont'}
          </button>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-light-60">
        Ai deja cont?{' '}
        <Link to="/auth/login" className="text-brand-primary font-medium hover:underline">
          Autentifica-te
        </Link>
      </p>
    </div>
  );
}
