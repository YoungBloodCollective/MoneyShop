import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { otpApi } from '@/services/api/otpApi';
import { useAuth } from '@/hooks/useAuth';

export default function VerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken } = useAuth();
  const state = location.state as { email?: string; phone?: string } | null;

  const [step, setStep] = useState<'email' | 'phone' | 'done'>('email');
  const [code, setCode] = useState('');
  const [otpId, setOtpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const sendEmailOtp = async () => {
    setLoading(true);
    try {
      const res = await otpApi.requestOtp({
        phone: state?.email || '',
        purpose: 'EMAIL_VERIFY',
        channel: 'email',
      });
      setOtpId(res.otpId);
      toast.success('Cod trimis pe email');
    } catch {
      toast.error('Eroare la trimiterea codului');
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!state?.phone) { setStep('done'); return; }
    setOtpId('');
    setCode('');
    setLoading(true);
    try {
      const res = await otpApi.requestOtp({ phone: state.phone, purpose: 'PHONE_VERIFY', channel: 'sms' });
      setOtpId(res.otpId);
      toast.success('Cod trimis pe telefon');
    } catch {
      toast.error('Eroare la trimiterea codului');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) { toast.error('Introdu codul'); return; }
    setLoading(true);
    try {
      const purpose = step === 'email' ? 'EMAIL_VERIFY' : 'PHONE_VERIFY';
      const phone = step === 'email' ? (state?.email || '') : (state?.phone || '');
      const res = await otpApi.verifyOtp({ otpId, code, phone, purpose });

      if (step === 'email') {
        setEmailVerified(true);
        setCode('');
        if (state?.phone) {
          setStep('phone');
          toast.success('Email verificat! Acum verifica telefonul.');
          sendPhoneOtp();
        } else {
          setStep('done');
          if (res.accessToken && res.user) {
            loginWithToken(res.accessToken!, { ...res.user!, kycStatus: 'none' } as Parameters<typeof loginWithToken>[1]);
          }
          toast.success('Verificare completa!');
        }
      } else {
        setStep('done');
        if (res.accessToken && res.user) {
          loginWithToken(res.accessToken!, { ...res.user!, kycStatus: 'none' } as Parameters<typeof loginWithToken>[1]);
        }
        toast.success('Verificare completa!');
      }
    } catch {
      toast.error('Cod invalid sau expirat');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-500/15 flex items-center justify-center">
          <CheckCircle size={32} className="text-success-500" />
        </div>
        <h1 className="text-2xl font-bold text-light-100 mb-2">Cont verificat!</h1>
        <p className="text-sm text-light-60 mb-6">Acum poti accesa toate functiile MoneyShop.</p>
        <button
          onClick={() => navigate('/auth/login')}
          className="px-8 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors"
        >
          Autentifica-te
        </button>
      </div>
    );
  }

  return (
    <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className={`flex items-center gap-2 text-sm ${emailVerified ? 'text-success-500' : step === 'email' ? 'text-brand-primary' : 'text-light-50'}`}>
          <Mail size={16} /> Email {emailVerified && <CheckCircle size={14} />}
        </div>
        {state?.phone && (
          <div className={`flex items-center gap-2 text-sm ${step === 'phone' ? 'text-brand-primary' : 'text-light-50'}`}>
            <Phone size={16} /> Telefon
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-light-100 mb-2">
        Verifica {step === 'email' ? 'email-ul' : 'telefonul'}
      </h1>
      <p className="text-sm text-light-60 mb-6">
        Introdu codul trimis pe {step === 'email' ? state?.email : state?.phone}
      </p>

      {!otpId ? (
        <button
          onClick={step === 'email' ? sendEmailOtp : sendPhoneOtp}
          disabled={loading}
          className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Se trimite...' : 'Trimite codul'}
        </button>
      ) : (
        <form onSubmit={verifyCode} className="space-y-5">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Se verifica...' : 'Verifica codul'}
          </button>
        </form>
      )}
    </div>
  );
}
