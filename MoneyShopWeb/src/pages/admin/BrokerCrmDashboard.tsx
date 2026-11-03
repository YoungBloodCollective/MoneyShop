import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Link2, Copy, Check, ExternalLink, MessageCircle, Users, FileCheck,
  Clock, CalendarClock, UserCircle, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { brokersApi, type BrokerProfile } from '@/services/api/brokersApi';
import { acordApi, type AcordListItem } from '@/services/api/acordApi';
import { useBroker } from '@/context/brokerContextValue';

const STATUS_LABELS: Record<string, string> = {
  started: 'Inceput',
  documents: 'Documente incarcate',
  completed: 'Finalizat',
  rejected: 'Respins',
};

const STATUS_STYLES: Record<string, string> = {
  started: 'bg-dark-500 text-light-60',
  documents: 'bg-warning-500/15 text-warning-400',
  completed: 'bg-success-500/15 text-success-400',
  rejected: 'bg-error-500/15 text-error-400',
};

function clientLinkFor(slug: string | null) {
  if (slug) return `https://${slug}.moneyshop.ro/acord`;
  return `${window.location.origin}/acord`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function BrokerCrmDashboard() {
  const navigate = useNavigate();
  const { slug: hostSlug } = useBroker();
  const [profile, setProfile] = useState<BrokerProfile | null>(null);
  const [acorduri, setAcorduri] = useState<AcordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      brokersApi.getMe().catch(() => null),
      acordApi.adminList().catch(() => []),
    ])
      .then(([me, list]) => {
        setProfile(me);
        setAcorduri(list);
      })
      .finally(() => setLoading(false));
  }, []);

  const slug = profile?.slug ?? hostSlug;
  const clientLink = clientLinkFor(slug);

  const stats = useMemo(() => ({
    total: acorduri.length,
    finalizate: acorduri.filter(a => a.status === 'completed').length,
    inLucru: acorduri.filter(a => a.status === 'started' || a.status === 'documents').length,
    respinse: acorduri.filter(a => a.status === 'rejected').length,
  }), [acorduri]);

  const recent = useMemo(
    () => [...acorduri].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6),
    [acorduri],
  );

  const copyLink = async () => {
    const ok = await copyToClipboard(clientLink);
    if (ok) {
      setCopied(true);
      toast.success('Link copiat');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Nu s-a putut copia linkul');
    }
  };

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `Buna! Pentru a incepe, completeaza acordul si incarca buletinul aici: ${clientLink}`,
  )}`;

  const statCards = [
    { label: 'Clienti', value: stats.total, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/15' },
    { label: 'Finalizate', value: stats.finalizate, icon: FileCheck, color: 'text-success-500', bg: 'bg-success-500/15' },
    { label: 'In lucru', value: stats.inLucru, icon: Clock, color: 'text-warning-500', bg: 'bg-warning-500/15' },
  ];

  const quickActions = [
    { label: 'Toti clientii', desc: 'Acorduri, buletine, declaratii', path: '/admin/acord', icon: Users },
    { label: 'Programari', desc: 'Intalnirile cu clientii tai', path: '/admin/appointments', icon: CalendarClock },
    { label: 'Profilul meu', desc: 'Date firma, contact public', path: '/admin/profil', icon: UserCircle },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-light-100">
          Salut{profile?.displayName ? `, ${profile.displayName}` : ''}
        </h1>
        <p className="text-light-60 text-sm">CRM-ul tau de broker</p>
      </div>

      {/* Hero: client intake link */}
      <div className="bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={18} className="text-white" />
              <h2 className="text-white font-semibold text-lg">Linkul tau pentru clienti</h2>
            </div>
            <p className="text-white/80 text-sm mb-4 max-w-md">
              Trimite-l clientilor tai. Isi dau acordul si incarca buletinul direct de pe telefon, in cateva minute.
            </p>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-3 mb-4">
              <span className="text-white font-medium break-all text-sm lg:text-base">{clientLink}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-brand-primary text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiat' : 'Copiaza'}
              </button>
              <a
                href={whatsappShare}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
              <a
                href={clientLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors"
              >
                <ExternalLink size={16} /> Deschide
              </a>
            </div>
          </div>
          <div className="shrink-0 self-center bg-white rounded-2xl p-4">
            <QRCodeSVG value={clientLink} size={148} level="M" />
          </div>
        </div>
      </div>

      {/* Acord not available warning */}
      {profile && !profile.acordAvailable && (
        <div className="flex items-start gap-3 bg-warning-500/10 border border-warning-500/30 rounded-xl px-5 py-4">
          <AlertTriangle size={20} className="text-warning-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-light-90 font-medium text-sm">Linkul nu este inca activ</p>
            <p className="text-light-60 text-sm">
              Acordul pentru clienti nu este inca disponibil pe contul tau. Contacteaza echipa MoneyShop pentru a-l activa.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-xs text-light-50 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-xl font-bold text-light-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map(action => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="flex items-center gap-4 bg-dark-700 border border-dark-400 p-5 rounded-2xl text-left hover:border-brand-primary/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-primary/15 group-hover:bg-brand-primary/25 flex items-center justify-center transition-colors">
              <action.icon size={24} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-light-100 font-semibold">{action.label}</p>
              <p className="text-light-60 text-sm">{action.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Recent clients */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-light-100">Clienti recenti</h2>
          {acorduri.length > 0 && (
            <button
              onClick={() => navigate('/admin/acord')}
              className="flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
            >
              Vezi toti <ArrowRight size={14} />
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="bg-dark-700 border border-dark-400 rounded-2xl px-6 py-10 text-center">
            <p className="text-light-90 font-medium mb-1">Niciun client inca</p>
            <p className="text-light-60 text-sm">
              Trimite-le linkul de mai sus ca sa inceapa prima verificare.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(a => (
              <button
                key={a.acordId}
                onClick={() => navigate('/admin/acord')}
                className="w-full flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 text-left hover:border-brand-primary/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-light-90 truncate">
                    {a.nume} {a.prenume}
                  </p>
                  <p className="text-xs text-light-60 mt-0.5">
                    {a.telefon} &middot; {new Date(a.createdAt).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[a.status] ?? 'bg-dark-500 text-light-60'}`}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
