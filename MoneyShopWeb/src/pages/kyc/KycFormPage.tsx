import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { kycApi, type KycStatusResponse, type OcrResult, type DecisionResponse } from '@/services/api/kycApi';

type Step = 'status' | 'document' | 'selfie' | 'processing' | 'done';

export default function KycFormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('status');
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkStatus();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const checkStatus = async () => {
    try {
      const status = await kycApi.getStatus();
      setKycStatus(status);
      if (status.status === 'verified') setStep('done');
    } catch {
      setStep('document');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontImage(file);
    setLoading(true);
    try {
      await kycApi.startSession();
      const result = await kycApi.submitDocument(file);
      setOcrResult(result);
      if (result.decision === 'APPROVED' || result.decision === 'MANUAL_REVIEW') {
        toast.success('Document procesat cu succes!');
        setStep('selfie');
      } else {
        toast.error(result.error || 'Document neacceptat. Reincearca.');
      }
    } catch {
      toast.error('Eroare la procesare document');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error('Nu s-a putut accesa camera');
    }
  }, []);

  useEffect(() => {
    if (step === 'selfie') startCamera();
  }, [step, startCamera]);

  const takeSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelfieData(dataUrl);
    streamRef.current?.getTracks().forEach(t => t.stop());
    submitFaceCompare(dataUrl);
  };

  const submitFaceCompare = async (selfie: string) => {
    if (!frontImage) return;
    setStep('processing');
    setLoading(true);
    try {
      const result = await kycApi.submitFaceCompare(frontImage, selfie);
      setDecision(result);
      setStep('done');
      toast.success('Verificare KYC finalizata!');
    } catch {
      toast.error('Eroare la compararea feelor');
      setStep('selfie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <h1 className="text-2xl font-bold text-light-100">Verificare identitate (KYC)</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-4 mb-4">
        {['Document', 'Selfie', 'Verificare'].map((s, i) => {
          const isVerified = step === 'done' || kycStatus?.status === 'verified';
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                isVerified
                  ? 'bg-success-500 text-white'
                  : (step === 'document' && i === 0) || (step === 'selfie' && i === 1) || (step === 'processing' && i === 2)
                    ? 'bg-brand-primary text-white'
                    : i < (['document', 'selfie', 'processing', 'done'].indexOf(step))
                      ? 'bg-success-500 text-white'
                      : 'bg-dark-600 text-light-50'
              }`}>{i + 1}</div>
              <span className="text-xs text-light-60 hidden sm:block">{s}</span>
            </div>
          );
        })}
      </div>

      {/* Already verified (from API status or after QR-based verification) */}
      {(step === 'done' && !decision && kycStatus?.status === 'verified') && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-success-500 mb-4" />
          <h2 className="text-xl font-bold text-light-100 mb-2">Identitate verificata</h2>
          <p className="text-sm text-light-60 mb-6">KYC verificat la {kycStatus.verifiedAt ? new Date(kycStatus.verifiedAt).toLocaleDateString('ro-RO') : ''}</p>
          <button
            onClick={() => navigate('/profile')}
            className="px-8 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            Inapoi la profil
          </button>
        </div>
      )}

      {kycStatus?.status === 'pending' && (step === 'status' || step === 'done') && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-warning-500 mb-4" />
          <h2 className="text-xl font-bold text-light-100 mb-2">Verificare in curs</h2>
          <p className="text-sm text-light-60">Vei fi notificat cand procesul se finalizeaza.</p>
        </div>
      )}

      {/* Document upload */}
      {step === 'document' && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-light-100 mb-4">Incarca actul de identitate</h2>
          <p className="text-sm text-light-60 mb-6">Fotografiaza sau incarca fata cartii de identitate.</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full border-2 border-dashed border-dark-400 rounded-xl py-12 flex flex-col items-center gap-3 hover:border-brand-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={32} className="text-brand-primary animate-spin" />
            ) : (
              <Upload size={32} className="text-light-50" />
            )}
            <span className="text-sm text-light-60">{loading ? 'Se proceseaza...' : 'Click pentru a incarca sau trage fisierul aici'}</span>
          </button>
        </div>
      )}

      {/* Selfie capture */}
      {step === 'selfie' && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-light-100 mb-4">Selfie verificare</h2>
          <p className="text-sm text-light-60 mb-4">Pozitioneaza fata in cadru si apasa butonul.</p>

          <div className="relative rounded-xl overflow-hidden bg-dark-900 mb-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
            <div className="absolute inset-0 border-4 border-brand-primary/30 rounded-xl pointer-events-none" />
          </div>

          <button
            onClick={takeSelfie}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25 flex items-center justify-center gap-2"
          >
            <Camera size={20} /> Fa selfie
          </button>
        </div>
      )}

      {/* Processing */}
      {step === 'processing' && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
          <Loader2 size={48} className="mx-auto text-brand-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold text-light-100 mb-2">Se verifica...</h2>
          <p className="text-sm text-light-60">Comparam documentul cu selfie-ul. Asteapta cateva secunde.</p>
        </div>
      )}

      {/* Done */}
      {step === 'done' && decision && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
          {decision.decision.status === 'APPROVED' ? (
            <>
              <CheckCircle size={48} className="mx-auto text-success-500 mb-4" />
              <h2 className="text-xl font-bold text-light-100 mb-2">Verificare reusita!</h2>
              <p className="text-sm text-light-60 mb-6">Identitatea ta a fost confirmata cu succes.</p>
            </>
          ) : (
            <>
              <AlertCircle size={48} className="mx-auto text-warning-500 mb-4" />
              <h2 className="text-xl font-bold text-light-100 mb-2">Verificare necesita revizuire</h2>
              <p className="text-sm text-light-60 mb-6">{decision.decision.reason || 'Un operator va analiza cererea ta.'}</p>
            </>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="px-8 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            Inapoi la profil
          </button>
        </div>
      )}
    </div>
  );
}
