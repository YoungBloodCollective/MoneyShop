import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';

type ScanStep = 'loading' | 'invalid' | 'doc_front' | 'doc_back' | 'selfie' | 'processing' | 'done' | 'rejected';

// Standalone API calls using the session token (no JWT)
const scanApi = {
  getSession: (token: string) =>
    axios.get(`${API_BASE_URL}/kyc-scan/session/${token}`).then(r => r.data),
  submitDocument: (token: string, front: Blob, back?: Blob) => {
    const fd = new FormData();
    fd.append('DocumentFront', front, 'front.jpg');
    if (back) fd.append('DocumentBack', back, 'back.jpg');
    return axios.post(`${API_BASE_URL}/kyc-scan/document/${token}`, fd).then(r => r.data);
  },
  submitLiveness: (token: string, selfie: Blob) => {
    const fd = new FormData();
    fd.append('Selfie', selfie, 'selfie.jpg');
    return axios.post(`${API_BASE_URL}/kyc-scan/liveness/${token}`, fd).then(r => r.data);
  },
  submitFaceCompare: (token: string, docPhoto: Blob, selfie: Blob) => {
    const fd = new FormData();
    fd.append('DocumentPhoto', docPhoto, 'document.jpg');
    fd.append('Selfie', selfie, 'selfie.jpg');
    return axios.post(`${API_BASE_URL}/kyc-scan/face-compare/${token}`, fd).then(r => r.data);
  },
};

