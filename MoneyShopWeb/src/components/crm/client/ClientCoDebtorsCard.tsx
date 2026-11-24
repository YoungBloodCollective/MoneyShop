import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { apiErrorMessage } from '@/services/api/brokersApi';
import {
  CO_DEBTOR_RELATIONS, codebitoriApi,
  type CoDebtorCandidate, type CoDebtorItem, type CoDebtorRelation, type CoDebtorsView,
} from '@/services/api/codebitoriApi';
import { useDialogBehavior } from '@/components/crm/useDialogBehavior';
import { useCrmPath } from '@/lib/crmPath';
import { dateShort, FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';

const FIELD = `w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`;

function AddCoDebtorDialog({ clientUserId, onClose, onAdded }: {
  clientUserId: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const panelRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CoDebtorCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [picked, setPicked] = useState<CoDebtorCandidate | null>(null);
  const [relation, setRelation] = useState<CoDebtorRelation | ''>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const requestClose = () => { if (!saving) onClose(); };
  useDialogBehavior(true, panelRef, requestClose);

  const canSearch = q.trim().length === 0 || q.trim().length >= 2;
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!canSearch) return;
      setSearching(true);
      codebitoriApi.candidates(clientUserId, q.trim())
        .then(list => { if (active) { setResults(list); setSearchFailed(false); } })
        .catch(() => { if (active) { setResults([]); setSearchFailed(true); } })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [q, clientUserId, canSearch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) { setError('Alege clientul pe care îl adaugi drept codebitor.'); return; }
    if (!relation) { setError('Alege relația dintre cei doi clienți.'); return; }
    setError('');
    setSaving(true);
    try {
      await codebitoriApi.add(clientUserId, { coDebtorUserId: picked.userId, relation });
      toast.success('Codebitor adăugat.');
      onAdded();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Nu am putut adăuga codebitorul. Încearcă din nou.'));
      setSaving(false);
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
        aria-label="Adaugă codebitor"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Adaugă codebitor</h2>
          <button type="button" onClick={requestClose} disabled={saving} className={`rounded text-slate-400 hover:text-slate-700 ${FOCUS_RING}`} aria-label="Închide">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Alege unul dintre clienții tăi care au semnat deja acordul și spune ce este față de acest client.</p>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Cine</legend>
          {picked ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-3.5 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-800">{picked.fullName}</div>
                <div className="truncate text-xs text-slate-500">{picked.phone || 'Fără telefon'}</div>
              </div>
              <button type="button" onClick={() => setPicked(null)} className={`shrink-0 rounded text-xs font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>Schimbă</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Nume sau telefon"
                  aria-label="Caută client după nume sau telefon"
                  className={`${FIELD} pl-9`}
                  autoComplete="off"
                />
              </div>
              <div aria-live="polite" className="max-h-52 overflow-y-auto rounded-xl border border-slate-100">
                {searching && !results ? (
                  <p className="flex items-center gap-2 px-3.5 py-3 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Se caută...</p>
                ) : !canSearch ? (
                  <p className="px-3.5 py-3 text-sm text-slate-400">Scrie cel puțin 2 caractere.</p>
                ) : searchFailed ? (
                  <p className="px-3.5 py-3 text-sm text-rose-600">Nu am putut căuta clienții. Încearcă din nou.</p>
                ) : results && results.length === 0 ? (
                  <p className="px-3.5 py-3 text-sm text-slate-400">Niciun client cu acord semnat găsit.</p>
                ) : (
                  <ul className={`divide-y divide-slate-50 ${searching ? 'opacity-60' : ''}`}>
                    {(results ?? []).map(c => (
                      <li key={c.userId}>
                        <button
                          type="button"
                          onClick={() => setPicked(c)}
                          className={`flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left hover:bg-slate-50 ${FOCUS_RING}`}
                        >
                          <span className="block max-w-full truncate text-sm font-medium text-slate-800">{c.fullName}</span>
                          <span className="block max-w-full truncate text-xs text-slate-500">
                            {c.phone || 'Fără telefon'}{c.acordSignedAt ? ` · acord semnat la ${dateShort(c.acordSignedAt)}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </fieldset>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Ce este față de client</span>
          <select value={relation} onChange={e => setRelation(e.target.value as CoDebtorRelation | '')} className={FIELD}>
            <option value="">Alege relația</option>
            {CO_DEBTOR_RELATIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={requestClose} disabled={saving} className={`rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}>
            Anulează
          </button>
          <button type="submit" disabled={saving || !picked || !relation} className={`flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${FOCUS_RING}`}>
            {saving && <Loader2 size={15} className="animate-spin" />} Adaugă
          </button>
        </div>
      </form>
    </div>
  );
}

function PersonRow({ item, onRemove }: { item: CoDebtorItem; onRemove?: () => void }) {
  const crm = useCrmPath();
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={crm(`/crm/clienti/${item.userId}`)} className={`max-w-full truncate rounded font-semibold text-slate-800 hover:text-brand-primary hover:underline ${FOCUS_RING}`}>
            {item.fullName}
          </Link>
          <span className="inline-flex whitespace-nowrap rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary">{item.relationLabel}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          {item.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{item.phone}</span>}
          {item.acordSignedAt && <span>acord semnat la {dateShort(item.acordSignedAt)}</span>}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Elimină codebitorul ${item.fullName}`}
          className={`shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 ${FOCUS_RING}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export function ClientCoDebtorsCard({ userId }: { userId: number }) {
  const [view, setView] = useState<CoDebtorsView | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    codebitoriApi.list(userId)
      .then(v => { setView(v); setFailed(false); })
      .catch(() => setFailed(true));
  }, [userId]);

  useEffect(() => {
    let active = true;
    codebitoriApi.list(userId)
      .then(v => { if (active) { setView(v); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId]);

  const remove = async (item: CoDebtorItem) => {
    if (!window.confirm(`Elimini codebitorul ${item.fullName}?`)) return;
    try {
      await codebitoriApi.remove(userId, item.id);
      toast.success('Codebitor eliminat.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut elimina codebitorul.'));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-primary" />
          <h2 className="text-sm font-semibold text-slate-800">Codebitori</h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}
        >
          <Plus className="h-4 w-4" /> Codebitor
        </button>
      </div>

      {failed && !view ? (
        <p className="py-3 text-sm text-rose-600">Nu am putut încărca codebitorii. <button type="button" onClick={load} className={`rounded font-medium underline ${FOCUS_RING}`}>Încearcă din nou</button></p>
      ) : !view ? (
        <p className="flex items-center gap-2 py-3 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Se încarcă...</p>
      ) : (
        <>
          {view.coDebtors.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">Niciun codebitor. Adaugă un client care a semnat deja acordul.</p>
          ) : (
            <ul className="space-y-2">
              {view.coDebtors.map(c => <PersonRow key={c.id} item={c} onRemove={() => { void remove(c); }} />)}
            </ul>
          )}
          {view.coDebtorFor.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Este codebitor pentru</h3>
              <ul className="space-y-2">
                {view.coDebtorFor.map(c => <PersonRow key={c.id} item={c} />)}
              </ul>
            </div>
          )}
        </>
      )}

      {adding && <AddCoDebtorDialog clientUserId={userId} onClose={() => setAdding(false)} onAdded={load} />}
    </div>
  );
}
