declare module '@mediapipe/tasks-vision' {
  export class FaceLandmarker {
    static createFromOptions(vision: unknown, options: unknown): Promise<FaceLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult;
    close(): void;
  }
  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<unknown>;
  }
  export interface FaceLandmarkerResult {
    faceLandmarks?: NormalizedLandmark[][];
    faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
  }
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
  }
}
