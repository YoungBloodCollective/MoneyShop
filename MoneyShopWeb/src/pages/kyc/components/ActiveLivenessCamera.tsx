import { useRef, useState, useEffect } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  getFaceLandmarker,
  destroyFaceLandmarker,
  extractMetrics,
  pickRandomChallenges,
  type ChallengeDefinition,
  type ChallengeType,
  type FaceMetrics,
} from "../utils/faceDetection";

export interface ChallengeLog {
  type: string;
  passed: boolean;
  durationMs: number;
}

interface Props {
  onComplete: (livenessBlob: Blob, selfieBlob: Blob, challenges: ChallengeLog[]) => void;
  onError: (msg: string) => void;
}

type Phase = "loading" | "selfie" | "challenge" | "capturing" | "done";

const CENTER_REQUIRED = 90; // ~3 seconds at 30fps — gives user time to read & settle

export default function ActiveLivenessCamera({ onComplete, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const flRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selfieBlobRef = useRef<Blob | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [loadProgress, setLoadProgress] = useState("Se încarcă modelul AI...");
  const [metrics, setMetrics] = useState<FaceMetrics | null>(null);

  const [challenges, setChallenges] = useState<ChallengeDefinition[]>([]);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [consecutiveFrames, setConsecutiveFrames] = useState(0);
  const [completedLogs, setCompletedLogs] = useState<ChallengeLog[]>([]);
  const [challengeStartTime, setChallengeStartTime] = useState(0);
  const [centerFrames, setCenterFrames] = useState(0);

  // ─── Init MediaPipe + HD camera ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadProgress("Se încarcă modelul AI...");
        const fl = await getFaceLandmarker();
        if (cancelled) return;
        flRef.current = fl;

        setLoadProgress("Se pornește camera...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        setChallenges(pickRandomChallenges(3));
        setPhase("selfie");
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : "Nu s-a putut inițializa camera");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      destroyFaceLandmarker();
    };
  }, [onError]);

  // ─── Detection loop ────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "loading" || phase === "done") return;
    const fl = flRef.current;
    const video = videoRef.current;
    if (!fl || !video) return;

    let lastTime = -1;
    const loop = () => {
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
      const now = performance.now();
      if (now === lastTime) { rafRef.current = requestAnimationFrame(loop); return; }
      lastTime = now;

      const result = fl.detectForVideo(video, now);
      const m = extractMetrics(result);
      setMetrics(m);

      if (phase === "selfie") {
        if (m.detected && m.centered) {
          setCenterFrames((prev) => {
            const next = prev + 1;
            if (next >= CENTER_REQUIRED) {
              // Auto-capture selfie frame
              const v = videoRef.current!;
              const tmpCanvas = document.createElement("canvas");
              const vvw = v.videoWidth, vvh = v.videoHeight;
              const cropW = Math.round(vvw * 0.65);
              const cropH = Math.round(vvh * 0.80);
              const cropX = Math.round((vvw - cropW) / 2);
              const cropY = Math.round((vvh - cropH) / 2 * 0.75);
              tmpCanvas.width = cropW;
              tmpCanvas.height = cropH;
              const tmpCtx = tmpCanvas.getContext("2d")!;
              tmpCtx.translate(cropW, 0);
              tmpCtx.scale(-1, 1);
              tmpCtx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
              tmpCanvas.toBlob((blob) => { if (blob) selfieBlobRef.current = blob; }, "image/jpeg", 0.92);
              setPhase("challenge");
              setChallengeStartTime(Date.now());
            }
            return next;
          });
        } else { setCenterFrames(0); }
      }

      if (phase === "challenge" && challenges.length > 0) {
        const current = challenges[challengeIdx];
        if (current && m.detected && current.detect(m)) {
          setConsecutiveFrames((prev) => {
            const next = prev + 1;
            if (next >= current.requiredFrames) {
              setCompletedLogs((prev) => [...prev, { type: current.type, passed: true, durationMs: Date.now() - challengeStartTime }]);
              const nextIdx = challengeIdx + 1;
              if (nextIdx >= challenges.length) { setPhase("capturing"); }
              else { setChallengeIdx(nextIdx); setChallengeStartTime(Date.now()); }
              return 0;
            }
            return next;
          });
        } else { setConsecutiveFrames(0); }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, challenges, challengeIdx, challengeStartTime]);

  // ─── Auto-capture ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "capturing") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Crop to center face region (~65% width, ~80% height) to avoid zoomed-out selfies
    const cropW = Math.round(vw * 0.65);
    const cropH = Math.round(vh * 0.80);
    const cropX = Math.round((vw - cropW) / 2);
    const cropY = Math.round((vh - cropH) / 2 * 0.75); // slightly above center

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d")!;

    // Mirror + crop (selfie camera)
    ctx.translate(cropW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob((blob) => {
      if (blob && selfieBlobRef.current) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setPhase("done");
        onComplete(blob, selfieBlobRef.current, completedLogs);
      }
    }, "image/jpeg", 0.92);
  }, [phase, completedLogs, onComplete]);

  // ─── Derived state ─────────────────────────────────────────────────
  const currentChallenge = challenges[challengeIdx];
  const totalChallenges = challenges.length;
  const completedCount = completedLogs.length;
  const progressPct = currentChallenge
    ? Math.min((consecutiveFrames / currentChallenge.requiredFrames) * 100, 100)
    : 0;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* HD Video — mirrored selfie */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        playsInline
        muted
      />

      {/* Dark overlay with circle cutout — no border ring */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle 200px at 50% 42%, transparent 100%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Progress dots */}
      <div className="absolute top-5 left-0 right-0 flex justify-center gap-3 z-10">
        {challenges.map((c, i) => (
          <div key={c.type} className="flex flex-col items-center gap-1">
            <div
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                i < completedCount
                  ? "bg-emerald-400 scale-110"
                  : i === challengeIdx && phase === "challenge"
                    ? "bg-indigo-400 animate-pulse scale-110"
                    : "bg-white/25"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Completed badges */}
      {completedCount > 0 && (
        <div className="absolute top-14 left-0 right-0 flex justify-center gap-2 z-10">
          {completedLogs.map((log, i) => (
            <div key={log.type} className="bg-emerald-500/90 rounded-full px-3 py-1 text-white text-xs font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              {challenges[i]?.icon}
            </div>
          ))}
        </div>
      )}

      {/* ─── Bottom panel ────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-6 pt-20 pb-10 z-10">
        {phase === "loading" && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg font-medium">{loadProgress}</p>
          </div>
        )}

        {phase === "selfie" && (
          <div className="text-center">
            <p className="text-white text-xl font-bold mb-2">Stai nemișcat să facem un selfie</p>
            <p className="text-white/70 text-base">
              {metrics?.detected
                ? metrics.centered
                  ? "Perfect, menține poziția..."
                  : "Plasează fața în cercul din centru"
                : "Ține telefonul la nivelul feței"}
            </p>
            {metrics?.detected && metrics.centered && (
              <div className="mt-4 mx-auto w-56 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-150" style={{ width: `${(centerFrames / CENTER_REQUIRED) * 100}%` }} />
              </div>
            )}
          </div>
        )}

        {phase === "challenge" && currentChallenge && (
          <div className="text-center">
            <ChallengeAnimation type={currentChallenge.type} />
            <p className="text-white text-xl font-bold mt-4 mb-1">{currentChallenge.instruction}</p>
            <p className="text-white/40 text-sm mb-4">Provocare {challengeIdx + 1} din {totalChallenges}</p>
            <div className="mx-auto w-56 h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${progressPct > 60 ? "bg-emerald-400" : "bg-indigo-400"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {phase === "capturing" && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-emerald-400 text-lg font-semibold">Se capturează...</p>
          </div>
        )}

        {phase === "done" && (
          <div className="text-center">
            <svg className="w-16 h-16 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-emerald-400 text-lg font-semibold">Toate provocările completate!</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ─── Challenge Animations (large, visible) ────────────────────────────

function ChallengeAnimation({ type }: { type: ChallengeType }) {
  if (type === "turnLeft") {
    return (
      <div className="flex items-center justify-center gap-3">
        <div className="animate-bounce-horizontal-left">
          <svg className="w-16 h-16 text-indigo-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
          <svg className="w-10 h-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
        </div>
        <div className="w-16 h-16" />
      </div>
    );
  }

  if (type === "turnRight") {
    return (
      <div className="flex items-center justify-center gap-3">
        <div className="w-16 h-16" />
        <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
          <svg className="w-10 h-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
        </div>
        <div className="animate-bounce-horizontal-right">
          <svg className="w-16 h-16 text-indigo-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    );
  }

  if (type === "blink") {
    return (
      <div className="flex flex-col items-center">
        <div className="animate-blink-face">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-indigo-400/50 flex items-center justify-center">
            <span className="text-6xl leading-none">😉</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "smile") {
    return (
      <div className="flex flex-col items-center">
        <div className="animate-smile-pulse">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-indigo-400/50 flex items-center justify-center">
            <span className="text-6xl leading-none">😊</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "openMouth") {
    return (
      <div className="flex flex-col items-center">
        <div className="animate-mouth-open">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-indigo-400/50 flex items-center justify-center">
            <span className="text-6xl leading-none">😮</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
