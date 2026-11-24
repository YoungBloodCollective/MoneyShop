import { useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { commissionApi } from '@/services/api/commissionApi';
import { apiErrorMessage } from '@/services/api/brokersApi';
import type { BankTiersResult, CommissionTierRow, TierCreditType } from '@/types/commission.types';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';

const INPUT = `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`;
const BTN_PRIMARY = `inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`;
const BTN_GHOST = `inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`;
const LABEL = 'block text-xs text-slate-500';

interface DraftRow { from: string; to: string; percent: string }

const TYPES: { type: TierCreditType; label: string }[] = [
  { type: 'NP', label: 'Nevoi personale (NP)' },
  { type: 'IP', label: 'Ipotecar (IP)' },
];

const amountText = (n: number | null) => (n == null ? '' : String(n));

function toDraft(rows: CommissionTierRow[]): DraftRow[] {
  return rows.map(r => ({ from: amountText(r.from), to: amountText(r.to), percent: amountText(r.percent) }));
}

function parseNumber(value: string): number | null {
  const v = value.trim().replace(/\s/g, '').replace(',', '.');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Mirrors the server rules: from < to, percents 0–100, ascending, no overlap, only the last tier open-ended. */
function parseRows(draft: DraftRow[]): { rows?: CommissionTierRow[]; error?: string } {
  const rows: CommissionTierRow[] = [];
  for (let i = 0; i < draft.length; i++) {
    const n = i + 1;
    const from = parseNumber(draft[i].from);
    const to = parseNumber(draft[i].to);
    const percent = parseNumber(draft[i].percent);
    if (from == null || Number.isNaN(from) || from < 0) return { error: `Pragul ${n}: completează o valoare de început validă.` };
    if (Number.isNaN(to) || (to != null && to <= from)) return { error: `Pragul ${n}: valoarea de final trebuie să fie mai mare decât cea de început.` };
    if (percent == null || Number.isNaN(percent) || percent < 0 || percent > 100) return { error: `Pragul ${n}: comisionul trebuie să fie între 0 și 100%.` };
    rows.push({ from, to, percent });
  }
  rows.sort((a, b) => a.from - b.from);
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    if (prev.to == null) return { error: 'Doar ultimul prag poate fi fără limită superioară.' };
    if (rows[i].from < prev.to) return { error: `Pragurile ${i} și ${i + 1} se suprapun.` };
  }
  return { rows };
}

function TypeBlock({ bankId, bankName, type, label, initial, onSaved }: {
  bankId: number;
  bankName: string;
  type: TierCreditType;
  label: string;
  initial: CommissionTierRow[];
  onSaved: (rows: CommissionTierRow[]) => void;
}) {
  const [draft, setDraft] = useState<DraftRow[]>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const update = (i: number, patch: Partial<DraftRow>) => setDraft(d => d.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    const parsed = parseRows(draft);
    if (!parsed.rows) { toast.error(parsed.error ?? 'Pragurile nu sunt valide.'); return; }
    setSaving(true);
    try {
      const saved = await commissionApi.saveTiers(bankId, type, parsed.rows);
      setDraft(toDraft(saved));
      onSaved(saved);
      toast.success(`${bankName}, ${type}: praguri salvate`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva pragurile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      {draft.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Fără praguri: se aplică comisionul implicit al băncii sau cel setat de broker.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {draft.map((r, i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-2 md:grid-cols-[1fr_1fr_8rem_auto]">
              <label className={LABEL}>
                De la (lei)
                <input inputMode="decimal" value={r.from} onChange={e => update(i, { from: e.target.value })} aria-label={`${type}, pragul ${i + 1}: de la`} className={`${INPUT} mt-1`} />
              </label>
              <label className={LABEL}>
                Până la (lei)
                <input inputMode="decimal" value={r.to} onChange={e => update(i, { to: e.target.value })} placeholder="fără limită" aria-label={`${type}, pragul ${i + 1}: până la`} className={`${INPUT} mt-1`} />
              </label>
              <label className={LABEL}>
                Comision (%)
                <input inputMode="decimal" value={r.percent} onChange={e => update(i, { percent: e.target.value })} aria-label={`${type}, pragul ${i + 1}: comision`} className={`${INPUT} mt-1`} />
              </label>
              <button type="button" onClick={() => setDraft(d => d.filter((_, j) => j !== i))} aria-label={`Șterge pragul ${i + 1}`} className={`${BTN_GHOST} col-span-2 md:col-span-1`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setDraft(d => [...d, { from: '', to: '', percent: '' }])} className={BTN_GHOST}><Plus className="h-4 w-4" /> Prag</button>
        <button type="button" onClick={save} disabled={saving} className={BTN_PRIMARY}>{saving ? 'Se salvează…' : 'Salvează pragurile'}</button>
      </div>
    </div>
  );
}

/** The Super Admin's tiered commission per bank, separately for NP and IP. Loads when opened. */
export function BankCommissionTiersEditor({ bankId, bankName }: { bankId: number; bankName: string }) {
  const [open, setOpen] = useState(false);
  const [tiers, setTiers] = useState<BankTiersResult | null>(null);
  const [error, setError] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !tiers) {
      setError(false);
      commissionApi.getTiers(bankId).then(setTiers).catch(() => setError(true));
    }
  };

  return (
    <div className="pb-3">
      <button type="button" onClick={toggle} aria-expanded={open} className={`inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Praguri de comision
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            Volumul disbursat lunar de rețeaua MoneyShop la {bankName}, pe tip de credit, alege pragul. Procentul pragului se aplică întregii sume a fiecărui dosar disbursat al brokerilor MoneyShop. Afiliații folosesc comisionul implicit.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-red-600">Nu am putut încărca pragurile. Închide și redeschide secțiunea ca să reîncerci.</p>
          ) : !tiers ? (
            <p className="text-sm text-slate-400">Se încarcă…</p>
          ) : (
            TYPES.map(t => (
              <TypeBlock
                key={t.type}
                bankId={bankId}
                bankName={bankName}
                type={t.type}
                label={t.label}
                initial={t.type === 'NP' ? tiers.np : tiers.ip}
                onSaved={rows => setTiers(cur => (cur ? { ...cur, [t.type === 'NP' ? 'np' : 'ip']: rows } : cur))}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
