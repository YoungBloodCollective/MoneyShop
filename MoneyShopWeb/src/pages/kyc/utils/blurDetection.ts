/**
 * Blur detection via Laplacian variance.
 *
 * Downscales a video frame to a small grayscale image, applies a 3×3 Laplacian
 * kernel, and returns the variance of the result.  Higher variance → sharper image.
 *
 * Usage: call `computeSharpness(video, canvas)` inside a requestAnimationFrame loop.
 * The caller should supply a persistent offscreen canvas (avoids creating one per frame).
 */

const ANALYSIS_WIDTH = 320; // px – small enough for fast computation

/**
 * Laplacian kernel weights (3×3):
 *   0  1  0
 *   1 -4  1
 *   0  1  0
 */
function laplacianVariance(gray: Uint8ClampedArray, w: number, h: number): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const lap =
        gray[idx - w] +         // top
        gray[idx - 1] +         // left
        -4 * gray[idx] +        // center
        gray[idx + 1] +         // right
        gray[idx + w];           // bottom

      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean; // variance
}

/**
 * Compute sharpness of the current video frame.
 *
 * @param video   - The HTMLVideoElement being streamed
 * @param canvas  - A reusable offscreen canvas (will be resized internally)
 * @returns A sharpness score (higher = sharper). Typically 0–500+.
 */
export function computeSharpness(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): number {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw === 0 || vh === 0) return 0;

  const scale = Math.min(1, ANALYSIS_WIDTH / vw);
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data; // RGBA

  // Convert to grayscale (luminance)
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return laplacianVariance(gray, w, h);
}

/** Sharpness threshold – frames below this are considered blurry. Tunable. */
export const SHARPNESS_THRESHOLD = 15;
