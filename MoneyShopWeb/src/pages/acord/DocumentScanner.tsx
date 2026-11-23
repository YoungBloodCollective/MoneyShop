import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Camera from '@/pages/kyc/components/Camera';
import DocumentOverlay from '@/pages/kyc/components/DocumentOverlay';

interface DocumentScannerProps {
  instruction: string;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  onUnavailable: () => void;
}

export function DocumentScanner({ instruction, onCapture, onClose, onUnavailable }: DocumentScannerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Scanare act de identitate"
      className="fixed inset-0 z-[60] bg-black h-[100dvh] outline-none"
    >
      <Camera
        facingMode="environment"
        onCapture={onCapture}
        overlay={<DocumentOverlay />}
        instruction={instruction}
        onCameraError={onUnavailable}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Închide camera"
        className="absolute top-3 right-3 z-30 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center"
      >
        <X size={22} />
      </button>
    </div>
  );
}
