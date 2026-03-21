import { useState } from 'react';
import { ArrowLeft, Bell, Mail, Phone, Smartphone, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface NotifPrefs {
  emailStatusUpdates: boolean;
  emailOffers: boolean;
  emailNewsletter: boolean;
  smsStatusUpdates: boolean;
  smsUrgent: boolean;
  pushEnabled: boolean;
  pushStatusUpdates: boolean;
  pushOffers: boolean;
}

const defaultPrefs: NotifPrefs = {
  emailStatusUpdates: true,
  emailOffers: true,
  emailNewsletter: false,
  smsStatusUpdates: true,
  smsUrgent: true,
  pushEnabled: false,
  pushStatusUpdates: false,
  pushOffers: false,
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only peer"
        aria-label={label}
      />
      <div className="w-9 h-5 bg-dark-500 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-light-60 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white" />
    </label>
  );
}

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof NotifPrefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: API call to save notification preferences
      // await userApi.updateNotificationPrefs(prefs);
      await new Promise(r => setTimeout(r, 500));
      toast.success('Preferinte salvate!');
    } catch {
      toast.error('Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      icon: Mail,
      title: 'Notificari Email',
      desc: 'Primesti pe adresa de email',
      items: [
        { key: 'emailStatusUpdates' as const, label: 'Actualizari status aplicatie', desc: 'Cand statusul aplicatiei se schimba' },
        { key: 'emailOffers' as const, label: 'Oferte personalizate', desc: 'Oferte noi de la banci pe baza profilului tau' },
        { key: 'emailNewsletter' as const, label: 'Newsletter', desc: 'Noutati si sfaturi financiare saptamanale' },
      ],
    },
    {
      icon: Phone,
      title: 'Notificari SMS',
      desc: 'Primesti pe numarul de telefon',
      items: [
        { key: 'smsStatusUpdates' as const, label: 'Actualizari importante', desc: 'Aprobare, respingere sau documente necesare' },
        { key: 'smsUrgent' as const, label: 'Alerte urgente', desc: 'Actiuni necesare imediat (ex: semnare contract)' },
      ],
    },
    {
      icon: Smartphone,
      title: 'Notificari Push',
      desc: 'Notificari in browser',
      items: [
        { key: 'pushEnabled' as const, label: 'Activeaza notificari push', desc: 'Permite notificari in browser' },
        { key: 'pushStatusUpdates' as const, label: 'Status aplicatie', desc: 'Notificari instant la schimbari de status' },
        { key: 'pushOffers' as const, label: 'Oferte noi', desc: 'Notifica cand primesti oferte noi' },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <h1 className="text-2xl font-bold text-light-100 flex items-center gap-2">
        <Bell size={24} className="text-brand-primary" /> Notificari
      </h1>

      <p className="text-sm text-light-50">Alege cum vrei sa fii notificat despre activitatea contului tau.</p>

      {sections.map(section => (
        <div key={section.title} className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <section.icon size={18} className="text-brand-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-light-100">{section.title}</h2>
              <p className="text-xs text-light-50">{section.desc}</p>
            </div>
          </div>

          <div className="space-y-0">
            {section.items.map((item, i) => (
              <div key={item.key} className={`flex items-center justify-between py-3 ${
                i < section.items.length - 1 ? 'border-b border-dark-400/50' : ''
              }`}>
                <div>
                  <p className="text-sm text-light-90">{item.label}</p>
                  <p className="text-xs text-light-50 mt-0.5">{item.desc}</p>
                </div>
                <Toggle checked={prefs[item.key]} onChange={(v) => update(item.key, v)} label={item.label} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {saving ? 'Se salveaza...' : 'Salveaza preferintele'}
      </button>
    </div>
  );
}
