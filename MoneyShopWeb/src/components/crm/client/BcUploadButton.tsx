import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { UploadCloud } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';

/** The broker uploads the client's Biroul de Credit report (PDF); it is read automatically. */
export function BcUploadButton({ userId, hasReport, onUploaded }: {
  userId: number;
  hasReport: boolean;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) { toast.error('Raportul BC trebuie să fie PDF.'); return; }
    setBusy(true);
    try {
      const res = await crmApi.uploadBcReport(userId, file);
      toast.success(res.ficoScore != null ? `Raport BC citit. Scor FICO: ${res.ficoScore}.` : 'Raport BC încărcat.');
      if (res.parseWarnings?.length) toast(`Atenție: ${res.parseWarnings.length} câmpuri nu au putut fi citite complet.`, { icon: '⚠️' });
      onUploaded();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message as string | undefined) : undefined;
      toast.error(msg || 'Nu am putut încărca raportul BC.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onPick} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-brand-primary hover:text-brand-primary disabled:opacity-50 ${FOCUS_RING}`}
      >
        <UploadCloud className="h-4 w-4" />
        {busy ? 'Se citește raportul…' : hasReport ? 'Încarcă un raport BC mai nou' : 'Încarcă raportul BC (PDF)'}
      </button>
    </>
  );
}
