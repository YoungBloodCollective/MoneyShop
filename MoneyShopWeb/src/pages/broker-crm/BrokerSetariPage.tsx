import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Save, RefreshCw } from 'lucide-react';
import { brokerProfileApi, brokerAuthApi } from '@/services/api/brokerCrmApi';
import { useBrokerAuthStore } from '@/store/brokerAuthStore';
import type { BrokerProfile } from '@/types/broker.types';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLAN_FEATURES = {
  Trial: { dosare: 10, anaf: 3, bc: 2, price: 'Gratuit 30 zile' },
  Basic: { dosare: 50, anaf: 20, bc: 5, price: '150 RON/luna' },
  Full: { dosare: '∞', anaf: 100, bc: 50, price: '500 RON/luna' },
};

export default function BrokerSetariPage() {
  const { brokerUser, setBrokerUser } = useBrokerAuthStore();
  const [profile, setProfile] = useState<BrokerProfile | null>(null);
  const [slug, setSlug] = useState('');
  const [form, setForm] = useState({ bio: '', firma: '', cui: '', website: '', judet: '', oras: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    brokerProfileApi.get().then(p => {
      setProfile(p);
      setSlug(p.slug);
      setForm({ bio: p.bio ?? '', firma: p.firma ?? '', cui: p.cui ?? '', website: p.website ?? '', judet: p.judet ?? '', oras: p.oras ?? '' });
    }).finally(() => setLoading(false));
  }, []);

  const link = `https://moneyshop.ro/apply/${slug}`;

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await brokerProfileApi.update({ ...form });
      setProfile(updated);
      toast.success('Profil salvat!');
    } catch { toast.error('Eroare la salvare'); }
    finally { setSaving(false); }
  }

  async function saveSlug() {
    setSaving(true);
    try {
      const res = await brokerProfileApi.updateSlug(slug);
      setSlug(res.slug);
      toast.success('Slug actualizat!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare');
    } finally { setSaving(false); }
  }

  async function upgradePlan(plan: 'Basic' | 'Full') {
    try {
      await brokerAuthApi.selectPlan(plan);
      toast.success(`Ai schimbat planul la ${plan}!`);
      const updated = await brokerAuthApi.me();
      setBrokerUser(updated);
      setProfile(p => p ? { ...p, plan } : p);
    } catch { toast.error('Eroare la schimbare plan'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Setari cont</h1>

      <Section title="Link unic de lead-uri">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug personalizat</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center border border-gray-300 rounded-xl overflow-hidden">
                  <span className="px-3 text-xs text-gray-400 bg-gray-50 border-r border-gray-300 py-3 whitespace-nowrap">/apply/</span>
                  <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase())}
                    className="flex-1 px-3 py-3 text-sm focus:outline-none" placeholder="slug-tau" />
                </div>
                <button onClick={saveSlug} disabled={saving}
                  className="px-4 py-3 bg-brand-primary text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1.5">Linkul tau</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-indigo-800 flex-1 truncate">{link}</p>
                <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Copiat!'); }}
                  className="text-indigo-600 hover:text-indigo-800">
                  <Copy className="w-4 h-4" />
                </button>
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-gray-700">QR Code</p>
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <QRCodeSVG value={link} size={140} />
            </div>
            <p className="text-xs text-gray-400 text-center">Distribuie-l pe print sau WhatsApp</p>
          </div>
        </div>
      </Section>

      <Section title="Informatii profil">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Firma" value={form.firma} onChange={v => setForm(f => ({ ...f, firma: v }))} />
          <FormField label="CUI" value={form.cui} onChange={v => setForm(f => ({ ...f, cui: v }))} />
          <FormField label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} placeholder="https://" />
          <FormField label="Judet" value={form.judet} onChange={v => setForm(f => ({ ...f, judet: v }))} />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="Descrie-te pe scurt..." />
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving}
          className="mt-4 px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-60">
          {saving ? 'Se salveaza...' : 'Salveaza profil'}
        </button>
      </Section>

      <Section title="Plan de abonament">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['Trial', 'Basic', 'Full'] as const).map(plan => {
            const f = PLAN_FEATURES[plan];
            const isCurrent = profile?.plan === plan;
            return (
              <div key={plan} className={clsx('rounded-xl border-2 p-5 transition-all',
                isCurrent ? 'border-brand-primary bg-indigo-50' : 'border-gray-200 bg-white')}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{plan}</p>
                    <p className="text-sm font-medium text-brand-primary">{f.price}</p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs bg-brand-primary text-white px-2 py-0.5 rounded-full">Activ</span>
                  )}
                </div>
                <ul className="space-y-1 text-xs text-gray-600 mb-4">
                  <li>• {f.dosare} dosare active</li>
                  <li>• {f.anaf} interogari ANAF/luna</li>
                  <li>• {f.bc} interogari BC/luna</li>
                </ul>
                {!isCurrent && plan !== 'Trial' && (
                  <button onClick={() => upgradePlan(plan)}
                    className="w-full py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-indigo-700 transition-colors">
                    {profile?.plan === 'Full' ? 'Downgrade' : 'Upgrade'} la {plan}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function FormField({ label, value, onChange, placeholder }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
    </div>
  );
}
