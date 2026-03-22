import { useRef, useState, useCallback, useEffect } from "react";
import { computeSharpness, SHARPNESS_THRESHOLD } from "../utils/blurDetection";

/** Compute the source rectangle in video-pixel coordinates that maps to the DocumentOverlay guide frame. */
function computeDocumentCropRegion(video: HTMLVideoElement) {
  const vw = video.videoWidth;   // native video resolution
  const vh = video.videoHeight;
  const cw = video.clientWidth;  // rendered container size
  const ch = video.clientHeight;

  const videoAspect = vw / vh;
  const containerAspect = cw / ch;

  // Reverse-engineer CSS object-cover: which part of the video is visible
  let visibleW: number, visibleH: number, offsetX: number, offsetY: number;
  if (videoAspect > containerAspect) {
    // Video wider than container → sides cropped
    visibleH = vh;
    visibleW = vh * containerAspect;
    offsetX = (vw - visibleW) / 2;
    offsetY = 0;
  } else {
    // Video taller than container → top/bottom cropped
    visibleW = vw;
    visibleH = vw / containerAspect;
    offsetX = 0;
    offsetY = (vh - visibleH) / 2;
  }

  // DocumentOverlay: w-[92%] max-w-lg (512px), aspect-[1.586/1], centered
  const guideWidthPx = Math.min(cw * 0.92, 512);
  const guideHeightPx = guideWidthPx / 1.586;

  // Guide frame as fraction of container
  const normLeft = (cw - guideWidthPx) / 2 / cw;
  const normTop = (ch - guideHeightPx) / 2 / ch;
  const normWidth = guideWidthPx / cw;
  const normHeight = guideHeightPx / ch;

  // Map to video pixel coordinates
  const sx = offsetX + normLeft * visibleW;
  const sy = offsetY + normTop * visibleH;
  const sw = normWidth * visibleW;
  const sh = normHeight * visibleH;

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sw: Math.round(sw),
    sh: Math.round(sh),
  };
}

/** Number of consecutive sharp frames required before auto-capture triggers */
const AUTO_CAPTURE_FRAMES = 20; // ~4s at 5fps analysis rate

/** Minimum ms between sharpness checks (throttle) */
const ANALYSIS_INTERVAL_MS = 200;

interface CameraProps {
  facingMode: "user" | "environment";
  onCapture: (blob: Blob) => void;
  overlay: React.ReactNode;
  instruction: string;
  /** Enable auto-capture when document is stable and sharp (default: true for environment) */
  autoCapture?: boolean;
}

