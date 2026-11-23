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
  return (
    <div role="dialog" aria-modal="true" aria-label="Scanare act de identitate" className="fixed inset-0 z-[60] bg-black h-[100dvh]">
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
