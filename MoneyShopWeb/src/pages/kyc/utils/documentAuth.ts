export interface AuthenticityResult {
  isLikelyScreen: boolean;
  confidence: number;
  warnings: string[];
}

/**
 * Analyzes a captured document image for signs of screen/paper capture.
 * Uses moiré pattern detection and color channel analysis.
 */
export async function analyzeDocumentAuthenticity(
  imageBlob: Blob
): Promise<AuthenticityResult> {
  const img = await createImageBitmap(imageBlob);
  const canvas = document.createElement("canvas");
  const w = Math.min(img.width, 400);
  const h = Math.min(img.height, 300);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;
  const warnings: string[] = [];

  const gray: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    gray.push(
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    );
  }

  // 1. Moiré detection: periodic patterns in horizontal scan lines
  const moireScore = detectMoire(gray, w, h);
  if (moireScore > 0.45) warnings.push("Tipar periodic detectat (posibil ecran)");

  // 2. Color variance — very flat = possible paper copy
  let rMean = 0, gMean = 0, bMean = 0;
  const n = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    rMean += pixels[i];
    gMean += pixels[i + 1];
    bMean += pixels[i + 2];
  }
  rMean /= n;
  gMean /= n;
  bMean /= n;

  let rVar = 0, gVar = 0, bVar = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    rVar += (pixels[i] - rMean) ** 2;
    gVar += (pixels[i + 1] - gMean) ** 2;
    bVar += (pixels[i + 2] - bMean) ** 2;
  }
  rVar = Math.sqrt(rVar / n);
  gVar = Math.sqrt(gVar / n);
  bVar = Math.sqrt(bVar / n);

  const avgVar = (rVar + gVar + bVar) / 3;
  if (avgVar < 15) warnings.push("Culori neobișnuit de uniforme (posibil copie)");

  // 3. Blue light dominance (screens emit more blue)
  const totalMean = (rMean + gMean + bMean) / 3;
  if (totalMean > 0) {
    const blueRatio = bMean / totalMean;
    if (blueRatio > 1.15) warnings.push("Lumină albastră ridicată (posibil ecran)");
  }

  const isLikelyScreen = warnings.length >= 2;
  const confidence = Math.min(moireScore + warnings.length * 0.2, 1);

  return { isLikelyScreen, confidence, warnings };
}

function detectMoire(gray: number[], w: number, h: number): number {
  const sampleYs = [0.2, 0.35, 0.5, 0.65, 0.8].map((f) =>
    Math.floor(f * h)
  );
  let totalScore = 0;

  for (const y of sampleYs) {
    const offset = y * w;
    const line = gray.slice(offset, offset + w);

    const diffs: number[] = [];
    for (let x = 1; x < line.length; x++) {
      diffs.push(line[x] - line[x - 1]);
    }

    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance =
      diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length;

    if (variance < 1) continue;

    let maxCorr = 0;
    for (let lag = 2; lag <= 10; lag++) {
      let corr = 0;
      for (let i = 0; i < diffs.length - lag; i++) {
        corr += (diffs[i] - mean) * (diffs[i + lag] - mean);
      }
      corr /= (diffs.length - lag) * variance;
      maxCorr = Math.max(maxCorr, Math.abs(corr));
    }

    totalScore += maxCorr;
  }

  return totalScore / sampleYs.length;
}
