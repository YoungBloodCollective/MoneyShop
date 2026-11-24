import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { acordApi, type AcordIdScan } from '@/services/api/acordApi';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const TIP_ACT_SIMPLA = 'carte_identitate_simpla';
const TIP_ACT_ELECTRONICA = 'carte_identitate_electronica';
const MAX_IMAGE_DIMENSION = 2000;
const COMPRESSED_QUALITY = 0.82;
const FAILURES_BEFORE_MANUAL = 2;
const UNREADABLE = 'Nu am putut citi actul, încearcă o poză mai clară.';

export type SlotKey = 'front' | 'back' | 'proof';
export type ScanFiles = Record<SlotKey, File | null>;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', COMPRESSED_QUALITY),
    );
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('ro-RO')
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('ro-RO'));
}

export function scannedNames(scan: AcordIdScan | null): { nume: string; prenume: string } {
  if (!scan?.readable) return { nume: '', prenume: '' };
  return { nume: titleCase(scan.lastName ?? ''), prenume: titleCase(scan.firstName ?? '') };
}

function frontOnly(scan: AcordIdScan | null): AcordIdScan | null {
  if (!scan || !scan.isNewFormat) return scan;
  return { ...scan, tipAct: null, needsProofOfAddress: false, needsBack: true };
}

function scanErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.status === 400) {
    const body = err.response.data as { message?: string } | string | undefined;
    const msg = typeof body === 'string' ? body : body?.message;
    if (msg) return msg;
  }
  return UNREADABLE;
}

export function useIdScan() {
  const [files, setFiles] = useState<ScanFiles>({ front: null, back: null, proof: null });
  const [scan, setScan] = useState<AcordIdScan | null>(null);
  const [reading, setReading] = useState(false);
  const [manual, setManual] = useState(false);
  const [electronic, setElectronic] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [cameraSlot, setCameraSlot] = useState<'front' | 'back' | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const requestRef = useRef(0);
  const failuresRef = useRef(0);

  const runScan = useCallback(async (request: number, front: File, back: File | null) => {
    setReading(true);
    setMessage('');
    let failure: string | null = null;
    try {
      const result = await acordApi.idScan(front, back);
      if (request !== requestRef.current) return;
      if (result.readable) {
        failuresRef.current = 0;
        setScan(result);
      } else {
        failure = result.problems[0] || UNREADABLE;
      }
    } catch (err) {
      if (request !== requestRef.current) return;
      failure = scanErrorMessage(err);
    }
    setReading(false);
    if (failure === null) return;
    const total = ++failuresRef.current;
    if (total >= FAILURES_BEFORE_MANUAL) {
      setManual(true);
      setMessage('Nu am reușit să citim automat actul. Încarcă pozele manual.');
    } else {
      setMessage(failure);
    }
  }, []);

  const accept = useCallback(async (file: File): Promise<File | null> => {
    const prepared = await compressImage(file);
    if (prepared.size > MAX_FILE_BYTES) {
      setMessage(`${file.name}: fișierul depășește 10MB.`);
      return null;
    }
    return prepared;
  }, []);

  const pick = useCallback(async (slot: SlotKey, file: File | undefined) => {
    if (!file) return;
    const request = ++requestRef.current;
    const prepared = await accept(file);
    if (request !== requestRef.current) return;
    if (!prepared) return;
    setMessage('');
    if (manual || slot === 'proof') {
      setFiles(prev => ({ ...prev, [slot]: prepared }));
      return;
    }
    if (slot === 'front') {
      setScan(null);
      setFiles({ front: prepared, back: null, proof: null });
      await runScan(request, prepared, null);
    } else {
      if (!files.front) return;
      setScan(frontOnly);
      setFiles(prev => ({ ...prev, back: prepared, proof: null }));
      await runScan(request, files.front, prepared);
    }
  }, [accept, manual, files.front, runScan]);

  const capture = useCallback(async (blob: Blob) => {
    const slot = cameraSlot;
    setCameraSlot(null);
    if (!slot) return;
    const name = slot === 'front' ? 'buletin-fata.jpg' : 'buletin-verso.jpg';
    await pick(slot, new File([blob], name, { type: 'image/jpeg' }));
  }, [cameraSlot, pick]);

  const openCamera = useCallback((slot: 'front' | 'back') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraDenied(true);
      setMessage('Camera nu este disponibilă pe acest dispozitiv. Încarcă o poză.');
      return;
    }
    setMessage('');
    setCameraSlot(slot);
  }, []);

  const closeCamera = useCallback(() => setCameraSlot(null), []);

  const cameraUnavailable = useCallback(() => {
    setCameraSlot(null);
    setCameraDenied(true);
    setMessage('Nu avem acces la cameră. Încarcă o poză cu actul.');
  }, []);

  const redo = useCallback((slot: 'front' | 'back') => {
    requestRef.current++;
    setReading(false);
    setMessage('');
    if (slot === 'front') {
      setScan(null);
      setFiles({ front: null, back: null, proof: null });
    } else {
      setScan(frontOnly);
      setFiles(prev => ({ ...prev, back: null, proof: null }));
    }
  }, []);

  const chooseElectronic = useCallback((value: boolean) => {
    setElectronic(value);
    if (!value) setFiles(prev => ({ ...prev, proof: null }));
  }, []);

  const needsBack = manual ? true : !!scan?.needsBack;
  const needsProof = manual ? electronic === true : !!scan?.needsProofOfAddress;
  const tipAct = manual ? (electronic ? TIP_ACT_ELECTRONICA : TIP_ACT_SIMPLA) : scan?.tipAct ?? null;

  // Proof of address is optional: it is offered when the card has no address, never demanded.
  const complete = manual
    ? electronic !== null && !!files.front && !!files.back
    : !reading && !!files.front && !!scan?.readable && !!scan.tipAct && (!needsBack || !!files.back);

  const missing: string[] = [];
  if (manual) {
    if (electronic === null) missing.push('dacă actul are cip');
    if (!files.front) missing.push('poza cu fața actului');
    if (!files.back) missing.push('poza cu versoul actului');
  } else if (!files.front) {
    missing.push('poza cu fața actului');
  } else if (reading) {
    missing.push('citirea actului');
  } else if (!scan) {
    missing.push('o poză clară a actului');
  } else if (needsBack && !files.back) {
    missing.push('poza cu versoul actului');
  } else if (!scan.tipAct) {
    missing.push('citirea versoului actului');
  }

  const submitFiles = {
    front: files.front,
    back: needsBack ? files.back : null,
    proof: needsProof ? files.proof : null,
  };

  return {
    files, scan, reading, manual, electronic, message, cameraSlot, cameraDenied,
    tipAct, complete, missing, needsBack, needsProof, submitFiles,
    pick, capture, openCamera, closeCamera, cameraUnavailable, redo, chooseElectronic,
  };
}
