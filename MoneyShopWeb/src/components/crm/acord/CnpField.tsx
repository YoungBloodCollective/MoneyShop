import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { acordApi } from '@/services/api/acordApi';

export function CnpField({ acordId, masked, available }: { acordId: string; masked?: string | null; available: boolean }) {
  const [cnp, setCnp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    setLoading(true);
    try {
      setCnp(await acordApi.adminRevealCnp(acordId));
    } catch {
      toast.error('Nu s-a putut afișa CNP-ul');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className={cnp ? 'font-mono' : undefined}>{cnp ?? masked ?? '—'}</span>
      {available && !cnp && (
        <button
          onClick={reveal}
          disabled={loading}
          title="Afișarea CNP-ului complet se înregistrează"
          className="shrink-0 text-slate-400 hover:text-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
        </button>
      )}
      {cnp && (
        <button onClick={() => setCnp(null)} title="Ascunde" className="shrink-0 text-slate-400 hover:text-slate-700">
          <EyeOff size={14} />
        </button>
      )}
    </span>
  );
}
