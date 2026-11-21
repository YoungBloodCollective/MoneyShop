import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlarmClock, Building2, Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { apiErrorMessage } from '@/services/api/brokersApi';
import type { CrmBankFileInput, CrmBankFileItem, CrmClientWork, CrmTaskItem } from '@/types/crm.types';
import { money, dateShort, FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';
import {
  BANK_FILE_STAGES, BANK_SUGGESTIONS, CLIENT_TAGS, CLOSED_BANK_STAGES, bankStage, dueLabel, toLocalInput,
} from './clientWorkLabels';

const INPUT = `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`;
const BTN_PRIMARY = `inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`;
const BTN_GHOST = `inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`;

function Panel({ title, icon: Icon, action, children }: { title: string; icon: typeof Tag; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-primary" />
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StagePill({ status }: { status: string }) {
  const s = bankStage(status);
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s?.cls ?? 'bg-slate-100 text-slate-600'}`}>{s?.label ?? status}</span>;
}

/** Thin progress line through the bank stages (Respins shows as a red full line). */
function StageProgress({ status }: { status: string }) {
  const steps = BANK_FILE_STAGES.filter(s => s.key !== 'RESPINS');
  const idx = steps.findIndex(s => s.key === status);
  const rejected = status === 'RESPINS';
  return (
    <div className="mt-2 flex gap-1" aria-hidden>
      {steps.map((s, i) => (
        <span key={s.key} className={`h-1.5 flex-1 rounded-full ${rejected ? 'bg-rose-200' : i <= idx ? 'bg-brand-primary' : 'bg-slate-100'}`} />
      ))}
    </div>
  );
}

function defaultDue(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

const PRESETS: { label: string; make: () => Date }[] = [
  { label: 'Peste 2 ore', make: () => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 2); return d; } },
  { label: 'Mâine 10:00', make: defaultDue },
  { label: 'Peste 3 zile', make: () => { const d = defaultDue(); d.setDate(d.getDate() + 2); return d; } },
  { label: 'Peste o săptămână', make: () => { const d = defaultDue(); d.setDate(d.getDate() + 6); return d; } },
];

function TasksPanel({ userId, tasks, onChange }: { userId: number; tasks: CrmTaskItem[]; onChange: (t: CrmTaskItem[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(() => toLocalInput(defaultDue()));
  const [saving, setSaving] = useState(false);
  const open = tasks.filter(t => !t.doneAt);
  const done = tasks.filter(t => t.doneAt);
  const [now] = useState(() => Date.now());

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Scrie ce ai de făcut.'); return; }
    const when = new Date(due);
    if (Number.isNaN(when.getTime())) { toast.error('Alege data și ora.'); return; }
    setSaving(true);
    try {
      const t = await crmApi.addTask(userId, title.trim(), when.toISOString());
      onChange([...tasks, t]);
      setTitle('');
      setDue(toLocalInput(defaultDue()));
      setAdding(false);
      toast.success(`Reminder setat: ${dueLabel(t.dueAt)}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva taskul'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (t: CrmTaskItem) => {
    try {
      const updated = await crmApi.setTaskDone(t.id, !t.doneAt);
      onChange(tasks.map(x => (x.id === t.id ? updated : x)));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut actualiza taskul'));
    }
  };

  const remove = async (t: CrmTaskItem) => {
    if (!window.confirm(`Ștergi taskul „${t.title}”?`)) return;
    try {
      await crmApi.deleteTask(t.id);
      onChange(tasks.filter(x => x.id !== t.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut șterge taskul'));
    }
  };

  const row = (t: CrmTaskItem) => {
    const overdue = !t.doneAt && new Date(t.dueAt).getTime() < now;
    return (
      <li key={t.id} className="flex items-start gap-3 py-2.5">
        <button
          type="button"
          onClick={() => toggle(t)}
          aria-label={t.doneAt ? `Redeschide: ${t.title}` : `Marchează făcut: ${t.title}`}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${FOCUS_RING} ${
            t.doneAt ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white hover:border-brand-primary'
          }`}
        >
          {t.doneAt && <Check className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={`text-sm ${t.doneAt ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>{t.title}</div>
          <div className={`mt-0.5 flex items-center gap-1 text-xs ${overdue ? 'font-medium text-rose-600' : 'text-slate-400'}`}>
            <AlarmClock className="h-3 w-3" /> {dueLabel(t.dueAt)}{overdue ? ' · întârziat' : ''}
          </div>
        </div>
        <button type="button" onClick={() => remove(t)} aria-label={`Șterge: ${t.title}`} className={`rounded-lg p-1.5 text-slate-300 hover:bg-slate-50 hover:text-rose-600 ${FOCUS_RING}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </li>
    );
  };

  return (
    <Panel
      title={`Taskuri și remindere${open.length ? ` (${open.length})` : ''}`}
      icon={AlarmClock}
      action={!adding && <button type="button" onClick={() => setAdding(true)} className={BTN_GHOST}><Plus className="h-4 w-4" /> Task</button>}
    >
      {adding && (
        <form onSubmit={add} className="mb-3 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Ex.: Sună-l pentru adeverința de venit" aria-label="Ce ai de făcut" className={INPUT} />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.label} type="button" onClick={() => setDue(toLocalInput(p.make()))} className={`rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-primary hover:text-brand-primary ${FOCUS_RING}`}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="block text-xs text-slate-500">
            Reminder (primești email la ora aleasă)
            <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} className={`${INPUT} mt-1`} />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={BTN_PRIMARY}>{saving ? 'Se salvează…' : 'Salvează'}</button>
            <button type="button" onClick={() => setAdding(false)} className={BTN_GHOST}>Renunță</button>
          </div>
        </form>
      )}
      {tasks.length === 0 && !adding ? (
        <p className="py-2 text-sm text-slate-400">Niciun task. Adaugă unul și primești reminder pe email.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {open.map(row)}
          {done.map(row)}
        </ul>
      )}
    </Panel>
  );
}

const EMPTY_FILE: CrmBankFileInput = { bankName: '', amount: 0, status: 'TRIMIS', notes: '' };

function BankFileForm({ initial, onSave, onCancel }: { initial: CrmBankFileInput; onSave: (input: CrmBankFileInput) => Promise<void>; onCancel: () => void }) {
  const [bankName, setBankName] = useState(initial.bankName);
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : '');
  const [status, setStatus] = useState(initial.status);
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!bankName.trim()) { toast.error('Alege banca.'); return; }
    if (!(value > 0)) { toast.error('Scrie suma.'); return; }
    setSaving(true);
    try {
      await onSave({ bankName: bankName.trim(), amount: value, status, notes: notes.trim() || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="block text-xs text-slate-500">
          Banca
          <input list="ms-bank-suggestions" value={bankName} onChange={e => setBankName(e.target.value)} maxLength={100} placeholder="Ex.: Banca Transilvania" className={`${INPUT} mt-1`} />
          <datalist id="ms-bank-suggestions">
            {BANK_SUGGESTIONS.map(b => <option key={b} value={b} />)}
          </datalist>
        </label>
        <label className="block text-xs text-slate-500">
          Suma (lei)
          <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex.: 50000" className={`${INPUT} mt-1`} />
        </label>
      </div>
      <label className="block text-xs text-slate-500">
        Stadiu
        <select value={status} onChange={e => setStatus(e.target.value)} className={`${INPUT} mt-1`}>
          {BANK_FILE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <label className="block text-xs text-slate-500">
        Notițe (opțional)
        <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} rows={2} placeholder="Ex.: cer extras de cont pe 6 luni" className={`${INPUT} mt-1`} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>{saving ? 'Se salvează…' : 'Salvează'}</button>
        <button type="button" onClick={onCancel} className={BTN_GHOST}>Renunță</button>
      </div>
    </form>
  );
}

function BankFilesPanel({ userId, files, onChange }: { userId: number; files: CrmBankFileItem[]; onChange: (f: CrmBankFileItem[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const add = async (input: CrmBankFileInput) => {
    try {
      const f = await crmApi.addBankFile(userId, input);
      onChange([f, ...files]);
      setAdding(false);
      toast.success('Dosar bancar adăugat');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva dosarul'));
    }
  };

  const save = async (file: CrmBankFileItem, input: CrmBankFileInput) => {
    try {
      const f = await crmApi.updateBankFile(file.id, input);
      onChange(files.map(x => (x.id === f.id ? f : x)));
      setEditing(null);
      if (f.status !== file.status) toast.success(`${f.bankName} → ${bankStage(f.status)?.label ?? f.status}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva dosarul'));
    }
  };

  const remove = async (file: CrmBankFileItem) => {
    if (!window.confirm(`Ștergi dosarul de la ${file.bankName}?`)) return;
    try {
      await crmApi.deleteBankFile(file.id);
      onChange(files.filter(x => x.id !== file.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut șterge dosarul'));
    }
  };

  const active = files.filter(f => !CLOSED_BANK_STAGES.includes(f.status));

  return (
    <Panel
      title={`Dosare bancare${active.length ? ` (${active.length} în lucru)` : ''}`}
      icon={Building2}
      action={!adding && <button type="button" onClick={() => { setAdding(true); setEditing(null); }} className={BTN_GHOST}><Plus className="h-4 w-4" /> Dosar</button>}
    >
      {adding && <div className="mb-3"><BankFileForm initial={EMPTY_FILE} onSave={add} onCancel={() => setAdding(false)} /></div>}
      {files.length === 0 && !adding ? (
        <p className="py-2 text-sm text-slate-400">Niciun dosar trimis la bancă. Adaugă-l ca să-i urmărești stadiul și să apară în dashboard.</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => editing === f.id ? (
            <BankFileForm
              key={f.id}
              initial={{ bankName: f.bankName, amount: f.amount, status: f.status, notes: f.notes }}
              onSave={input => save(f, input)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={f.id} className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{f.bankName}</div>
                  <div className="text-sm font-medium text-slate-600">{money(f.amount)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={f.status}
                    onChange={e => save(f, { bankName: f.bankName, amount: f.amount, status: e.target.value, notes: f.notes })}
                    aria-label={`Stadiul dosarului de la ${f.bankName}`}
                    className={`rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 ${FIELD_FOCUS}`}
                  >
                    {BANK_FILE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button type="button" onClick={() => { setEditing(f.id); setAdding(false); }} aria-label={`Editează dosarul de la ${f.bankName}`} className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-brand-primary ${FOCUS_RING}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(f)} aria-label={`Șterge dosarul de la ${f.bankName}`} className={`rounded-lg p-1.5 text-slate-300 hover:bg-slate-50 hover:text-rose-600 ${FOCUS_RING}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <StageProgress status={f.status} />
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <StagePill status={f.status} />
                <span>din {dateShort(f.statusChangedAt)}</span>
                <span>· trimis {dateShort(f.createdAt)}</span>
              </div>
              {f.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{f.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function TagsPanel({ userId, tags, onChange }: { userId: number; tags: string[]; onChange: (t: string[]) => void }) {
  const toggle = async (key: string) => {
    const next = tags.includes(key) ? tags.filter(t => t !== key) : [...tags, key];
    const prev = tags;
    onChange(next);
    try {
      onChange(await crmApi.setTags(userId, next));
    } catch (err) {
      onChange(prev);
      toast.error(apiErrorMessage(err, 'Nu am putut salva eticheta'));
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
      <Tag className="h-4 w-4 text-brand-primary" />
      <span className="mr-1 text-sm font-semibold text-slate-800">Etichete</span>
      {CLIENT_TAGS.map(t => {
        const on = tags.includes(t.key);
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(t.key)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${FOCUS_RING} ${
              on ? t.cls : 'border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400'
            }`}
          >
            {on ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tags, tasks with reminders and bank files for one client. */
export function ClientWorkSection({ userId }: { userId: number }) {
  const [work, setWork] = useState<CrmClientWork | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    crmApi.getClientWork(userId)
      .then(w => { if (active) setWork(w); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId]);

  if (failed) return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400">Nu am putut încărca taskurile și dosarele bancare.</p>;
  if (!work) return <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />;

  return (
    <>
      <TagsPanel userId={userId} tags={work.tags} onChange={tags => setWork(w => (w ? { ...w, tags } : w))} />
      <TasksPanel userId={userId} tasks={work.tasks} onChange={tasks => setWork(w => (w ? { ...w, tasks } : w))} />
      <BankFilesPanel userId={userId} files={work.bankFiles} onChange={bankFiles => setWork(w => (w ? { ...w, bankFiles } : w))} />
    </>
  );
}