function dataURItoBlob(dataURI: string): Blob {
  const match = dataURI.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URI');
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

export default function KycScanPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigateFn = useNavigate();
  const returnTo = searchParams.get('returnTo');
  const [step, setStep] = useState<ScanStep>('loading');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [docFrontBlob, setDocFrontBlob] = useState<Blob | null>(null);
  const [docBackBlob, setDocBackBlob] = useState<Blob | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStep('invalid'); return; }
    scanApi.getSession(token)
      .then(session => {
        if (session.status === 'verified') { setStep('done'); }
        else if (session.status === 'rejected') { setStep('rejected'); }
        else { setStep('doc_front'); }
      })
      .catch(() => { setStep('invalid'); });
  }, [token]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const startCamera = useCallback(async (facingMode: 'environment' | 'user' = 'environment') => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('Nu s-a putut accesa camera. Permite accesul la camera.');
    }
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const capturePhoto = (): Blob | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUri = canvas.toDataURL('image/jpeg', 0.85);
    return dataURItoBlob(dataUri);
  };

  // ── Step handlers ──

  const handleCaptureFront = async () => {
    await startCamera('environment');
  };

  const handleTakeFrontPhoto = () => {
    const blob = capturePhoto();
    if (blob) {
      setDocFrontBlob(blob);
      stopCamera();
      setStep('doc_back');
    }
  };

  const handleCaptureBack = async () => {
    await startCamera('environment');
  };

  const handleTakeBackPhoto = () => {
    const blob = capturePhoto();
    if (blob) {
      setDocBackBlob(blob);
      stopCamera();
      setStep('selfie');
    }
  };

  const handleSkipBack = () => {
    stopCamera();
    setStep('selfie');
  };

  const handleCaptureSelfie = async () => {
    await startCamera('user');
  };

  const handleTakeSelfie = () => {
    const blob = capturePhoto();
    if (blob) {
      setSelfieBlob(blob);
      stopCamera();
      submitAll(blob);
    }
  };

  const submitAll = async (selfie: Blob) => {
    if (!token || !docFrontBlob) return;
    setStep('processing');
    setProcessing(true);
    try {
      // 1. Submit document
      await scanApi.submitDocument(token, docFrontBlob, docBackBlob || undefined);
      // 2. Submit liveness
      await scanApi.submitLiveness(token, selfie);
      // 3. Face compare
      const result = await scanApi.submitFaceCompare(token, docFrontBlob, selfie);
      if (result.decision?.status === 'approved' || result.decision?.code === 9001) {
        setStep('done');
      } else {
        setError(result.decision?.reason || 'Verificarea a esuat');
        setStep('rejected');
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Eroare la verificare';
      setError(msg || 'Eroare la verificare');
      setStep('rejected');
    } finally {
      setProcessing(false);
    }
  };

  // ── Render ──

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="bg-navy-800 rounded-2xl p-8 text-center max-w-sm">
          <XCircle size={48} className="text-error-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link invalid sau expirat</h1>
          <p className="text-sm text-light-50 mb-4">
            {returnTo ? 'Sesiunea a expirat. Incearca din nou.' : 'Genereaza un nou cod QR din aplicatia web.'}
          </p>
          {returnTo && (
            <button onClick={() => navigateFn(returnTo, { replace: true })}
              className="w-full py-3 rounded-full bg-brand-primary text-white font-semibold flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Inapoi la inregistrare
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="bg-navy-800 rounded-2xl p-8 text-center max-w-sm">
          <CheckCircle size={48} className="text-success-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Identitate verificata!</h1>
          {returnTo ? (
            <>
              <p className="text-sm text-light-50 mb-6">Verificarea a fost finalizata cu succes.</p>
              <button onClick={() => navigateFn(returnTo, { replace: true })}
                className="w-full py-3 rounded-full bg-brand-primary text-white font-semibold flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Inapoi la inregistrare
              </button>
            </>
          ) : (
            <p className="text-sm text-light-50">Poti inchide aceasta pagina si reveni la calculator.</p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'rejected') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="bg-navy-800 rounded-2xl p-8 text-center max-w-sm">
          <XCircle size={48} className="text-error-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Verificare esuata</h1>
          <p className="text-sm text-light-50 mb-4">{error || 'Verificarea nu a putut fi finalizata.'}</p>
          <button onClick={() => { setStep('doc_front'); setDocFrontBlob(null); setDocBackBlob(null); setSelfieBlob(null); setError(''); }}
            className="w-full py-3 rounded-full bg-brand-primary text-white font-semibold mb-3">
            Incearca din nou
          </button>
          {returnTo && (
            <button onClick={() => navigateFn(returnTo, { replace: true })}
              className="w-full py-3 rounded-full border border-dark-400 text-light-60 font-medium flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Inapoi la inregistrare
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="bg-navy-800 rounded-2xl p-8 text-center max-w-sm">
          <div className="w-12 h-12 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Se proceseaza...</h1>
          <p className="text-sm text-light-50">Documentele sunt in curs de verificare.</p>
        </div>
      </div>
    );
  }

  // Camera steps
  const isDocFront = step === 'doc_front';
  const isDocBack = step === 'doc_back';
  const isSelfie = step === 'selfie';

  const title = isDocFront ? 'Fata actului de identitate' :
                isDocBack ? 'Spatele actului de identitate' :
                'Selfie';

  const subtitle = isDocFront ? 'Fotografiaza fata buletinului / cartii de identitate' :
                   isDocBack ? 'Fotografiaza spatele documentului (optional)' :
                   'Fa un selfie cu fata vizibila';

  const onStartCapture = isDocFront ? handleCaptureFront :
                         isDocBack ? handleCaptureBack :
                         handleCaptureSelfie;

  const onTakePhoto = isDocFront ? handleTakeFrontPhoto :
                      isDocBack ? handleTakeBackPhoto :
                      handleTakeSelfie;

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <div className="p-4 text-center">
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <p className="text-sm text-light-50">{subtitle}</p>
        <div className="flex gap-1 justify-center mt-3">
          <div className={`w-8 h-1 rounded ${isDocFront || isDocBack || isSelfie ? 'bg-brand-primary' : 'bg-dark-400'}`} />
          <div className={`w-8 h-1 rounded ${isDocBack || isSelfie ? 'bg-brand-primary' : 'bg-dark-400'}`} />
          <div className={`w-8 h-1 rounded ${isSelfie ? 'bg-brand-primary' : 'bg-dark-400'}`} />
        </div>
      </div>

      {/* Camera Preview */}
      <div className="flex-1 relative mx-4 rounded-2xl overflow-hidden bg-black">
        <video ref={videoRef} autoPlay playsInline muted
          className="w-full h-full object-cover" />

        {/* Camera overlay guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`border-2 border-white/40 rounded-xl ${
            isSelfie ? 'w-36 h-48 sm:w-48 sm:h-60' : 'w-56 h-36 sm:w-72 sm:h-44'
          }`} />
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        {!streamRef.current ? (
          <button onClick={onStartCapture}
            className="w-full py-4 rounded-full bg-brand-primary text-white font-semibold flex items-center justify-center gap-2">
            <Camera size={20} /> Deschide camera
          </button>
        ) : (
          <button onClick={onTakePhoto}
            className="w-full py-4 rounded-full bg-brand-primary text-white font-semibold">
            Fotografiaza
          </button>
        )}

        {isDocBack && (
          <button onClick={handleSkipBack}
            className="w-full py-3 rounded-full border border-dark-400 text-light-60 font-medium flex items-center justify-center gap-2">
            Sari peste <ArrowRight size={16} />
          </button>
        )}

        {error && <p className="text-error-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
