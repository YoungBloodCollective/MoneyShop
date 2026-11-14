import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { downloadBlob } from '@/lib/downloadBlob';

export interface DocumentPreviewSource {
  title: string;
  fileName: string;
  mimeType: string;
  load: () => Promise<Blob>;
}

type Loaded = { blob: Blob; url: string; isPdf: boolean } | { failed: true };

export function DocumentPreviewModal({ source, onClose }: { source: DocumentPreviewSource; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<Loaded | null>(null);
  const { load, mimeType } = source;

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    load()
      .then(blob => {
        if (!active) return;
        const isPdf = mimeType === 'application/pdf' || blob.type === 'application/pdf';
        const typed = new Blob([blob], { type: isPdf ? 'application/pdf' : blob.type });
        objectUrl = URL.createObjectURL(typed);
        setResult({ blob: typed, url: objectUrl, isPdf });
      })
      .catch(() => { if (active) setResult({ failed: true }); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [load, mimeType]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => { previous?.focus?.(); };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const loaded = result && 'blob' in result ? result : null;
  const failed = !!result && 'failed' in result;
  const isPdf = !!loaded?.isPdf;
  const isImage = !isPdf && (mimeType.startsWith('image/') || !!loaded?.blob.type.startsWith('image/'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={source.title}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="min-w-0 truncate text-sm font-semibold text-slate-800">{source.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => loaded && downloadBlob(loaded.blob, source.fileName)}
              disabled={!loaded}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Descarcă
            </button>
            <button onClick={onClose} aria-label="Închide" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-slate-50">
          {!result && <Loader2 role="status" className="h-6 w-6 animate-spin text-slate-400" aria-label="Se încarcă" />}
          {failed && <p className="px-6 text-sm text-rose-600">Nu am putut încărca documentul.</p>}
          {loaded && isImage && <img src={loaded.url} alt={source.title} className="max-h-[75vh] max-w-full object-contain" />}
          {loaded && isPdf && <iframe src={loaded.url} title={source.title} className="h-[75vh] w-full border-0 bg-white" />}
          {loaded && !isImage && !isPdf && <p className="px-6 py-10 text-sm text-slate-500">Previzualizarea nu este disponibilă pentru acest tip de fișier. Descarcă documentul pentru a-l deschide.</p>}
        </div>
      </div>
    </div>
  );
}