export default function Camera({
  facingMode,
  onCapture,
  overlay,
  instruction,
  autoCapture,
}: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isSharp, setIsSharp] = useState(false);

  // Refs for RAF loop (avoid stale closures)
  const rafRef = useRef<number>(0);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stableFramesRef = useRef(0);
  const autoCapturedRef = useRef(false);
  const captureRef = useRef<(() => void) | undefined>(undefined);

  // Determine whether auto-capture should be active
  const shouldAutoCapture = autoCapture !== undefined ? autoCapture : facingMode === "environment";

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      // Stop any existing stream first
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const isUserFacing = facingMode === "user";
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: isUserFacing ? 1280 : 1920 },
          height: { ideal: isUserFacing ? 720 : 1440 },
        },
        audio: false,
      });

      // Request continuous autofocus and auto-exposure for sharper captures
      const track = s.getVideoTracks()[0];
      if (track) {
        const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
        const advanced: Record<string, string>[] = [];
        if ((caps?.focusMode as string[])?.includes("continuous"))
          advanced.push({ focusMode: "continuous" });
        if ((caps?.exposureMode as string[])?.includes("continuous"))
          advanced.push({ exposureMode: "continuous" });
        if ((caps?.whiteBalanceMode as string[])?.includes("continuous"))
          advanced.push({ whiteBalanceMode: "continuous" });
        if (advanced.length > 0) {
          try { await track.applyConstraints({ advanced } as MediaTrackConstraints); }
          catch { /* not supported on this device */ }
        }
      }

      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        // Explicit play() required on iOS Safari where autoPlay is unreliable
        try { await videoRef.current.play(); } catch { /* already playing or will autoplay */ }
      }
    } catch {
      setError(
        "Nu s-a putut accesa camera. Verifică permisiunile browserului."
      );
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, startCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (facingMode === "user") {
      // Selfie mode: crop to center face region (~65% width, ~80% height)
      const cropW = Math.round(vw * 0.65);
      const cropH = Math.round(vh * 0.80);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2 * 0.75); // slightly above center (face area)

      const canvas = document.createElement("canvas");
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Mirror + crop
      ctx.translate(cropW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      canvas.toBlob(
        (blob) => { if (blob) onCapture(blob); },
        "image/jpeg",
        0.92
      );
    } else {
      // Document mode: crop to guide frame area (matches DocumentOverlay)
      const { sx, sy, sw, sh } = computeDocumentCropRegion(video);

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob(
        (blob) => { if (blob) onCapture(blob); },
        "image/jpeg",
        0.95
      );
    }
  }, [facingMode, onCapture]);

  // Keep captureRef updated so the RAF loop can call it without stale closures
  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);

  // Reset auto-capture flag when facingMode changes
  useEffect(() => {
    autoCapturedRef.current = false;
    stableFramesRef.current = 0;
  }, [facingMode]);

  // ---------- Blur detection RAF loop ----------
  useEffect(() => {
    if (!ready) return;

    // Create offscreen canvas once for reuse
    if (!analysisCanvasRef.current) {
      analysisCanvasRef.current = document.createElement("canvas");
    }

    let lastAnalysisTime = 0;

    const loop = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      if (now - lastAnalysisTime < ANALYSIS_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastAnalysisTime = now;

      const sharpness = computeSharpness(video, analysisCanvasRef.current!);
      const sharp = sharpness >= SHARPNESS_THRESHOLD;
      setIsSharp(sharp);

      if (sharp) {
        stableFramesRef.current++;
        // Auto-capture for document mode when stable for enough frames
        if (
          shouldAutoCapture &&
          !autoCapturedRef.current &&
          stableFramesRef.current >= AUTO_CAPTURE_FRAMES
        ) {
          autoCapturedRef.current = true;
          captureRef.current?.();
        }
      } else {
        stableFramesRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, shouldAutoCapture]);

  // Auto-capture progress (0..1) for visual indicator
  const autoProgress = shouldAutoCapture
    ? Math.min(stableFramesRef.current / AUTO_CAPTURE_FRAMES, 1)
    : 0;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-6">
        <svg
          className="w-16 h-16 text-red-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-center mb-4">{error}</p>
        <button
          onClick={startCamera}
          className="px-6 py-3 bg-indigo-600 rounded-lg font-medium"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4 pt-6">
        <p className="text-white text-center text-sm font-medium">
          {instruction}
        </p>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className={`w-full h-full object-cover ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          }`}
        />
        {ready && overlay}

        {/* Blur indicator */}
        {ready && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                isSharp
                  ? "bg-green-500/80 text-white"
                  : "bg-red-500/80 text-white animate-pulse"
              }`}
            >
              {isSharp ? "Imagine clară" : "Imagine neclară — ține telefonul stabil"}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent pb-8 pt-12 flex justify-center">
        <button
          onClick={capture}
          disabled={!ready || !isSharp}
          className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
        >
          {/* Auto-capture progress ring */}
          {shouldAutoCapture && isSharp && !autoCapturedRef.current && (
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 80 80"
            >
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="rgba(99, 102, 241, 0.8)"
                strokeWidth="4"
                strokeDasharray={`${autoProgress * 226} 226`}
                strokeLinecap="round"
              />
            </svg>
          )}
          <div className="w-16 h-16 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
