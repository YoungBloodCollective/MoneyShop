import * as signalR from "@microsoft/signalr";
import type { OcrOnlyResult, FaceCompareResult, ActiveLivenessResult } from "../types";

const BASE = import.meta.env.VITE_KYC_API_URL || "https://kycybc.azurewebsites.net";

let connection: signalR.HubConnection | null = null;

interface Callbacks {
  onStatus: (status: string) => void;
  onOcrCompleted: (result: OcrOnlyResult) => void;
  onLivenessCompleted: (result: { decision: string }) => void;
  onActiveLivenessCompleted: (result: ActiveLivenessResult) => void;
  onCompareCompleted: (result: FaceCompareResult) => void;
  onFailed: (err: { error: string }) => void;
}

export async function connectToKycSession(sessionId: string, callbacks: Callbacks) {
  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${BASE}/kyc-hub`)
    .withAutomaticReconnect()
    .build();

  connection.on("StatusUpdate", callbacks.onStatus);
  connection.on("OcrCompleted", callbacks.onOcrCompleted);
  connection.on("LivenessCompleted", callbacks.onLivenessCompleted);
  connection.on("ActiveLivenessCompleted", callbacks.onActiveLivenessCompleted);
  connection.on("CompareCompleted", callbacks.onCompareCompleted);
  connection.on("KycFailed", callbacks.onFailed);

  await connection.start();
  await connection.invoke("JoinSession", sessionId);
}

export function disconnect() {
  if (connection) {
    connection.stop();
    connection = null;
  }
}
