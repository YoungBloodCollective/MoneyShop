import { useEffect, useState } from 'react';
import { Plus, Loader2, X, ExternalLink, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  brokersApi, apiErrorMessage,
  type BrokerAdminItem, type BrokerCreate, type BrokerProfile,
} from '@/services/api/brokersApi';
import { brokerSiteUrl } from '@/lib/brokerHost';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-500 text-light-90 placeholder:text-light-40 focus:outline-none focus:border-brand-primary';

type FormState = BrokerCreate & { newPassword?: string };

const EMPTY: FormState = { nume: '', prenume: '', loginEmail: '', status: 'Active', mangoAgreementEnabled: false, proCreditConsentEnabled: false };

const LEGAL_FIELDS: { key: keyof FormState; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: 'firmaNume', label: 'Firma (intermediar)', placeholder: 'POPIX BROKERAGE CONSULTING SRL', wide: true },
  { key: 'firmaSediu', label: 'Sediul social', placeholder: 'Municipiul ..., Str. ... nr. ..., județul ...', wide: true },
  { key: 'firmaCui', label: 'CUI' },
  { key: 'firmaRegCom', label: 'Nr. Registrul Comerțului' },
  { key: 'firmaEuid', label: 'EUID' },
  { key: 'firmaDataInfiintarii', label: 'Data înființării', placeholder: 'zz.ll.aaaa' },
  { key: 'reprezentantNume', label: 'Reprezentant (persoana)' },
  { key: 'reprezentantTelefon', label: 'Telefon reprezentant' },
];

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="block text-xs text-light-60 mb-1">{label}</span>
      {children}
    </label>
  );
}

