import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, MapPin, Search, Share2, X } from 'lucide-react';
import { COUNTIES } from '@/lib/counties';
import { apiErrorMessage } from '@/services/api/brokersApi';
import {
  referralsApi, REFERRAL_NOTE_MAX,
  type BrokerDirectoryItem, type ReferralMode,
} from '@/services/api/referralsApi';
import { useDialogBehavior } from '@/components/crm/useDialogBehavior';
import { isAdminWorkspace } from '@/lib/crmPath';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';

const FIELD = `w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`;

const MODES: { key: ReferralMode; title: string; text: string }[] = [
  {
    key: 'Colaborare',
    title: 'Colaborare',
    text: 'Colegul lucrează cu clientul. Tu vezi cum avansează dosarele lui (bancă, tip, sumă, stadiu) și primești 50% din comisionul lui pentru ele.',
  },
  {
    key: 'Transfer',
    title: 'Transfer',
    text: 'Clientul trece la coleg. Nu mai vezi nimic despre el și nu primești comision.',
  },
];

function ReferralDialog({ clientUserId, clientName, onClose, onSent }: {
  clientUserId: number;
  clientName: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const panelRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState('');
  const [judet, setJudet] = useState('');
  const [results, setResults] = useState<BrokerDirectoryItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [picked, setPicked] = useState<BrokerDirectoryItem | null>(null);
  const [mode, setMode] = useState<ReferralMode>('Colaborare');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const dirty = picked !== null || note.trim() !== '';
  const requestClose = () => {
    if (sending) return;
    if (dirty && !window.confirm('Ai completat date nesalvate. Închizi fereastra?')) return;
    onClose();
  };
  useDialogBehavior(true, panelRef, requestClose);

  const canSearch = q.trim().length >= 2 || judet !== '';
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!canSearch) {
        setResults(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      referralsApi.searchBrokers({ q: q.trim() || undefined, judet: judet || undefined })
        .then(list => { if (active) { setResults(list); setSearchFailed(false); } })
        .catch(() => { if (active) { setResults([]); setSearchFailed(true); } })
        .finally(() => { if (active) setSearching(false); });
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [q, judet, canSearch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) { setError('Alege brokerul căruia îi trimiți clientul.'); return; }
    setError('');
    setSending(true);
    try {
      const sent = await referralsApi.send(clientUserId, { toBrokerProfileId: picked.id, mode, note: note.trim() || undefined });
      if (sent.smsSent || sent.emailSent) {
        toast.success(`Am trimis clientului cererea de acord (${[sent.smsSent && 'SMS', sent.emailSent && 'email'].filter(Boolean).join(' și ')}).`);
      } else {
        toast.error('Cererea e înregistrată, dar nu am putut trimite mesajul clientului. O poți anula din Colaborează și o poți relua.', { duration: 8000 });
      }
      onSent?.();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Nu am putut trimite cererea. Încearcă din nou.'));
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={requestClose}>
      <form
        ref={panelRef}
        onSubmit={submit}
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Colaborează / Transferă"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Colaborează / Transferă</h2>
          <button type="button" onClick={requestClose} disabled={sending} className={`rounded text-slate-400 hover:text-slate-700 ${FOCUS_RING}`} aria-label="Închide">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Trimiți clientul <span className="font-medium text-slate-700">{clientName}</span> unui coleg. Clientul primește un mesaj și trebuie să fie de acord; abia apoi colegul primește numele, telefonul și emailul lui.
        </p>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Către cine</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Nume sau oraș (ex. Cluj)"
                aria-label="Caută broker după nume sau oraș"
                className={`${FIELD} pl-9`}
                autoComplete="off"
              />
            </div>
            <select value={judet} onChange={e => setJudet(e.target.value)} aria-label="Județ" className={FIELD}>
              <option value="">Orice județ</option>
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {picked ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-3.5 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-800">{picked.displayName}</div>
                <div className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{[picked.oras, picked.judet].filter(Boolean).join(', ') || 'Oraș necompletat'}</div>
              </div>
              <button type="button" onClick={() => setPicked(null)} className={`shrink-0 rounded text-xs font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>Schimbă</button>
            </div>
          ) : (
            <div aria-live="polite" className="max-h-44 overflow-y-auto rounded-xl border border-slate-100">
              {searching ? (
                <p className="flex items-center gap-2 px-3.5 py-3 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Se caută...</p>
              ) : !canSearch ? (
                <p className="px-3.5 py-3 text-sm text-slate-400">Scrie cel puțin 2 litere sau alege județul.</p>
              ) : searchFailed ? (
                <p className="px-3.5 py-3 text-sm text-rose-600">Nu am putut căuta brokerii. Încearcă din nou.</p>
              ) : results && results.length === 0 ? (
                <p className="px-3.5 py-3 text-sm text-slate-400">Niciun broker găsit.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {(results ?? []).map(b => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setPicked(b)}
                        className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 ${FOCUS_RING}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800">{b.displayName}</span>
                          <span className="block truncate text-xs text-slate-500">{[b.oras, b.judet].filter(Boolean).join(', ') || 'Oraș necompletat'}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{b.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Cum</legend>
          <div className="space-y-2">
            {MODES.map(m => (
              <label
                key={m.key}
                className={`flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 text-sm ${mode === m.key ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <input type="radio" name="referral-mode" value={m.key} checked={mode === m.key} onChange={() => setMode(m.key)} className="mt-0.5 accent-brand-primary" />
                <span>
                  <span className="block font-semibold text-slate-800">{m.title}</span>
                  <span className="block text-slate-500">{m.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Notă pentru coleg <span className="font-normal text-slate-400">(opțional)</span></span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={REFERRAL_NOTE_MAX}
            rows={3}
            placeholder="Ce ar trebui să știe colegul, pe scurt."
            className={`${FIELD} resize-none`}
          />
          <span className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-400">
            <span>Fără date sensibile: CNP, serie de buletin, venituri sau conturi.</span>
            <span className="shrink-0">{note.length}/{REFERRAL_NOTE_MAX}</span>
          </span>
        </label>

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={requestClose} disabled={sending} className={`rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}>
            Anulează
          </button>
          <button type="submit" disabled={sending || !picked} className={`flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${FOCUS_RING}`}>
            {sending && <Loader2 size={15} className="animate-spin" />} Trimite cererea clientului
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReferralButton({ clientUserId, clientName, compact = false, onSent }: {
  clientUserId: number;
  clientName: string;
  compact?: boolean;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  if (isAdminWorkspace(pathname)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? `inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`
          : `inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${FOCUS_RING}`}
      >
        <Share2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> Colaborează / Transferă
      </button>
      {open && <ReferralDialog clientUserId={clientUserId} clientName={clientName} onClose={() => setOpen(false)} onSent={onSent} />}
    </>
  );
}
