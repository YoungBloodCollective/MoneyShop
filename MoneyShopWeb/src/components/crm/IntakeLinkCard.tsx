import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Link2, Copy, Check, ExternalLink, MessageCircle, AlertTriangle } from 'lucide-react';
import { brokersApi, type BrokerProfile } from '@/services/api/brokersApi';
import { useBroker } from '@/context/brokerContextValue';
import { useAuth } from '@/hooks/useAuth';
import { brokerSiteUrl } from '@/lib/brokerHost';

function clientLinkFor(slug: string | null) {
  if (slug) return `${brokerSiteUrl(slug)}/acord`;
  return `${window.location.origin}/acord`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  let done = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      done = true;
    }
  } catch {
    done = false;
  }
  if (done) return true;
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

export function IntakeLinkCard() {
  const { slug: hostSlug } = useBroker();
  const { isBroker } = useAuth();
  const [profile, setProfile] = useState<BrokerProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isBroker) return;
    let active = true;
    brokersApi.getMe().then(p => { if (active) setProfile(p); }).catch(() => undefined);
    return () => { active = false; };
  }, [isBroker]);

  if (!isBroker) return null;

  const clientLink = clientLinkFor(profile?.slug ?? hostSlug);

  const copyLink = async () => {
    if (await copyToClipboard(clientLink)) {
      setCopied(true);
      toast.success('Link copiat');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Nu s-a putut copia linkul');
    }
  };

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `Bună! Pentru a începe, completează acordul și încarcă buletinul aici: ${clientLink}`,
  )}`;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-brand-primary to-brand-secondary" />
        <div className="flex flex-col gap-6 p-5 lg:flex-row lg:items-center lg:p-6">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Link2 size={18} className="text-brand-primary" />
              <h2 className="text-lg font-semibold text-slate-900">Linkul tău pentru clienți</h2>
            </div>
            <p className="mb-4 max-w-md text-sm text-slate-500">
              Trimite-l clienților tăi. Își dau acordul și încarcă buletinul direct de pe telefon, în câteva minute.
            </p>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="break-all text-sm font-medium text-slate-800">{clientLink}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyLink} className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiat' : 'Copiază'}
              </button>
              <a href={whatsappShare} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <MessageCircle size={16} /> WhatsApp
              </a>
              <a href={clientLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <ExternalLink size={16} /> Deschide
              </a>
            </div>
          </div>
          <div className="shrink-0 self-center rounded-2xl border border-slate-200 bg-white p-3">
            <QRCodeSVG value={clientLink} size={132} level="M" />
          </div>
        </div>
      </div>
      {profile && profile.acordAvailable === false && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-slate-800">Linkul nu este încă activ</p>
            <p className="text-sm text-slate-600">
              Acordul pentru clienți nu este încă disponibil pe contul tău. Contactează echipa MoneyShop pentru a-l activa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
