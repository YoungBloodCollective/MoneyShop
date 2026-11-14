import { useEffect, useState } from 'react';
import { Copy, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { brokersApi, apiErrorMessage, type BrokerProfile, type BrokerSelfUpdate } from '@/services/api/brokersApi';
import { brokerSiteUrl } from '@/lib/brokerHost';
import { PageHeader, Spinner } from './crmShared';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none';
const H2 = 'mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500';

function LinkRow({ label, url }: { label: string; url: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiat');
    } catch {
      toast.error('Nu s-a putut copia linkul');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="min-w-0">
        <p className="mb-1 text-xs text-slate-500">{label}</p>
        <p className="break-all font-medium text-slate-900">{url}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={copy} className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white">
          <Copy size={15} /> Copiază
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <ExternalLink size={15} /> Deschide
        </a>
      </div>
    </div>
  );
}

export default function CrmProfilPage() {
  const [profile, setProfile] = useState<BrokerProfile | null>(null);
  const [form, setForm] = useState<BrokerSelfUpdate>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    brokersApi.getMe()
      .then(p => {
        setProfile(p);
        setForm({
          displayName: p.displayName,
          publicPhone: p.publicPhone ?? '',
          publicEmail: p.publicEmail ?? '',
          notificationEmail: p.notificationEmail ?? '',
          bio: p.bio ?? '',
        });
      })
      .catch(err => setError(apiErrorMessage(err, 'Nu am putut încărca profilul')));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await brokersApi.updateMe(form);
      setProfile(updated);
      toast.success('Profil salvat');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut salva profilul'));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>;
  if (!profile) return <Spinner />;

  const site = brokerSiteUrl(profile.slug);
  const set = (key: keyof BrokerSelfUpdate) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Profilul meu" subtitle="Linkurile tale și datele afișate clienților." />

      <div className="mb-8 mt-6 space-y-3">
        <LinkRow label="Site-ul tău" url={site} />
        <LinkRow label="Link acord pentru clienți" url={`${site}/acord`} />
      </div>

      <h2 className={H2}>Date publice</h2>
      <div className="mb-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">Nume afișat</span>
            <input value={form.displayName ?? ''} onChange={set('displayName')} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">Telefon public</span>
            <input value={form.publicPhone ?? ''} onChange={set('publicPhone')} inputMode="tel" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">Email public</span>
            <input value={form.publicEmail ?? ''} onChange={set('publicEmail')} type="email" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">Email pentru notificări</span>
            <input value={form.notificationEmail ?? ''} onChange={set('notificationEmail')} type="email" className={inputClass} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm text-slate-600">Despre tine</span>
          <textarea value={form.bio ?? ''} onChange={set('bio')} rows={3} maxLength={500} className={inputClass} />
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Se salvează...' : 'Salvează'}
        </button>
      </div>

      <h2 className={H2}>Date juridice (acord)</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className={`mb-4 flex items-center gap-2 text-sm ${profile.acordAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
          {profile.acordAvailable ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {profile.acordAvailable
            ? 'Acordul este activ pe site-ul tău.'
            : 'Acordul nu este încă activ: datele firmei sunt incomplete.'}
        </div>
        <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {([
            ['Firma', profile.firmaNume],
            ['CUI', profile.firmaCui],
            ['Nr. Reg. Com.', profile.firmaRegCom],
            ['EUID', profile.firmaEuid],
            ['Data înființării', profile.firmaDataInfiintarii],
            ['Reprezentant', profile.reprezentantNume],
            ['Telefon reprezentant', profile.reprezentantTelefon],
            ['Acord Mango Broker', profile.mangoAgreementEnabled ? 'Da' : 'Nu'],
            ['Bănci partenere', profile.bankPreDocuments || '—'],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <span className="shrink-0 text-slate-500">{label}</span>
              <span className="break-words text-right text-slate-800">{value || '—'}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">Sediu: <span className="text-slate-700">{profile.firmaSediu || '—'}</span></p>
        <p className="mt-4 text-xs text-slate-400">
          Datele juridice apar în acordul semnat de clienți, așa că le modifică doar echipa MoneyShop.
        </p>
      </div>
    </div>
  );
}
