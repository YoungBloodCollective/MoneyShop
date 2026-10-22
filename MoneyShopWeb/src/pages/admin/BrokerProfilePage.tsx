import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { brokersApi, apiErrorMessage, type BrokerProfile, type BrokerSelfUpdate } from '@/services/api/brokersApi';
import { brokerSiteUrl } from '@/lib/brokerHost';

const inputClass =
  'w-full px-4 py-3 rounded-2xl bg-dark-700 border border-dark-500 text-light-90 placeholder:text-light-40 focus:outline-none focus:border-brand-primary';

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
    <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-700 rounded-2xl px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs text-light-50 mb-1">{label}</p>
        <p className="text-light-100 font-medium break-all">{url}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={copy} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-primary text-white text-sm font-medium">
          <Copy size={15} /> Copiază
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-dark-600 text-light-80 text-sm font-medium">
          <ExternalLink size={15} /> Deschide
        </a>
      </div>
    </div>
  );
}

export default function BrokerProfilePage() {
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

  if (error) return <div className="p-6 text-error-500">{error}</div>;
  if (!profile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={28} className="text-brand-primary animate-spin" />
      </div>
    );
  }

  const site = brokerSiteUrl(profile.slug);
  const set = (key: keyof BrokerSelfUpdate) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-light-100">Profilul meu</h1>
      <p className="text-sm text-light-50 mt-1 mb-6">Linkurile tale și datele afișate clienților.</p>

      <div className="space-y-3 mb-8">
        <LinkRow label="Site-ul tău" url={site} />
        <LinkRow label="Link acord pentru clienți" url={`${site}/acord`} />
      </div>

      <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-3">Date publice</h2>
      <div className="bg-dark-700 rounded-2xl p-5 mb-8 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm text-light-60 mb-1.5">Nume afișat</span>
            <input value={form.displayName ?? ''} onChange={set('displayName')} className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-sm text-light-60 mb-1.5">Telefon public</span>
            <input value={form.publicPhone ?? ''} onChange={set('publicPhone')} inputMode="tel" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-sm text-light-60 mb-1.5">Email public</span>
            <input value={form.publicEmail ?? ''} onChange={set('publicEmail')} type="email" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-sm text-light-60 mb-1.5">Email pentru notificări</span>
            <input value={form.notificationEmail ?? ''} onChange={set('notificationEmail')} type="email" className={inputClass} />
          </label>
        </div>
        <label className="block">
          <span className="block text-sm text-light-60 mb-1.5">Despre tine</span>
          <textarea value={form.bio ?? ''} onChange={set('bio')} rows={3} maxLength={500} className={inputClass} />
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-full bg-brand-primary text-white font-semibold disabled:opacity-60"
        >
          {saving ? 'Se salvează...' : 'Salvează'}
        </button>
      </div>

      <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-3">Date juridice (acord)</h2>
      <div className="bg-dark-700 rounded-2xl p-5">
        <div className={`flex items-center gap-2 text-sm mb-4 ${profile.acordAvailable ? 'text-success-600' : 'text-warning-500'}`}>
          {profile.acordAvailable ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {profile.acordAvailable
            ? 'Acordul este activ pe site-ul tău.'
            : 'Acordul nu este încă activ: datele firmei sunt incomplete.'}
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {([
            ['Firma', profile.firmaNume],
            ['CUI', profile.firmaCui],
            ['Nr. Reg. Com.', profile.firmaRegCom],
            ['EUID', profile.firmaEuid],
            ['Data înființării', profile.firmaDataInfiintarii],
            ['Reprezentant', profile.reprezentantNume],
            ['Telefon reprezentant', profile.reprezentantTelefon],
            ['Acord Mango Broker', profile.mangoAgreementEnabled ? 'Da' : 'Nu'],
            ['Acord GDPR ProCredit Bank', profile.proCreditConsentEnabled ? 'Da' : 'Nu'],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-dark-600 pb-2">
              <span className="text-light-50 shrink-0">{label}</span>
              <span className="text-light-90 text-right break-words">{value || '—'}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-light-50 mt-3">Sediu: <span className="text-light-80">{profile.firmaSediu || '—'}</span></p>
        <p className="text-xs text-light-40 mt-4">
          Datele juridice apar în acordul semnat de clienți, așa că le modifică doar echipa MoneyShop.
        </p>
      </div>
    </div>
  );
}
