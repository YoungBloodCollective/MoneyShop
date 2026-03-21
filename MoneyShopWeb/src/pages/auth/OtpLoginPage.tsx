import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { otpApi } from '@/services/api/otpApi';
import { useAuth } from '@/hooks/useAuth';

export default function OtpLoginPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [phone, setPhone] = useState('');
  const [otpId, setOtpId] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) { toast.error('Introdu numarul de telefon'); return; }
    setLoading(true);
    try {
      const res = await otpApi.requestOtp({ phone, purpose: 'LOGIN_SMS' });
      setOtpId(res.otpId);
      setStep('code');
      toast.success('Codul a fost trimis prin SMS');
    } catch {
      toast.error('Eroare la trimiterea codului');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) { toast.error('Introdu codul primit'); return; }
    setLoading(true);
    try {
      const res = await otpApi.verifyOtp({ otpId, code, phone, purpose: 'LOGIN_SMS' });
      if (res.accessToken && res.user) {
        loginWithToken(res.accessToken!, { ...res.user!, kycStatus: 'none' } as Parameters<typeof loginWithToken>[1]);
        toast.success('Autentificare reusita!');
        navigate('/dashboard');
      } else {
        toast.error(res.message || 'Cod invalid');
      }
    } catch {
      toast.error('Cod invalid sau expirat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
      <h1 className="text-2xl font-medium text-light-100 mb-2">Login cu SMS</h1>
      <p className="text-sm text-light-60 mb-8">
        {step === 'phone' ? 'Introdu numarul de telefon' : 'Introdu codul primit prin SMS'}
      </p>

      {step === 'phone' ? (
        <form onSubmit={requestOtp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-light-70 mb-1.5">Telefon</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25"
          >
            {loading ? 'Se trimite...' : 'Trimite codul SMS'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-light-70 mb-1.5">Cod OTP</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25"
          >
            {loading ? 'Se verifica...' : 'Verifica codul'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('phone'); setCode(''); }}
            className="w-full text-sm text-light-60 hover:text-light-80"
          >
            Schimba numarul de telefon
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-light-60">
        <Link to="/auth/login" className="text-brand-primary font-medium hover:underline">
          Login cu email si parola
        </Link>
      </p>
    </div>
  );
}
