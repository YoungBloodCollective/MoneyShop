import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let instance: FaceLandmarker | null = null;
let loading: Promise<FaceLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (instance) return instance;
  if (loading) return loading;

  loading = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
    const fl = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    });
    instance = fl;
    return fl;
  })();

  return loading;
}

export function destroyFaceLandmarker() {
  if (instance) {
    instance.close();
    instance = null;
    loading = null;
  }
}

// ─── Face metrics extracted each frame ────────────────────────────────

export interface FaceMetrics {
  detected: boolean;
  centered: boolean;
  headYaw: number;       // -1 (right) to +1 (left) in mirrored display
  headPitch: number;     // -1 (down) to +1 (up)
  eyeBlinkScore: number; // 0..1, higher = more closed
  smileScore: number;    // 0..1, higher = bigger smile
  mouthOpenScore: number;
}

const EMPTY_METRICS: FaceMetrics = {
  detected: false,
  centered: false,
  headYaw: 0,
  headPitch: 0,
  eyeBlinkScore: 0,
  smileScore: 0,
  mouthOpenScore: 0,
};

export function extractMetrics(result: FaceLandmarkerResult): FaceMetrics {
  if (!result.faceLandmarks?.length) return EMPTY_METRICS;

  const lm = result.faceLandmarks[0];
  const bs = result.faceBlendshapes?.[0]?.categories;

  const blendMap = new Map<string, number>();
  if (bs) {
    for (const c of bs) blendMap.set(c.categoryName, c.score);
  }

  const nose = lm[1];
  const centered = isCentered(nose);

  const headYaw = computeYaw(lm);
  const headPitch = computePitch(lm);

  const eyeBlinkL = blendMap.get("eyeBlinkLeft") ?? 0;
  const eyeBlinkR = blendMap.get("eyeBlinkRight") ?? 0;
  const eyeBlinkScore = (eyeBlinkL + eyeBlinkR) / 2;

  const smileL = blendMap.get("mouthSmileLeft") ?? 0;
  const smileR = blendMap.get("mouthSmileRight") ?? 0;
  const smileScore = (smileL + smileR) / 2;

  const mouthOpenScore = blendMap.get("jawOpen") ?? 0;

  return {
    detected: true,
    centered,
    headYaw,
    headPitch,
    eyeBlinkScore,
    smileScore,
    mouthOpenScore,
  };
}

function isCentered(nose: NormalizedLandmark): boolean {
  return nose.x > 0.3 && nose.x < 0.7 && nose.y > 0.25 && nose.y < 0.75;
}

/**
 * Compute yaw from landmark positions.
 * In raw camera coords (not mirrored):
 *  - person turns THEIR left  → nose.x increases (moves right in raw frame)
 *  - person turns THEIR right → nose.x decreases
 *
 * We return values in "mirrored display" space so positive = user's left.
 */
function computeYaw(lm: NormalizedLandmark[]): number {
  const nose = lm[1];
  const leftEdge = lm[234];  // camera-left = person's right cheek
  const rightEdge = lm[454]; // camera-right = person's left cheek

  const faceWidth = rightEdge.x - leftEdge.x;
  if (faceWidth < 0.01) return 0;

  const noseRatio = (nose.x - leftEdge.x) / faceWidth; // 0..1, ~0.5 centered
  // Raw offset: 0.5 = centered, >0.5 = nose shifted right (person turned left)
  // Scale to -1..+1 for display-mirrored space
  return (noseRatio - 0.5) * 4; // amplify, clamp later
}

function computePitch(lm: NormalizedLandmark[]): number {
  const nose = lm[1];
  const forehead = lm[10];
  const chin = lm[152];

  const faceHeight = chin.y - forehead.y;
  if (faceHeight < 0.01) return 0;

  const noseRatio = (nose.y - forehead.y) / faceHeight;
  return (0.55 - noseRatio) * 4; // higher = looking up
}

// ─── Challenge definitions ────────────────────────────────────────────

export type ChallengeType = "turnLeft" | "turnRight" | "blink" | "smile" | "openMouth";

export interface ChallengeDefinition {
  type: ChallengeType;
  instruction: string;
  detect: (m: FaceMetrics) => boolean;
  requiredFrames: number; // consecutive frames needed
  icon: string;
}

export const ALL_CHALLENGES: ChallengeDefinition[] = [
  {
    type: "turnLeft",
    instruction: "Întoarce capul la stânga",
    detect: (m) => m.headYaw > 0.6,
    requiredFrames: 8,
    icon: "👈",
  },
  {
    type: "turnRight",
    instruction: "Întoarce capul la dreapta",
    detect: (m) => m.headYaw < -0.6,
    requiredFrames: 8,
    icon: "👉",
  },
  {
    type: "blink",
    instruction: "Clipește din ochi",
    detect: (m) => m.eyeBlinkScore > 0.45,
    requiredFrames: 3,
    icon: "😉",
  },
  {
    type: "smile",
    instruction: "Zâmbește",
    detect: (m) => m.smileScore > 0.55,
    requiredFrames: 8,
    icon: "😊",
  },
  {
    type: "openMouth",
    instruction: "Deschide gura",
    detect: (m) => m.mouthOpenScore > 0.45,
    requiredFrames: 6,
    icon: "😮",
  },
];

export function pickRandomChallenges(count = 3): ChallengeDefinition[] {
  const shuffled = [...ALL_CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
