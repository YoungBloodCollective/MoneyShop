import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiErrorMessage, brokersApi, type BrokerProfile } from '@/services/api/brokersApi';
import { ErrorState, SkeletonCards } from '@/pages/crm/crmShared';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';

const MAX_TARGET = 1_000_000_000;
const INPUT = `mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ${FIELD_FOCUS}`;

type Fields = { np: string; ip: string; commission: string };

function toFields(p: BrokerProfile): Fields {
  return { np: String(p.targetNpAmount ?? 5_000_000), ip: String(p.targetIpAmount ?? 5_000_000), commission: String(p.targetCommissionAmount ?? 150_000) };
}

function parseTarget(value: string): number {
  const compact = value.trim().replace(/\s/g, '');
  const ungrouped = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(compact) ? compact.replace(/\./g, '') : compact;
  return Number(ungrouped.replace(',', '.'));
}

function validTarget(n: number): boolean {
  return Number.isFinite(n) && n > 0 && n <= MAX_TARGET;
}

export function BrokerTargetsCard() {
  const [saved, setSaved] = useState<Fields | null>(null);
  const [form, setForm] = useState<Fields | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    brokersApi.getMe()
      .then(p => { if (active) { const f = toFields(p); setSaved(f); setForm(f); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);

  if (error) return <ErrorState message="Nu am putut încărca obiectivele" onRetry={() => setAttempt(a => a + 1)} />;
  if (!form || !saved) return <SkeletonCards count={1} />;

  const dirty = form.np !== saved.np || form.ip !== saved.ip || form.commission !== saved.commission;
  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const np = parseTarget(form.np);
    const ip = parseTarget(form.ip);
    const commission = parseTarget(form.commission);
    if (![np, ip, commission].every(validTarget)) {
      toast.error('Fiecare obiectiv trebuie să fie mai mare ca 0 și cel mult 1 000 000 000 lei.');
      return;
    }
    setSaving(true);
    try {
      const updated = await brokersApi.updateMe({ targetNpAmount: np, targetIpAmount: ip, targetCommissionAmount: commission });
      const f = toFields(updated);
      setSaved(f);
      setForm(f);
      toast.success('Obiectivele au fost salvate');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva obiectivele'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Obiectivele mele lunare</h2>
      <p className="mt-1 text-sm text-slate-500">
        Le setezi o singură dată și rămân valabile în fiecare lună. Apar ca grafice în partea de sus a Dashboardului.
      </p>
      <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-xs text-slate-500">
          Nevoi personale (lei)
          <input inputMode="decimal" value={form.np} onChange={set('np')} className={INPUT} />
        </label>
        <label className="block text-xs text-slate-500">
          Ipotecar (lei)
          <input inputMode="decimal" value={form.ip} onChange={set('ip')} className={INPUT} />
        </label>
        <label className="block text-xs text-slate-500">
          Comision (lei)
          <input inputMode="decimal" value={form.commission} onChange={set('commission')} className={INPUT} />
        </label>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={!dirty || saving}
            className={`inline-flex items-center justify-center rounded-xl bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
          >
            {saving ? 'Se salvează…' : 'Salvează obiectivele'}
          </button>
        </div>
      </form>
    </section>
  );
}
