import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { BankCommissionTiersEditor } from '@/components/crm/BankCommissionTiersEditor';
import { apiErrorMessage } from '@/services/api/brokersApi';
import type { BankCatalogInput, BankCatalogItem, BrokerCommissionItem } from '@/types/crm.types';
import { isAdminWorkspace } from '@/lib/crmPath';
import { BrokerTargetsCard } from '@/components/crm/BrokerTargetsCard';
import { ErrorState, PageHeader, SkeletonCards } from './crmShared';
import { FIELD_FOCUS, FOCUS_RING } from './crmHelpers';
import { currentMonth } from './bankStatsHelpers';

const INPUT = `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`;
const BTN_PRIMARY = `inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`;
const BTN_GHOST = `inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`;
const LABEL = 'block text-xs text-slate-500';

function parseNumber(value: string): number | null {
  const v = value.trim().replace(/\s/g, '').replace(',', '.');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function CommissionRow({ item, onSaved }: { item: BrokerCommissionItem; onSaved: (c: BrokerCommissionItem) => void }) {
  const [value, setValue] = useState(item.myPercent != null ? String(item.myPercent) : '');
  const [saving, setSaving] = useState(false);
  const saved = item.myPercent != null ? String(item.myPercent) : '';
  const dirty = value.trim().replace(',', '.') !== saved;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const percent = parseNumber(value);
    if (percent != null && (Number.isNaN(percent) || percent < 0 || percent > 100)) {
      toast.error('Comisionul trebuie să fie între 0 și 100%.');
      return;
    }
    setSaving(true);
    try {
      const updated = await crmApi.setMyCommission(item.bankId, percent);
      onSaved(updated);
      setValue(updated.myPercent != null ? String(updated.myPercent) : '');
      toast.success(percent == null ? `${item.name}: revii la comisionul implicit` : `${item.name}: comision salvat`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva comisionul'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 py-3">
      <div className="min-w-[10rem] flex-1">
        <div className="text-sm font-semibold text-slate-800">{item.name}</div>
        <div className="text-xs text-slate-400">Implicit: {item.defaultPercent.toLocaleString('ro-RO')}%</div>
      </div>
      <label className={`${LABEL} w-32`}>
        Comisionul meu (%)
        <input
          inputMode="decimal"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={String(item.defaultPercent)}
          aria-label={`Comisionul meu la ${item.name}, în procente`}
          className={`${INPUT} mt-1`}
        />
      </label>
      <button type="submit" disabled={!dirty || saving} className={BTN_PRIMARY}>{saving ? 'Se salvează…' : 'Salvează'}</button>
    </form>
  );
}

function CommissionsBlock() {
  const [items, setItems] = useState<BrokerCommissionItem[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    crmApi.getMyCommissions()
      .then(c => { if (active) { setItems(c); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);

  if (error) return <ErrorState message="Nu am putut încărca comisioanele" onRetry={() => setAttempt(a => a + 1)} />;
  if (!items) return <SkeletonCards count={2} />;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Comisioanele mele</h2>
      <p className="mt-1 text-sm text-slate-500">
        Procentul pe care îl ai cu fiecare bancă. Lasă gol ca să folosești comisionul implicit al băncii. Se folosește la comisionul estimat din ecranul Bănci.
      </p>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-slate-400">Nu există bănci active în catalog.</p>
      ) : (
        <div className="mt-2 divide-y divide-slate-50">
          {items.map(i => (
            <CommissionRow key={i.bankId} item={i} onSaved={u => setItems(list => (list ? list.map(x => (x.bankId === u.bankId ? u : x)) : list))} />
          ))}
        </div>
      )}
    </section>
  );
}

function BankEditor({ bank, onSaved, onCancel }: { bank?: BankCatalogItem; onSaved: (b: BankCatalogItem) => void; onCancel?: () => void }) {
  const [name, setName] = useState(bank?.name ?? '');
  const [active, setActive] = useState(bank?.active ?? true);
  const [percent, setPercent] = useState(String(bank?.commissionPercent ?? 0));
  const [threshold, setThreshold] = useState(bank?.monthlyThresholdAmount != null ? String(bank.monthlyThresholdAmount) : '');
  const [order, setOrder] = useState(String(bank?.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseNumber(percent);
    const prag = parseNumber(threshold);
    const ord = parseNumber(order);
    if (!name.trim()) { toast.error('Scrie numele băncii.'); return; }
    if (pct == null || Number.isNaN(pct) || pct < 0 || pct > 100) { toast.error('Comisionul implicit trebuie să fie între 0 și 100%.'); return; }
    if (Number.isNaN(prag) || (prag != null && prag < 0)) { toast.error('Pragul lunar nu este valid.'); return; }
    if (ord == null || Number.isNaN(ord) || !Number.isInteger(ord)) { toast.error('Ordinea trebuie să fie un număr întreg.'); return; }
    const input: BankCatalogInput = { name: name.trim(), active, commissionPercent: pct, monthlyThresholdAmount: prag, sortOrder: ord };
    setSaving(true);
    try {
      const saved = bank ? await crmApi.updateBank(bank.id, input) : await crmApi.createBank(input);
      onSaved(saved);
      if (!bank) { setName(''); setPercent('0'); setThreshold(''); setOrder('0'); setActive(true); }
      toast.success(bank ? `${saved.name} actualizată` : `${saved.name} adăugată`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva banca'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={`grid grid-cols-2 gap-3 py-3 md:grid-cols-12 md:items-end ${bank && !active ? 'opacity-70' : ''}`}>
      <label className={`${LABEL} col-span-2 md:col-span-3`}>
        Banca
        <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Ex.: Banca Transilvania" className={`${INPUT} mt-1`} />
      </label>
      <label className={`${LABEL} md:col-span-2`}>
        Comision implicit (%)
        <input inputMode="decimal" value={percent} onChange={e => setPercent(e.target.value)} className={`${INPUT} mt-1`} />
      </label>
      <label className={`${LABEL} md:col-span-2`}>
        Prag lunar (lei)
        <input inputMode="decimal" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="fără prag" className={`${INPUT} mt-1`} />
      </label>
      <label className={`${LABEL} md:col-span-1`}>
        Ordine
        <input inputMode="numeric" value={order} onChange={e => setOrder(e.target.value)} className={`${INPUT} mt-1`} />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm text-slate-600 md:col-span-1">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-primary" />
        Activă
      </label>
      <div className="col-span-2 flex gap-2 md:col-span-3 md:justify-end">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>{saving ? 'Se salvează…' : bank ? 'Salvează' : 'Adaugă'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={BTN_GHOST}>Renunță</button>}
      </div>
    </form>
  );
}

function CatalogBlock() {
  const [banks, setBanks] = useState<BankCatalogItem[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    crmApi.getAllBanks()
      .then(b => { if (active) { setBanks(b); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);

  if (error) return <ErrorState message="Nu am putut încărca băncile" onRetry={() => setAttempt(a => a + 1)} />;
  if (!banks) return <SkeletonCards count={3} />;

  const sorted = (list: BankCatalogItem[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ro'));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Bănci</h2>
          <p className="mt-1 text-sm text-slate-500">
            Catalogul băncilor din sistem, pentru toți brokerii. Comisionul implicit se aplică până își setează fiecare broker propriul procent. O bancă nu se șterge, se dezactivează.
          </p>
        </div>
        {!adding && <button type="button" onClick={() => setAdding(true)} className={BTN_GHOST}><Plus className="h-4 w-4" /> Bancă</button>}
      </div>
      {adding && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3">
          <BankEditor onSaved={b => { setBanks(list => sorted([...(list ?? []), b])); setAdding(false); }} onCancel={() => setAdding(false)} />
        </div>
      )}
      {banks.length === 0 && !adding ? (
        <p className="py-4 text-sm text-slate-400">Nicio bancă în catalog. Adaugă prima bancă.</p>
      ) : (
        <div className="mt-2 divide-y divide-slate-100">
          {banks.map(b => (
            <div key={b.id}>
              <BankEditor bank={b} onSaved={u => setBanks(list => sorted((list ?? []).map(x => (x.id === u.id ? u : x))))} />
              <BankCommissionTiersEditor bankId={b.id} bankName={b.name} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CrmSetariPage() {
  const { pathname } = useLocation();
  const admin = isAdminWorkspace(pathname);
  const [hasProfile, setHasProfile] = useState<boolean | null>(admin ? null : true);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    crmApi.getBankStats(currentMonth())
      .then(s => { if (active) setHasProfile(s.hasBrokerProfile); })
      .catch(() => { if (active) setHasProfile(false); });
    return () => { active = false; };
  }, [admin]);

  return (
    <div className="space-y-6">
      <PageHeader title="Setări" subtitle={admin ? 'Catalogul de bănci și comisioanele tale' : 'Obiectivele și comisioanele tale'} />
      {admin && <CatalogBlock />}
      {!admin && <BrokerTargetsCard />}
      {hasProfile && <CommissionsBlock />}
      {admin && hasProfile === false && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Contul tău nu are profil de broker, deci nu ai comisioane proprii de setat.</p>
      )}
    </div>
  );
}
