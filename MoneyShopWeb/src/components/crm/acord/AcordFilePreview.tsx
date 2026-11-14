import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { acordApi, type AcordFileInfo } from '@/services/api/acordApi';
import { fileLabel, formatDateTime } from './acordLabels';

export function AcordFilePreview({ file }: { file: AcordFileInfo }) {
  const isImage = file.mimeType.startsWith('image/');
  const shouldLoad = !file.isDeleted && isImage;

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(shouldLoad);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!shouldLoad) return;
    let objectUrl: string | null = null;
    acordApi.adminFileBlob(file.fileId)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.fileId, shouldLoad]);

  const handleDownload = async () => {
    try {
      const blob = await acordApi.adminFileBlob(file.fileId);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Nu s-a putut descărca fișierul');
    }
  };

  if (file.isDeleted) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-600">{fileLabel(file.fileType)}</p>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Trash2 size={16} />
          <span>Șters automat la expirarea perioadei de păstrare</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">{fileLabel(file.fileType)}</p>
        <button onClick={handleDownload} className="text-slate-400 hover:text-slate-700" title="Descarcă">
          <Download size={16} />
        </button>
      </div>
      {isImage ? (
        <div className="flex min-h-[120px] items-center justify-center overflow-hidden rounded-xl bg-slate-50">
          {loading && <Loader2 size={22} className="animate-spin text-slate-400" />}
          {failed && <span className="text-sm text-rose-600">Nu s-a putut încărca</span>}
          {url && <img src={url} alt={fileLabel(file.fileType)} className="max-h-72 w-full object-contain" />}
        </div>
      ) : (
        <button onClick={handleDownload} className="flex items-center gap-2 text-sm text-brand-primary">
          <FileText size={16} /> {file.fileName}
        </button>
      )}
      <p className="mt-2 text-xs text-slate-400">Expiră: {formatDateTime(file.expiresAt)}</p>
    </div>
  );
}
