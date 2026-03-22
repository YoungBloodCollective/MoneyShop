import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Camera, CheckCircle, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api/authApi';
import { kycApi } from '@/services/api/kycApi';
import { useAuthStore } from '@/store/authStore';
import { useIsDesktop } from '@/hooks/useMediaQuery';

type Step = 'email' | 'phone' | 'kyc' | 'done';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);

  // Determine initial step based on user verification status
  const getInitialStep = useCallback((): Step => {
    if (!user) return 'email';
    if (!user.emailVerified) return 'email';
    if (!user.phoneVerified) return 'phone';
    if (user.kycStatus !== 'verified') return 'kyc';
    return 'done';
  }, [user]);

  const [step, setStep] = useState<Step>(getInitialStep);
  const [otpId, setOtpId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [kycToken, setKycToken] = useState('');
  const [kycQrUrl, setKycQrUrl] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Redirect to dashboard if already completed
  useEffect(() => {
    if (user?.emailVerified && user?.phoneVerified && user?.kycStatus === 'verified') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // On mount: if at KYC step, check if KYC was completed (e.g. user returning from mobile scan page)
  useEffect(() => {
    if (step === 'kyc') {
      kycApi.getStatus().then(status => {
        if (status.status === 'verified') {
          if (user) setUser({ ...user, kycStatus: 'verified' });
          setStep('done');
          toast.success('KYC verificat cu succes!');
        }
      }).catch(() => { /* ignore - status check failed, proceed normally */ });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Email Verification ──

  const sendEmailOtp = async () => {
    setLoading(true);
    try {
      const res = await authApi.sendEmailVerification(user?.email);
      setOtpId(res.otpId);
      toast.success('Cod trimis pe email');
    } catch {
      toast.error('Eroare la trimiterea codului');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) { toast.error('Introdu codul'); return; }
    setLoading(true);
    try {
      await authApi.verifyEmail(otpId, code, user?.email);
      if (user) setUser({ ...user, emailVerified: true });
      setOtpId('');
      setCode('');
      setStep('phone');
      toast.success('Email verificat!');
    } catch {
      toast.error('Cod invalid sau expirat');
    } finally {
      setLoading(false);
    }
  };

  // ── Phone Verification ──

  const sendPhoneOtp = async () => {
    const phone = phoneInput || user?.phone;
    if (!phone || phone.length < 10) { toast.error('Introdu un numar de telefon valid'); return; }
    setLoading(true);
    try {
      const res = await authApi.sendPhoneVerification(phone);
      setOtpId(res.otpId);
      if (user) setUser({ ...user, phone });
      toast.success('Cod trimis pe telefon');
    } catch {
      toast.error('Eroare la trimiterea codului');
    } finally {
      setLoading(false);
    }
  };

  const verifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) { toast.error('Introdu codul'); return; }
    setLoading(true);
    try {
      await authApi.verifyPhone(otpId, code, user?.phone);
      if (user) setUser({ ...user, phoneVerified: true });
      setOtpId('');
      setCode('');
      setStep('kyc');
      toast.success('Telefon verificat!');
    } catch {
      toast.error('Cod invalid sau expirat');
    } finally {
      setLoading(false);
    }
  };

  // ── KYC ──

  const startKyc = async () => {
    setLoading(true);
    try {
      const res = await kycApi.startScanSession();
      if (res.status === 'already_verified') {
        if (user) setUser({ ...user, kycStatus: 'verified' });
        setStep('done');
        toast.success('KYC deja verificat!');
        return;
      }

      // Mobile: navigate directly to the scan page (skip QR)
      if (!isDesktop) {
        navigate(`/kyc/scan/${res.accessToken}?returnTo=/onboarding`);
        return;
      }

      // Desktop: show QR code + poll for completion
      setKycToken(res.accessToken);
      setKycQrUrl(`${window.location.origin}/kyc/scan/${res.accessToken}?returnTo=/onboarding`);
      setKycStatus('pending');
      pollRef.current = setInterval(async () => {
        try {
          const status = await kycApi.getScanStatus(res.accessToken);
          setKycStatus(status.status);
          if (status.status === 'verified') {
            clearInterval(pollRef.current);
            if (user) setUser({ ...user, kycStatus: 'verified' });
            setStep('done');
            toast.success('KYC verificat cu succes!');
          } else if (status.status === 'rejected') {
            clearInterval(pollRef.current);
            toast.error(status.rejectionReason || 'KYC respins');
          }
        } catch { /* ignore polling errors */ }
      }, 5000);
    } catch {
      toast.error('Eroare la initierea KYC');
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = kycQrUrl;

  // ── Step indicators ──
  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'email', label: 'Email', icon: <Mail size={16} /> },
    { key: 'phone', label: 'Telefon', icon: <Phone size={16} /> },
    { key: 'kyc', label: 'Identitate', icon: <Shield size={16} /> },
    { key: 'done', label: 'Finalizat', icon: <CheckCircle size={16} /> },
  ];

  const stepOrder: Step[] = ['email', 'phone', 'kyc', 'done'];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                i < currentIdx ? 'text-success-500' :
                i === currentIdx ? 'text-brand-primary' : 'text-light-40'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  i < currentIdx ? 'bg-success-500 text-white' :
                  i === currentIdx ? 'bg-brand-primary/15 ring-2 ring-brand-primary' : 'bg-dark-600'
                }`}>
                  {i < currentIdx ? <CheckCircle size={14} className="text-white" /> : s.icon}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 sm:w-12 h-px mx-1 ${i < currentIdx ? 'bg-success-500' : 'bg-dark-400'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/')} className="text-sm text-light-50 hover:text-light-70 flex items-center gap-1 transition-colors">
            ← Inapoi la pagina principala
          </button>
        </div>

        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8">
          {/* ── Email Step ── */}
          {step === 'email' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <Mail size={20} className="text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-light-100">Verifica email-ul</h1>
                  <p className="text-sm text-light-60">{user?.email}</p>
                </div>
              </div>

              {!otpId ? (
                <button onClick={sendEmailOtp} disabled={loading}
                  className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25">
                  {loading ? 'Se trimite...' : 'Trimite codul'}
                </button>
              ) : (
                <form onSubmit={verifyEmail} className="space-y-4">
                  <input type="text" value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" maxLength={6}
                    className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none" />
                  <button type="submit" disabled={loading}
                    className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25">
                    {loading ? 'Se verifica...' : 'Verifica codul'}
                  </button>
                </form>
              )}
              <div className="mt-4 text-center">
                <button onClick={() => navigate('/dashboard')} className="text-sm text-light-50 hover:text-light-70 underline">
                  Finalizeaza mai tarziu
                </button>
              </div>
            </>
          )}

          {/* ── Phone Step ── */}
          {step === 'phone' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <Phone size={20} className="text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-light-100">Verifica telefonul</h1>
                  <p className="text-sm text-light-60">{user?.phone || 'Introdu numarul de telefon'}</p>
                </div>
              </div>

              {!otpId ? (
                <div className="space-y-3">
                  {!user?.phone && (
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                      placeholder="07XXXXXXXX"
                      className="w-full h-12 rounded-xl bg-dark-600 border border-dark-400 text-light-90 px-4 text-base placeholder:text-light-50 focus:border-brand-primary focus:outline-none"
                    />
                  )}
                  <button onClick={sendPhoneOtp} disabled={loading || (!user?.phone && phoneInput.length < 10)}
                    className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25">
                    {loading ? 'Se trimite...' : 'Trimite codul SMS'}
                  </button>
                </div>
              ) : (
                <form onSubmit={verifyPhone} className="space-y-4">
                  <input type="text" value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" maxLength={6}
                    className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none" />
                  <button type="submit" disabled={loading}
                    className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25">
                    {loading ? 'Se verifica...' : 'Verifica codul'}
                  </button>
                </form>
              )}
              <div className="mt-4 text-center">
                <button onClick={() => navigate('/dashboard')} className="text-sm text-light-50 hover:text-light-70 underline">
                  Finalizeaza mai tarziu
                </button>
              </div>
            </>
          )}

          {/* ── KYC Step ── */}
          {step === 'kyc' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <Shield size={20} className="text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-light-100">Verificare identitate</h1>
                  <p className="text-sm text-light-60">
                    {isDesktop ? 'Scaneaza codul QR cu telefonul' : 'Fotografiaza actul de identitate'}
                  </p>
                </div>
              </div>

              {!kycToken ? (
                <div className="space-y-4">
                  <p className="text-sm text-light-70">
                    {isDesktop
                      ? 'Vei primi un cod QR pe care il scanezi cu telefonul mobil. Pe telefon vei fotografia actul de identitate si vei face un selfie.'
                      : 'Vei fotografia actul de identitate si vei face un selfie pentru verificarea identitatii.'
                    }
                  </p>
                  <button onClick={startKyc} disabled={loading}
                    className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25 flex items-center justify-center gap-2">
                    {loading ? 'Se initializeaza...' : (
                      <>
                        {!isDesktop && <Camera size={18} />}
                        {isDesktop ? 'Incepe verificarea' : 'Deschide camera'}
                      </>
                    )}
                  </button>
                  <div className="mt-4 text-center">
                    <button onClick={() => navigate('/dashboard')} className="text-sm text-light-50 hover:text-light-70 underline">
                      Finalizeaza mai tarziu
                    </button>
                  </div>
                </div>
              ) : (
                /* Desktop only: QR code + polling (mobile navigates away) */
                <div className="space-y-5 text-center">
                  <div className="bg-white p-4 rounded-xl inline-block mx-auto">
                    <QRCodeSVG value={qrUrl} size={200} level="M" />
                  </div>

                  <div className="flex flex-col gap-3 text-left">
                    {[
                      'Deschide camera telefonului',
                      'Scaneaza codul QR',
                      'Urmeaza instructiunile pe telefon',
                    ].map((text, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm text-light-70">{text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-light-50">
                      {kycStatus === 'pending'
                        ? 'Se asteapta finalizarea verificarii...'
                        : kycStatus === 'rejected'
                        ? 'Verificarea a fost respinsa. Incearca din nou.'
                        : 'Pregatit pentru scanare'}
                    </p>
                  </div>

                  {kycStatus === 'pending' && (
                    <div className="flex items-center justify-center gap-2 text-brand-primary">
                      <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Se asteapta...</span>
                    </div>
                  )}

                  {kycStatus === 'rejected' && (
                    <button onClick={() => { setKycToken(''); setKycStatus(''); startKyc(); }}
                      className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25">
                      Reincearca verificarea
                    </button>
                  )}

                  <div className="mt-2">
                    <button onClick={() => navigate('/dashboard')} className="text-sm text-light-50 hover:text-light-70 underline">
                      Finalizeaza mai tarziu
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Done Step ── */}
          {step === 'done' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-500/15 flex items-center justify-center">
                <CheckCircle size={32} className="text-success-500" />
              </div>
              <h1 className="text-2xl font-bold text-light-100 mb-2">Inregistrare completa!</h1>
              <p className="text-sm text-light-60 mb-6">
                Contul tau este verificat si activ. Poti accesa acum toate functiile MoneyShop.
              </p>
              <button onClick={() => navigate('/dashboard')}
                className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25">
                Mergi la Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
