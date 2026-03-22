import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  createSession,
  submitOcr,
  submitLiveness,
  submitFaceCompare,
  submitActiveLiveness,
} from "./services/kycExternalApi";
import { connectToKycSession, disconnect } from "./services/signalr";
function useIsMobileKyc() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}
import Camera from "./components/Camera";
import ConsentGate from "./components/ConsentGate";
import DocumentOverlay from "./components/DocumentOverlay";
import ImagePreview from "./components/ImagePreview";
import ActiveLivenessCamera from "./components/ActiveLivenessCamera";
import type { ChallengeLog } from "./components/ActiveLivenessCamera";
import { analyzeDocumentAuthenticity } from "./utils/documentAuth";
import { extractError, getMissingMandatoryFields } from "./utils/helpers";
import type {
  OcrOnlyResult,
  LivenessOnlyResult,
  FaceCompareResult,
  ActiveLivenessResult,
} from "./types";

const MAX_RETRIES = 3;
const MAX_OCR_RETRIES = 2;

type Step =
  | "consent"
  | "init"
  | "front"
  | "analyzing"
  | "fraud_warning"
  | "ocr_retry"
  | "back"
  | "active_liveness"
  | "submitting"
  | "done"
  | "error";

export default function FullKycPage() {
  const isMobile = useIsMobileKyc();
  const navigate = useNavigate();
  const params = useParams<{ sessionId?: string }>();
  const [searchParams] = useSearchParams();

  const qrSessionId = params.sessionId || "";
  const qrToken = searchParams.get("token") || "";

  const [sessionId, setSessionId] = useState(qrSessionId);
  const [token, setToken] = useState(qrToken);
  // QR arrivals go to a camera permission gate first, not directly to "front"
  const [step, setStep] = useState<Step>(qrSessionId ? "consent" : "consent");
  const [qrPhase, setQrPhase] = useState<"idle" | "loading" | "waiting" | "processing">("idle");
  const isQrSession = !!qrSessionId;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

  const [isNewFormat, setIsNewFormat] = useState(false);
  const [fraudWarnings, setFraudWarnings] = useState<string[]>([]);

  // Refs to avoid stale closures in active liveness callback
  const frontBlobRef = useRef<Blob | null>(null);
  const backBlobRef = useRef<Blob | null>(null);
  const isNewFormatRef = useRef(false);

  const [ocrResult, setOcrResult] = useState<OcrOnlyResult | null>(null);
  const [livenessResult, setLivenessResult] = useState<LivenessOnlyResult | null>(null);
  const [compareResult, setCompareResult] = useState<FaceCompareResult | null>(null);
  const [activeLivenessResult, setActiveLivenessResult] = useState<ActiveLivenessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<Step | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Se procesează...");
  const [activeLivenessCameraReady, setActiveLivenessCameraReady] = useState(false);
  const [ocrRetryCount, setOcrRetryCount] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => () => { disconnect(); }, []);

  // Delay mounting Active Liveness camera so previous stream is fully released
  useEffect(() => {
    if (step !== "active_liveness") {
      setActiveLivenessCameraReady(false);
      return;
    }
    const t = setTimeout(() => setActiveLivenessCameraReady(true), 400);
    return () => clearTimeout(t);
  }, [step]);

  // Pre-warm camera permissions for both rear and front cameras on page load.
  // Skip for QR sessions — mobile browsers block getUserMedia without user gesture from external links.
  // QR sessions will request permission via an explicit button tap instead.
  useEffect(() => {
    if (isQrSession) return;
    (async () => {
      try {
        const rear = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        rear.getTracks().forEach((t) => t.stop());
      } catch { /* permission denied or unavailable */ }
      try {
        const front = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        front.getTracks().forEach((t) => t.stop());
      } catch { /* permission denied or unavailable */ }
    })();
  }, [isQrSession]);

  // For QR sessions: request camera permission on user tap (provides gesture context)
  const handleQrCameraStart = useCallback(async () => {
    try {
      const rear = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      rear.getTracks().forEach((t) => t.stop());
      try {
        const front = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        front.getTracks().forEach((t) => t.stop());
      } catch { /* front camera optional */ }
      setStep("front");
    } catch {
      // Try just any camera
      try {
        const any = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        any.getTracks().forEach((t) => t.stop());
        setStep("front");
      } catch {
        setStep("front"); // Camera component will show its own error
      }
    }
  }, []);

  const startSession = useCallback(async () => {
    setQrPhase("loading");
    try {
      const session = await createSession();
      setSessionId(session.sessionId);
      setToken(session.token);

      if (isMobile) {
        setStep("front");
        return;
      }

      setQrPhase("waiting");
      await connectToKycSession(session.sessionId, {
        onStatus: (s) => {
          if (s === "processing" || s === "comparing") setQrPhase("processing");
        },
        onOcrCompleted: (r) => setOcrResult(r),
        onLivenessCompleted: (r) => setLivenessResult(r as any),
        onActiveLivenessCompleted: (r) => setActiveLivenessResult(r),
        onCompareCompleted: (r) => {
          setCompareResult(r);
          setStep("done");
        },
        onFailed: (err) => {
          setError(err.error);
          setStep("error");
        },
      });
    } catch {
      setError("Nu s-a putut crea sesiunea.");
      setStep("error");
    }
  }, [isMobile]);

  const handleCapture = useCallback((blob: Blob) => {
    setPendingBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  }, []);

  const handleRetry = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingBlob(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const handleConfirm = useCallback(async () => {
    if (!pendingBlob) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    if (step === "front") {
      const front = pendingBlob;
      frontBlobRef.current = front;
      setPendingBlob(null);
      setStep("analyzing");

      try {
        const [ocr, authCheck] = await Promise.all([
          submitOcr(sessionId, token, front),
          analyzeDocumentAuthenticity(front),
        ]);
        setOcrResult(ocr);
        const newFormat = ocr.ocrData?.isNewFormat ?? false;
        setIsNewFormat(newFormat);
        isNewFormatRef.current = newFormat;

        if (authCheck.isLikelyScreen) {
          setFraudWarnings(authCheck.warnings);
          setStep("fraud_warning");
          return;
        }

        // Check for missing mandatory OCR fields
        const missing = getMissingMandatoryFields(ocr.ocrData);
        if (missing.length > 0 && ocrRetryCount < MAX_OCR_RETRIES) {
          setMissingFields(missing);
          setStep("ocr_retry");
          return;
        }

        setStep(newFormat ? "back" : "active_liveness");
      } catch (err: unknown) {
        handleStepError(err, "front");
      }
    } else if (step === "back") {
      backBlobRef.current = pendingBlob;
      setPendingBlob(null);
      setStep("active_liveness");
    }
  }, [pendingBlob, previewUrl, step, sessionId, token]);

  const handleRetryFront = useCallback(() => {
    setFraudWarnings([]);
    frontBlobRef.current = null;
    setOcrResult(null);
    setStep("front");
  }, []);

  const handleContinueAfterWarning = useCallback(() => {
    setFraudWarnings([]);
    setStep(isNewFormatRef.current ? "back" : "active_liveness");
  }, []);

  const handleOcrRetake = useCallback(() => {
    setOcrRetryCount((c) => c + 1);
    setMissingFields([]);
    frontBlobRef.current = null;
    setOcrResult(null);
    setPendingBlob(null);
    setStep("front");
  }, []);

  const handleOcrRetrySkip = useCallback(() => {
    setMissingFields([]);
    setStep(isNewFormatRef.current ? "back" : "active_liveness");
  }, []);

  // Retry failed step
  const handleRetryFailedStep = useCallback(() => {
    if (!failedStep || retryCount >= MAX_RETRIES) return;
    setError(null);
    setRetryCount((c) => c + 1);
    setStep(failedStep);
    setFailedStep(null);
  }, [failedStep, retryCount]);

  // Handle step errors with retry tracking
  const handleStepError = useCallback((err: unknown, currentStep: Step) => {
    const msg = extractError(err);
    setError(msg);
    setFailedStep(currentStep);
    setStep("error");
  }, []);

  // Active liveness complete → run submissions
  const handleActiveLivenessComplete = useCallback(
    async (alBlob: Blob, selfie: Blob, logs: ChallengeLog[]) => {
      setStep("submitting");

      try {
        const front = frontBlobRef.current!;
        const back = backBlobRef.current;
        const newFmt = isNewFormatRef.current;

        // 1. Re-submit OCR with full-res if new format with back image
        if (newFmt && back) {
          setStatusMsg("Se extrag datele complete...");
          const fullOcr = await submitOcr(sessionId, token, front, back);
          setOcrResult(fullOcr);
        }

        // 2. Save selfie server-side
        setStatusMsg("Se salvează selfie-ul...");
        const liveness = await submitLiveness(sessionId, token, selfie);
        setLivenessResult(liveness);

        // 3. Active liveness (challenges + face comparison with selfie)
        setStatusMsg("Se verifică identitatea...");
        const alResult = await submitActiveLiveness(
          sessionId, token, alBlob,
          logs.map((l) => ({ type: l.type, passed: l.passed, durationMs: l.durationMs }))
        );
        setActiveLivenessResult(alResult);

        if (alResult.decision === "fail") {
          handleStepError(new Error(alResult.reasonCode || "Verificarea liveness a eșuat"), "active_liveness");
          return;
        }

        // 4. Face compare: document vs active liveness selfie
        setStatusMsg("Se compară fețele...");
        const compare = await submitFaceCompare(sessionId, token, null, alBlob);
        setCompareResult(compare);

        if (compare.decision === "fail") {
          handleStepError(new Error(compare.reasonCode || "Fețele nu corespund"), "active_liveness");
          return;
        }

        setStep("done");
      } catch (err: unknown) {
        handleStepError(err, "active_liveness");
      }
    },
    [sessionId, token, handleStepError]
  );

  const mobileUrl = sessionId
    ? `${window.location.origin}/kyc/${sessionId}?token=${token}`
    : "";

  const stepConfig: Record<string, { facing: "user" | "environment"; instruction: string; label: string; overlay: React.ReactNode }> = {
    front: { facing: "environment", instruction: "Pozitionează fața buletinului în cadru", label: "Față buletin", overlay: <DocumentOverlay /> },
    back: { facing: "environment", instruction: "Întoarce buletinul — pozitionează verso-ul", label: "Verso buletin", overlay: <DocumentOverlay /> },
  };

  const stepLabels = isNewFormat
    ? ["Față", "Verso", "Verificare"]
    : ["Față", "Verificare"];

  const stepNumber =
    step === "front" ? 1
    : step === "back" ? 2
    : step === "active_liveness" ? (isNewFormat ? 3 : 2)
    : isNewFormat ? 3 : 2;

  // ─── GDPR Consent ──────────────────────────────────────────────────
  if (step === "consent") {
    if (isQrSession) {
      // QR sessions: show a camera permission gate with a start button (provides user gesture for getUserMedia)
      return (
        <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
            <svg className="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verificare identitate</h1>
            <p className="text-slate-500 text-sm mb-6">
              Vom folosi camera pentru a fotografia buletinul și a face verificarea live.
            </p>
            <button
              onClick={handleQrCameraStart}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors text-lg active:scale-[0.98]"
            >
              Pornește camera
            </button>
          </div>
        </div>
      );
    }
    return <ConsentGate onAccept={() => setStep("init")} />;
  }

  // ─── Desktop: QR flow ──────────────────────────────────────────────
  if (!isMobile && step === "init") {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">KYC Complet</h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">OCR + Liveness + Comparare</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            {qrPhase === "idle" && (
              <div className="text-center">
                <p className="text-slate-500 text-sm mb-6">
                  Vei scana buletinul și vei face verificarea folosind telefonul.
                </p>
                <button onClick={startSession} className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors text-lg active:scale-[0.98]">
                  Generează cod QR
                </button>
              </div>
            )}
            {qrPhase === "loading" && <Spinner text="Se creează sesiunea..." />}
            {qrPhase === "waiting" && (
              <div className="text-center">
                <p className="text-slate-700 font-medium mb-4">Scanează codul QR cu telefonul</p>
                <div className="bg-white p-4 rounded-xl border border-slate-100 inline-block mb-4">
                  <QRCodeSVG value={mobileUrl} size={220} level="M" />
                </div>
                <p className="text-slate-400 text-xs break-all px-4">{mobileUrl}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-indigo-500 mt-4">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  Se așteaptă scanarea...
                </div>
              </div>
            )}
            {qrPhase === "processing" && <Spinner text="Se procesează..." />}
          </div>

          {(ocrResult || livenessResult || activeLivenessResult || compareResult) && (
            <ResultsDisplay ocr={ocrResult} liveness={livenessResult} activeLiveness={activeLivenessResult} compare={compareResult} />
          )}
        </div>
      </div>
    );
  }

  // ─── Mobile init ───────────────────────────────────────────────────
  if (isMobile && step === "init") {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">KYC Complet</h1>
          <p className="text-slate-500 text-sm mb-6">
            Vei fotografia buletinul și vei face o verificare live.
          </p>
          <button onClick={startSession} className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl text-lg active:scale-[0.98]">
            Începe verificarea
          </button>
        </div>
      </div>
    );
  }

  // ─── Analyzing ────────────────────────────────────────────────────
  if (step === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-gray-900 text-white gap-5 px-6">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-lg sm:text-xl font-semibold">Se analizează buletinul...</p>
          <p className="text-gray-400 text-sm mt-2">Verificăm datele și tipul documentului</p>
        </div>
      </div>
    );
  }

  // ─── Fraud warning ────────────────────────────────────────────────
  if (step === "fraud_warning") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-gray-900 text-white px-6 py-8 gap-5">
        <svg className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="text-center">
          <p className="text-xl font-bold mb-3">Atenție</p>
          <p className="text-gray-300 mb-4 text-sm sm:text-base">
            Documentul pare fotografiat de pe un ecran sau o copie.
          </p>
          <ul className="text-sm text-amber-300 space-y-1.5 mb-5 text-left max-w-xs mx-auto">
            {fraudWarnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-400 text-xs sm:text-sm">Folosiți documentul original fizic.</p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={handleRetryFront} className="flex-1 py-3.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold transition-colors active:scale-[0.98]">
            Refă fotografia
          </button>
          <button onClick={handleContinueAfterWarning} className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors active:scale-[0.98]">
            Continuă
          </button>
        </div>
      </div>
    );
  }

  // ─── OCR retry (missing mandatory data) ──────────────────────────
  if (step === "ocr_retry") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-gray-900 text-white px-6 py-8 gap-5">
        <svg className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="text-center">
          <p className="text-xl font-bold mb-3">Date lipsă din buletin</p>
          <p className="text-gray-300 mb-4 text-sm sm:text-base">
            Nu am putut extrage toate datele necesare. Te rugăm refă fotografia mai clar.
          </p>
          <ul className="text-sm text-amber-300 space-y-1.5 mb-5 text-left max-w-xs mx-auto">
            {missingFields.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{f} — nedetectat</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-400 text-xs sm:text-sm">
            Asigură-te că buletinul este bine iluminat și complet vizibil în cadru.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Încercarea {ocrRetryCount + 1} din {MAX_OCR_RETRIES}
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={handleOcrRetake} className="flex-1 py-3.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold transition-colors active:scale-[0.98]">
            Refă fotografia
          </button>
          <button onClick={handleOcrRetrySkip} className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors active:scale-[0.98]">
            Continuă
          </button>
        </div>
      </div>
    );
  }

  // ─── Active Liveness step (selfie + challenges in one flow) ──────
  if (step === "active_liveness") {
    return (
      <div className="h-[100dvh] flex flex-col">
        <StepBar current={stepNumber} steps={stepLabels} />
        <div className="flex-1 min-h-0">
          {!activeLivenessCameraReady ? (
            <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white gap-5">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-semibold">Pornire cameră...</p>
            </div>
          ) : (
            <ActiveLivenessCamera
              onComplete={handleActiveLivenessComplete}
              onError={(msg) => { handleStepError(new Error(msg), "active_liveness"); }}
            />
          )}
        </div>
      </div>
    );
  }

  // ─── Submitting ────────────────────────────────────────────────────
  if (step === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-gray-900 text-white gap-5 px-6">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-lg sm:text-xl font-semibold">{statusMsg}</p>
          <p className="text-gray-400 text-sm mt-2">Poate dura câteva secunde</p>
        </div>
      </div>
    );
  }

  // ─── Error with retry ──────────────────────────────────────────────
  if (step === "error") {
    const canRetry = failedStep && retryCount < MAX_RETRIES;
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-gray-900 text-white px-6 gap-5">
        <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Eroare</p>
          <p className="text-gray-400 text-sm">{error}</p>
          {canRetry && (
            <p className="text-gray-500 text-xs mt-2">
              Încercarea {retryCount + 1} din {MAX_RETRIES}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {canRetry && (
            <button onClick={handleRetryFailedStep} className="px-8 py-3.5 bg-indigo-500 rounded-xl font-semibold active:scale-[0.98]">
              Încearcă din nou
            </button>
          )}
          <button onClick={() => navigate("/onboarding")} className={`px-8 py-3.5 rounded-xl font-semibold active:scale-[0.98] ${canRetry ? "bg-gray-700" : "bg-indigo-500"}`}>
            Înapoi
          </button>
        </div>
      </div>
    );
  }

  // ─── Done ──────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-md mx-auto pb-6">
          <ResultsDisplay ocr={ocrResult} liveness={livenessResult} activeLiveness={activeLivenessResult} compare={compareResult} />
          <button onClick={() => navigate("/onboarding")} className="w-full mt-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl active:scale-[0.98]">
            Verificare nouă
          </button>
        </div>
      </div>
    );
  }

  // ─── Camera capture (front / back) ─────────────────────────────────
  const config = stepConfig[step];
  if (!config) return null;

  if (previewUrl) {
    return (
      <div className="h-[100dvh] flex flex-col">
        <StepBar current={stepNumber} steps={stepLabels} />
        <div className="flex-1 min-h-0">
          <ImagePreview imageUrl={previewUrl} label={config.label} onRetry={handleRetry} onConfirm={handleConfirm} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col">
      <StepBar current={stepNumber} steps={stepLabels} />
      <div className="flex-1 min-h-0">
        <Camera facingMode={config.facing} onCapture={handleCapture} overlay={config.overlay} instruction={config.instruction} />
      </div>
    </div>
  );
}

