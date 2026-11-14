import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { DisbursementRequest } from '@/services/api/adminApi';

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const FIELD = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none';

export function DisbursementModal({
  title, subtitle, onClose, onSubmit,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (data: DisbursementRequest) => Promise<void>;
}) {
  const [suma, setSuma] = useState('');
  const [comision, setComision] = useState('');
  const [data, setData] = useState(todayIso());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sumaNum = Number(suma);
    if (!suma || !Number.isFinite(sumaNum) || sumaNum <= 0) { setError('Suma aprobată trebuie să fie mai mare ca 0.'); return; }
    let comisionNum: number | undefined;
    if (comision !== '') {
      comisionNum = Number(comision);
      if (!Number.isFinite(comisionNum) || comisionNum < 0) { setError('Comisionul nu poate fi negativ.'); return; }
    }
    if (!data) { setError('Data debursării este obligatorie.'); return; }
    if (data > todayIso()) { setError('Data debursării nu poate fi în viitor.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSubmit({ sumaAprobata: sumaNum, comision: comisionNum, dataDisbursare: data });
    } catch {
      setError('Nu am putut salva debursarea. Încearcă din nou.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={() => { if (!saving) onClose(); }}>
      <form
        onSubmit={submit}
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-700" aria-label="Închide">
            <X size={18} />
          </button>
        </div>
        {subtitle && <p className="mb-4 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">Sumă aprobată (RON)</span>
            <input type="number" min="0" step="0.01" value={suma} onChange={e => setSuma(e.target.value)} className={FIELD} autoFocus />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">Comision (RON, opțional)</span>
            <input type="number" min="0" step="0.01" value={comision} onChange={e => setComision(e.target.value)} className={FIELD} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">Data debursării</span>
            <input type="date" max={todayIso()} value={data} onChange={e => setData(e.target.value)} className={FIELD} />
          </label>
        </div>
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Anulează
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />} Salvează debursarea
          </button>
        </div>
      </form>
    </div>
  );
}
