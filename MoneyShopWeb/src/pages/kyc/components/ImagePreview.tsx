interface ImagePreviewProps {
  imageUrl: string;
  onRetry: () => void;
  onConfirm: () => void;
  label: string;
}

export default function ImagePreview({
  imageUrl,
  onRetry,
  onConfirm,
  label,
}: ImagePreviewProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 text-center">
        <p className="text-white font-medium text-lg">{label}</p>
        <p className="text-gray-400 text-sm mt-1">
          Verifică dacă imaginea este clară și completă
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <img
          src={imageUrl}
          alt={label}
          className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
        />
      </div>

      <div className="p-6 flex gap-4">
        <button
          onClick={onRetry}
          className="flex-1 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-lg active:bg-white/10 transition-colors"
        >
          Refă
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-4 rounded-xl bg-indigo-600 text-white font-semibold text-lg active:bg-indigo-700 transition-colors"
        >
          Confirmă
        </button>
      </div>
    </div>
  );
}