function BrokerForm({ editing, onClose, onSaved }: { editing: BrokerProfile | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(() => editing ? {
    ...EMPTY,
    ...Object.fromEntries(Object.entries(editing).map(([k, v]) => [k, v ?? ''])),
    mangoAgreementEnabled: editing.mangoAgreementEnabled,
    proCreditConsentEnabled: editing.proCreditConsentEnabled,
  } as FormState : EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        const { nume: _n, prenume: _p, loginEmail: _e, loginPhone: _l, password: _pw, newPassword, ...update } = form;
        void _n; void _p; void _e; void _l; void _pw;
        await brokersApi.update(editing.id, update);
        if (newPassword) await brokersApi.setPassword(editing.id, newPassword);
      } else {
        await brokersApi.create(form);
      }
      toast.success(editing ? 'Broker actualizat' : 'Broker creat');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva brokerul'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-dark-700 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <h2 className="font-semibold text-light-100">{editing ? `Editează: ${editing.displayName}` : 'Broker nou'}</h2>
          <button onClick={onClose} aria-label="Închide" className="w-9 h-9 rounded-full hover:bg-dark-600 flex items-center justify-center text-light-60">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-light-50 uppercase tracking-wider mb-3">Cont</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {!editing && (
                <>
                  <Field label="Prenume"><input value={form.prenume} onChange={set('prenume')} className={inputClass} /></Field>
                  <Field label="Nume"><input value={form.nume} onChange={set('nume')} className={inputClass} /></Field>
                  <Field label="Email autentificare"><input value={form.loginEmail} onChange={set('loginEmail')} type="email" className={inputClass} /></Field>
                  <Field label="Telefon autentificare (login prin SMS)"><input value={form.loginPhone ?? ''} onChange={set('loginPhone')} inputMode="tel" className={inputClass} /></Field>
                  <Field label="Parolă inițială (opțional, minim 8 caractere)" wide>
                    <input value={form.password ?? ''} onChange={set('password')} type="password" autoComplete="new-password" className={inputClass} />
                  </Field>
                </>
              )}
              <Field label="Adresă (subdomeniu)">
                <div className="flex items-center gap-1">
                  <input value={form.slug ?? ''} onChange={set('slug')} placeholder={editing ? '' : 'se generează din nume'} className={inputClass} />
                  <span className="text-sm text-light-50 shrink-0">.moneyshop.ro</span>
                </div>
              </Field>
              <Field label="Nume afișat"><input value={form.displayName ?? ''} onChange={set('displayName')} placeholder={editing ? '' : 'Prenume Nume'} className={inputClass} /></Field>
              {editing && (
                <>
                  <Field label="Status">
                    <select value={form.status ?? 'Active'} onChange={set('status')} className={inputClass}>
                      <option value="Active">Activ</option>
                      <option value="Suspended">Suspendat</option>
                    </select>
                  </Field>
                  <Field label="Plan"><input value={form.plan ?? ''} onChange={set('plan')} className={inputClass} /></Field>
                  <Field label={editing.hasPassword ? 'Parolă nouă (lasă gol ca să rămână)' : 'Setează parola'} wide>
                    <input value={form.newPassword ?? ''} onChange={set('newPassword')} type="password" autoComplete="new-password" className={inputClass} />
                  </Field>
                </>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-light-50 uppercase tracking-wider mb-1">Date juridice pentru acord</h3>
            <p className="text-xs text-light-40 mb-3">Acordul devine activ pe site-ul brokerului când toate câmpurile sunt completate.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {LEGAL_FIELDS.map(f => (
                <Field key={f.key} label={f.label} wide={f.wide}>
                  <input value={(form[f.key] as string) ?? ''} onChange={set(f.key)} placeholder={f.placeholder} className={inputClass} />
                </Field>
              ))}
            </div>
          </section>

          <section>
            <label className="flex items-center gap-2.5 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={!!form.mangoAgreementEnabled}
                onChange={e => setForm(f => ({ ...f, mangoAgreementEnabled: e.target.checked }))}
                className="w-5 h-5 rounded accent-brand-primary"
              />
              <span className="text-sm text-light-80">Reprezentant desemnat Mango Broker (trimite și acordul Mango)</span>
            </label>
            {form.mangoAgreementEnabled && (
              <Field label="Email Mango al reprezentantului">
                <input value={form.mangoEmail ?? ''} onChange={set('mangoEmail')} type="email" placeholder="nume@mangobroker.ro" className={inputClass} />
              </Field>
            )}
            <label className="flex items-center gap-2.5 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={!!form.proCreditConsentEnabled}
                onChange={e => setForm(f => ({ ...f, proCreditConsentEnabled: e.target.checked }))}
                className="w-5 h-5 rounded accent-brand-primary"
              />
              <span className="text-sm text-light-80">Acord GDPR ProCredit Bank (generat la fiecare acord semnat)</span>
            </label>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-dark-600 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-dark-600 text-light-80 text-sm font-medium">Anulează</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Se salvează...' : editing ? 'Salvează' : 'Creează brokerul'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBrokerAccountsPage() {
  const [items, setItems] = useState<BrokerAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BrokerProfile | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    brokersApi.list()
      .then(list => { if (!cancelled) setItems(list); })
      .catch(err => toast.error(apiErrorMessage(err, 'Nu am putut încărca brokerii')))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const openEdit = async (id: number) => {
    try {
      setEditing(await brokersApi.get(id));
      setFormOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut încărca brokerul'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-light-100">Brokeri</h1>
          <p className="text-sm text-light-50 mt-1">Fiecare broker are site-ul lui, acordul lui și vede doar clienții proprii.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-semibold"
        >
          <Plus size={17} /> Adaugă broker
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-brand-primary animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="text-light-40 mx-auto mb-3" />
          <p className="text-light-50">Niciun broker încă.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(b => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 bg-dark-700 rounded-2xl px-5 py-4">
              <button onClick={() => openEdit(b.id)} className="min-w-0 text-left flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-light-100">{b.displayName}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${b.status === 'Active' ? 'bg-success-500/15 text-success-600' : 'bg-error-500/15 text-error-500'}`}>
                    {b.status === 'Active' ? 'Activ' : 'Suspendat'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-600 text-light-60">{b.plan}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-light-50">
                  <span>{b.slug}.moneyshop.ro</span>
                  <span>{b.loginEmail}</span>
                  <span className={`flex items-center gap-1 ${b.acordAvailable ? 'text-success-600' : 'text-warning-500'}`}>
                    {b.acordAvailable ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {b.acordAvailable ? 'acord activ' : 'acord incomplet'}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-5 text-center">
                {([['Acorduri', b.acorduri], ['Programări', b.programari], ['Cereri', b.cereri]] as const).map(([label, count]) => (
                  <div key={label}>
                    <p className="text-lg font-semibold text-light-100">{count}</p>
                    <p className="text-[11px] text-light-50">{label}</p>
                  </div>
                ))}
                <a href={brokerSiteUrl(b.slug)} target="_blank" rel="noreferrer" className="text-light-50 hover:text-light-90" title="Deschide site-ul">
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <BrokerForm
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); setLoading(true); setReloadKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