// ─── Components ────────────────────────────────────────────────────────

function StepBar({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="bg-gray-900 px-3 py-2.5 flex gap-1.5 shrink-0">
      {steps.map((label, i) => (
        <div key={label} className="flex-1">
          <div className={`h-3 rounded-full mb-1.5 transition-colors duration-300 ${i + 1 <= current ? "bg-indigo-500" : "bg-gray-700"}`} />
          <p className={`text-[11px] sm:text-xs text-center font-semibold truncate ${i + 1 === current ? "text-indigo-400" : i + 1 < current ? "text-indigo-300" : "text-gray-500"}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 mt-4 text-sm">{text}</p>
    </div>
  );
}

function ResultsDisplay({
  ocr,
  liveness,
  activeLiveness,
  compare,
}: {
  ocr: OcrOnlyResult | null;
  liveness: LivenessOnlyResult | null;
  activeLiveness: ActiveLivenessResult | null;
  compare: FaceCompareResult | null;
}) {
  const allPassed =
    ocr?.decision === "pass" &&
    liveness?.decision === "pass" &&
    compare?.decision === "pass" &&
    (!activeLiveness || activeLiveness.decision === "pass");

  const anyFailed =
    ocr?.decision === "fail" ||
    liveness?.decision === "fail" ||
    compare?.decision === "fail" ||
    activeLiveness?.decision === "fail";

  const overallDecision = allPassed ? "pass" : anyFailed ? "fail" : "review";
  const decisionLabel = overallDecision === "pass" ? "VERIFICARE REUȘITĂ" : overallDecision === "fail" ? "VERIFICARE EȘUATĂ" : "NECESITĂ REVIZUIRE";
  const decisionColor = overallDecision === "pass" ? "text-emerald-500" : overallDecision === "fail" ? "text-rose-500" : "text-amber-500";
  const decisionBg = overallDecision === "pass" ? "bg-emerald-50 border-emerald-200" : overallDecision === "fail" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200";

  const failures: string[] = [];
  if (ocr?.decision === "fail") failures.push(`OCR: ${ocr.reasonCode}${ocr.error ? " — " + ocr.error : ""}`);
  if (ocr?.logicValidation) {
    if (!ocr.logicValidation.cnpChecksumValid) failures.push("CNP checksum invalid");
    if (!ocr.logicValidation.cnpBirthDateMatch) failures.push("CNP nu corespunde cu data nașterii");
    if (!ocr.logicValidation.cnpSexMatch) failures.push("CNP nu corespunde cu sexul");
    if (!ocr.logicValidation.documentNotExpired) failures.push("Documentul este expirat");
    if (ocr.logicValidation.errors?.length > 0) failures.push(...ocr.logicValidation.errors);
  }
  if (liveness && !liveness.livenessDetected) failures.push(`Liveness: ${liveness.reasonCode}`);
  if (activeLiveness && !activeLiveness.isLive) failures.push(`Active Liveness: ${activeLiveness.reasonCode}`);
  if (compare && !compare.facesMatch) {
    failures.push(`Comparare fețe: ${compare.reasonCode}`);
    if (!compare.documentFaceDetected) failures.push("Nu s-a detectat față pe document");
    if (!compare.selfieFaceDetected) failures.push("Nu s-a detectat față pe selfie");
  }

  return (
    <div className="space-y-4 mt-4">
      <div className={`rounded-2xl border p-5 text-center ${decisionBg}`}>
        <h2 className={`text-xl sm:text-2xl font-bold ${decisionColor}`}>{decisionLabel}</h2>
        {overallDecision !== "pass" && failures.length > 0 && (
          <div className="mt-4 text-left">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Probleme detectate:</p>
            <ul className="space-y-1.5">
              {failures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-rose-700">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {ocr?.ocrData && (
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <SectionHeader label="Date extrase (OCR)" decision={ocr.decision} />
          <dl className="space-y-2 text-sm mt-3">
            <Field label="Nume" value={ocr.ocrData.lastName} />
            <Field label="Prenume" value={ocr.ocrData.firstName} />
            <Field label="CNP" value={ocr.ocrData.cnp} mono />
            <Field label="Serie/Nr" value={[ocr.ocrData.idSeries, ocr.ocrData.idNumber].filter(Boolean).join(" ")} mono />
            <Field label="Data nașterii" value={ocr.ocrData.birthDate} />
            <Field label="Sex" value={ocr.ocrData.sex} />
            <Field label="Adresa" value={ocr.ocrData.address} />
            <Field label="Locul nașterii" value={ocr.ocrData.placeOfBirth} />
            <Field label="Emis de" value={ocr.ocrData.issuedBy} />
            <Field label="Data emiterii" value={ocr.ocrData.issueDate} />
            <Field label="Valabilitate" value={ocr.ocrData.expiryDate} />
            <Field label="Format" value={ocr.ocrData.isNewFormat ? "Buletin nou" : "Buletin vechi"} />
          </dl>
          {ocr.logicValidation && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
              <Check ok={ocr.logicValidation.cnpChecksumValid} label="CNP checksum" />
              <Check ok={ocr.logicValidation.cnpBirthDateMatch} label="CNP ↔ Data nașterii" />
              <Check ok={ocr.logicValidation.cnpSexMatch} label="CNP ↔ Sex" />
              <Check ok={ocr.logicValidation.documentNotExpired} label="Document valid" />
            </div>
          )}
        </div>
      )}

      {activeLiveness && (
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <SectionHeader label="Active Liveness" decision={activeLiveness.decision} />
          <div className="mt-3 space-y-1.5">
            <Check ok={activeLiveness.isLive} label={`Verificare live (${(activeLiveness.confidence * 100).toFixed(0)}%)`} />
            {activeLiveness.challenges?.length > 0 && (
              <div className="mt-2 space-y-1">
                {activeLiveness.challenges.map((c, i) => (
                  <Check key={i} ok={c.passed} label={`${c.type} (${(c.durationMs / 1000).toFixed(1)}s)`} />
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">{activeLiveness.reasonCode}</p>
          </div>
        </div>
      )}

      {compare && (
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <SectionHeader label="Comparare fețe" decision={compare.decision} />
          <div className="mt-3 space-y-1.5">
            <Check ok={compare.facesMatch} label={`Fețe identice (${(compare.confidence * 100).toFixed(0)}%)`} />
            <Check ok={compare.documentFaceDetected} label="Față pe document" />
            <Check ok={compare.selfieFaceDetected} label="Față pe selfie" />
            <p className="text-xs text-slate-400">{compare.reasonCode}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, decision }: { label: string; decision: string }) {
  const isPassed = decision === "pass";
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">{label}</h3>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPassed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
        {isPassed ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className={`font-medium text-slate-800 text-right ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={ok ? "text-slate-700" : "text-rose-600"}>{label}</span>
    </div>
  );
}

