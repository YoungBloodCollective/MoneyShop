import { useEffect, useMemo, useState } from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmClientListItem } from '@/types/crm.types';
import { FIELD_FOCUS, FOCUS_RING, matchesPhone } from '@/pages/crm/crmHelpers';
import { splitClientName } from './appointmentModel';

export interface PickedClient {
  userId: number;
  nume: string;
  prenume: string;
  telefon: string;
  email: string;
}


/**
 * "Client existent": search the broker's clients by name or phone and fill the booking form with
 * the chosen one, instead of retyping their details.
 */
export function ClientPicker({ onPick }: { onPick: (c: PickedClient | null) => void }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<CrmClientListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<CrmClientListItem | null>(null);

  useEffect(() => {
    if (!open || clients) return;
    let active = true;
    crmApi.getClients()
      .then(d => { if (active) setClients(d); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [open, clients]);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!clients || t.length < 2) return [];
    return clients
      .filter(c => c.fullName.toLowerCase().includes(t) || matchesPhone(c.phone, t))
      .slice(0, 6);
  }, [clients, q]);

  const choose = (c: CrmClientListItem) => {
    setPicked(c);
    setOpen(false);
    setQ('');
    onPick({ userId: c.userId, ...splitClientName(c.fullName), telefon: c.phone ?? '', email: c.email ?? '' });
  };

  if (picked) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2 text-emerald-800">
          <UserCheck className="h-4 w-4 shrink-0" />
          <span className="truncate">Client existent: <strong>{picked.fullName}</strong></span>
        </span>
        <button
          type="button"
          onClick={() => { setPicked(null); onPick(null); }}
          aria-label="Renunță la clientul ales"
          className={`rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 ${FOCUS_RING}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-brand-primary hover:text-brand-primary ${FOCUS_RING}`}
      >
        <Search className="h-4 w-4" /> Alege un client existent
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Caută după nume sau telefon"
          aria-label="Caută client după nume sau telefon"
          className={`w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 ${FIELD_FOCUS}`}
        />
        <button type="button" onClick={() => { setOpen(false); setQ(''); }} aria-label="Închide căutarea" className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 ${FOCUS_RING}`}>
          <X className="h-4 w-4" />
        </button>
      </div>
      {failed && <p className="px-1 pt-2 text-xs text-rose-600">Nu am putut încărca clienții.</p>}
      {!failed && !clients && <p className="px-1 pt-2 text-xs text-slate-400">Se încarcă clienții…</p>}
      {clients && q.trim().length >= 2 && matches.length === 0 && <p className="px-1 pt-2 text-xs text-slate-400">Niciun client găsit. Completează datele mai jos.</p>}
      {matches.length > 0 && (
        <ul className="mt-1 divide-y divide-slate-50">
          {matches.map(c => (
            <li key={c.userId}>
              <button type="button" onClick={() => choose(c)} className={`flex w-full flex-col items-start rounded-lg px-2 py-2 text-left hover:bg-slate-50 ${FOCUS_RING}`}>
                <span className="text-sm font-medium text-slate-800">{c.fullName}</span>
                <span className="text-xs text-slate-500">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
