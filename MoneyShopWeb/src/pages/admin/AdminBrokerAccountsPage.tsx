import { useEffect, useState } from 'react';
import { Plus, Loader2, X, ExternalLink, CheckCircle2, AlertTriangle, Users, Send, MailPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  brokersApi, apiErrorMessage,
  type BrokerAdminItem, type BrokerCreate, type BrokerProfile, type BrokerType,
} from '@/services/api/brokersApi';
import { brokerInvitesApi, type BrokerInviteItem, type BrokerInviteStatus } from '@/services/api/brokerInvitesApi';
import { brokerSiteUrl } from '@/lib/brokerHost';
import { COUNTIES } from '@/lib/counties';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-500 text-light-90 placeholder:text-light-40 focus:outline-none focus:border-brand-primary';

type FormState = BrokerCreate & { newPassword?: string };

const EMPTY: FormState = { nume: '', prenume: '', loginEmail: '', status: 'Active', type: 'Afiliat', mangoAgreementEnabled: false };

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
              {!editing && (
                <Field label="Tip broker">
                  <select value={form.type ?? 'Afiliat'} onChange={set('type')} className={inputClass}>
                    <option value="MoneyShop">MoneyShop</option>
                    <option value="Afiliat">Afiliat</option>
                  </select>
                </Field>
              )}
              <Field label="Adresă (subdomeniu)">
                <div className="flex items-center gap-1">
                  <input value={form.slug ?? ''} onChange={set('slug')} placeholder={editing ? '' : 'se generează din nume'} className={inputClass} />
                  <span className="text-sm text-light-50 shrink-0">.moneyshop.ro</span>
                </div>
              </Field>
              <Field label="Nume afișat"><input value={form.displayName ?? ''} onChange={set('displayName')} placeholder={editing ? '' : 'Prenume Nume'} className={inputClass} /></Field>
              <Field label="Oraș"><input value={form.oras ?? ''} onChange={set('oras')} maxLength={100} className={inputClass} /></Field>
              <Field label="Județ">
                <select value={form.judet ?? ''} onChange={set('judet')} className={inputClass}>
                  <option value="">—</option>
                  {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {editing && (
                <>
                  <Field label="Status">
                    <select value={form.status ?? 'Active'} onChange={set('status')} className={inputClass}>
                      <option value="Active">Activ</option>
                      <option value="Suspended">Suspendat</option>
                    </select>
                  </Field>
                  <Field label="Plan"><input value={form.plan ?? ''} onChange={set('plan')} className={inputClass} /></Field>
                  <Field label="Tip broker">
                    <select value={form.type ?? 'Afiliat'} onChange={set('type')} className={inputClass}>
                      <option value="MoneyShop">MoneyShop</option>
                      <option value="Afiliat">Afiliat</option>
                    </select>
                  </Field>
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
            <label className="block mt-4">
              <span className="block text-sm text-light-60 mb-1.5">
                Banci partenere (formularele lor se semneaza odata cu acordul)
              </span>
              <input
                value={form.bankPreDocuments ?? ''}
                onChange={set('bankPreDocuments')}
                placeholder="procredit,patria,ing,bt"
                className={inputClass}
              />
              <span className="block text-xs text-light-50 mt-1.5">
                Coduri separate prin virgula. Lasa gol ca sa nu se genereze niciun formular bancar.
              </span>
            </label>
            {form.mangoAgreementEnabled && (
              <Field label="Email Mango al reprezentantului">
                <input value={form.mangoEmail ?? ''} onChange={set('mangoEmail')} type="email" placeholder="nume@mangobroker.ro" className={inputClass} />
              </Field>
            )}
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

const STATUS_LABEL: Record<BrokerInviteStatus, string> = {
  pending: 'În așteptare',
  used: 'Folosită',
  expired: 'Expirată',
  revoked: 'Anulată',
};

const STATUS_CLASS: Record<BrokerInviteStatus, string> = {
  pending: 'bg-brand-primary/15 text-brand-primary',
  used: 'bg-success-500/15 text-success-600',
  expired: 'bg-warning-500/15 text-warning-500',
  revoked: 'bg-dark-600 text-light-60',
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

function InviteForm({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<BrokerType>('Afiliat');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const result = await brokerInvitesApi.create({ email: email.trim(), name: name.trim() || undefined, type });
      if (result.emailSent) toast.success(`Invitație trimisă la ${result.invite.email}`);
      else toast.error('Invitația a fost creată, dar emailul nu a putut fi trimis. Folosește „Retrimite”.');
      onSent();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut crea invitația'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-dark-700 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <h2 className="font-semibold text-light-100">Invită broker</h2>
          <button onClick={onClose} aria-label="Închide" className="w-9 h-9 rounded-full hover:bg-dark-600 flex items-center justify-center text-light-60">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-light-50">Brokerul primește pe email un link personal, valabil 7 zile, ca să-și creeze singur contul.</p>
          <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoFocus className={inputClass} /></Field>
          <Field label="Nume (opțional)"><input value={name} onChange={e => setName(e.target.value)} maxLength={150} className={inputClass} /></Field>
          <Field label="Tip broker">
            <select value={type} onChange={e => setType(e.target.value as BrokerType)} className={inputClass}>
              <option value="MoneyShop">MoneyShop</option>
              <option value="Afiliat">Afiliat</option>
            </select>
          </Field>
        </div>
        <div className="px-6 py-4 border-t border-dark-600 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-dark-600 text-light-80 text-sm font-medium">Anulează</button>
          <button onClick={send} disabled={sending || !email.trim()} className="px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-semibold disabled:opacity-60">
            {sending ? 'Se trimite...' : 'Trimite invitația'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvitesPanel({ invites, onChanged }: { invites: BrokerInviteItem[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const act = async (id: number, action: 'resend' | 'revoke') => {
    setBusyId(id);
    try {
      if (action === 'resend') {
        const result = await brokerInvitesApi.resend(id);
        if (result.emailSent) toast.success(`Invitație retrimisă la ${result.invite.email}`);
        else toast.error('Linkul nou a fost generat, dar emailul nu a putut fi trimis. Încearcă din nou.');
      } else {
        await brokerInvitesApi.revoke(id);
        toast.success('Invitație anulată');
      }
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut face modificarea'));
    } finally {
      setBusyId(null);
    }
  };

  if (invites.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold text-light-50 uppercase tracking-wider mb-3">Invitații</h2>
      <div className="space-y-2">
        {invites.map(i => {
          const actionable = i.status === 'pending' || i.status === 'expired';
          return (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 bg-dark-700 rounded-2xl px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-light-100 break-all">{i.email}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[i.status]}`}>{STATUS_LABEL[i.status]}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${i.type === 'MoneyShop' ? 'bg-brand-primary/15 text-brand-primary' : 'bg-dark-600 text-light-60'}`}>{i.type}</span>
                </div>
                <p className="text-xs text-light-50 mt-1">
                  {i.name ? `${i.name} · ` : ''}trimisă {formatDate(i.createdAt)}
                  {i.status === 'used' && i.usedAt ? ` · folosită ${formatDate(i.usedAt)}` : ` · expiră ${formatDate(i.expiresAt)}`}
                </p>
              </div>
              {actionable && (
                <div className="flex gap-2">
                  <button
                    onClick={() => act(i.id, 'resend')}
                    disabled={busyId === i.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-dark-600 text-light-80 text-sm font-medium disabled:opacity-60"
                  >
                    <Send size={14} /> Retrimite
                  </button>
                  <button
                    onClick={() => act(i.id, 'revoke')}
                    disabled={busyId === i.id}
                    className="px-4 py-2 rounded-full bg-error-500/15 text-error-500 text-sm font-medium disabled:opacity-60"
                  >
                    Anulează
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminBrokerAccountsPage() {
  const [items, setItems] = useState<BrokerAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BrokerProfile | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [invites, setInvites] = useState<BrokerInviteItem[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    brokersApi.list()
      .then(list => { if (!cancelled) setItems(list); })
      .catch(err => toast.error(apiErrorMessage(err, 'Nu am putut încărca brokerii')))
      .finally(() => { if (!cancelled) setLoading(false); });
    brokerInvitesApi.list()
      .then(list => { if (!cancelled) setInvites(list); })
      .catch(err => toast.error(apiErrorMessage(err, 'Nu am putut încărca invitațiile')));
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-semibold"
          >
            <MailPlus size={17} /> Invită broker
          </button>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark-600 text-light-80 text-sm font-semibold"
          >
            <Plus size={17} /> Adaugă broker
          </button>
        </div>
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
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${b.type === 'MoneyShop' ? 'bg-brand-primary/15 text-brand-primary' : 'bg-dark-600 text-light-60'}`}>{b.type}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-light-50">
                  <span>{b.slug}.moneyshop.ro</span>
                  <span>{b.loginEmail}</span>
                  {(b.oras || b.judet) && <span>{[b.oras, b.judet].filter(Boolean).join(', ')}</span>}
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

      <InvitesPanel invites={invites} onChanged={() => setReloadKey(k => k + 1)} />

      {inviteOpen && (
        <InviteForm
          onClose={() => setInviteOpen(false)}
          onSent={() => { setInviteOpen(false); setReloadKey(k => k + 1); }}
        />
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
