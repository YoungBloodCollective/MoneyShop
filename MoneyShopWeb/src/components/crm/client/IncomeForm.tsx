import { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { crmApi } from '@/services/api/crmApi';
import type { CrmIncomeSnapshot } from '@/types/crm.types';
import { FIELD_FOCUS, FOCUS_RING, dateShort, money } from '@/pages/crm/crmHelpers';

const MONTH_LABELS = ['Luna 1 (cea mai recentă)', 'Luna 2', 'Luna 3'];

const toInput = (v?: number | null) => (v != null && v > 0 ? String(v) : '');
const toNumber = (s: string): number | null => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return s.trim() === '' || Number.isNaN(n) ? null : n;
};

/**
 * Net income for the last 3 months, which the broker reads off the client's ANAF document
 * (manual for now; automatic reading of the ANAF file comes later). Saving recomputes the
 * debt-to-income ratio against the latest BC report.
 */
export function IncomeForm({ userId, income, onSaved }: {
  userId: number;
  income?: CrmIncomeSnapshot | null;
  onSaved: (income: CrmIncomeSnapshot) => void;
}) {
  const [editing, setEditing] = useState(!income);
  const [salaries, setSalaries] = useState([toInput(income?.salariu1), toInput(income?.salariu2), toInput(income?.salariu3)]);
  const [bonuri, setBonuri] = useState(toInput(income?.bonuriMasa));
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = salaries.map(toNumber);
    if (values.every(v => !v)) { toast.error('Completează cel puțin un salariu.'); return; }
    setSaving(true);
    try {
      const saved = await crmApi.saveIncome(userId, {
        salariu1: values[0], salariu2: values[1], salariu3: values[2], bonuriMasa: toNumber(bonuri),
      });
      toast.success('Venit salvat.');
      setEditing(false);
      onSaved(saved);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message as string | undefined) : undefined;
      toast.error(msg || 'Nu am putut salva venitul.');
    } finally {
      setSaving(false);
    }
  };

  const input = `w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 ${FIELD_FOCUS}`;

  if (!editing && income) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[income.salariu1, income.salariu2, income.salariu3].map((s, i) => (
            <div key={i} className="rounded-lg bg-slate-50 px-2 py-1.5">
              <div className="text-[10px] text-slate-400">Luna {i + 1}</div>
              <div className="text-sm font-semibold text-slate-800">{s ? money(s) : '—'}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Medie netă{income.bonuriMasa ? ' + bonuri' : ''}</span>
          <span className="font-semibold text-slate-900">{money(income.venitTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Actualizat {dateShort(income.updatedAt)}</span>
          <button onClick={() => setEditing(true)} className={`font-medium text-brand-primary hover:underline ${FOCUS_RING}`}>Modifică</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-2.5">
      <p className="text-xs text-slate-500">Venitul net din documentul ANAF, pe ultimele 3 luni.</p>
      {MONTH_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <label htmlFor={`venit-${i}`} className="w-40 shrink-0 text-xs text-slate-600">{label}</label>
          <input
            id={`venit-${i}`}
            inputMode="decimal"
            placeholder="lei"
            className={input}
            value={salaries[i]}
            onChange={e => setSalaries(prev => prev.map((v, j) => (j === i ? e.target.value : v)))}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <label htmlFor="venit-bonuri" className="w-40 shrink-0 text-xs text-slate-600">Bonuri de masă / lună</label>
        <input id="venit-bonuri" inputMode="decimal" placeholder="0" className={input} value={bonuri} onChange={e => setBonuri(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {income && (
          <button type="button" onClick={() => setEditing(false)} className={`rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}>Renunță</button>
        )}
        <button type="submit" disabled={saving} className={`rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}>
          {saving ? 'Se salvează…' : 'Salvează venitul'}
        </button>
      </div>
    </form>
  );
}
