import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, FileSignature, Loader2, MessageCircle, UserCheck } from 'lucide-react';
import { adminApi, type LeadItem } from '@/services/api/adminApi';
import { brokersApi } from '@/services/api/brokersApi';
import { useBroker } from '@/context/brokerContextValue';
import { leadAcordLinkFor } from '@/lib/brokerHost';
import { copyToClipboard } from '@/lib/clipboard';
import { useCrmPath } from '@/lib/crmPath';
import { whatsappLink } from '@/components/crm/acord/acordLabels';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';

/** Lead names are stored as "Nume Prenume": the first word is the family name. */
function leadFirstName(lead: LeadItem): string {
  const [nume = '', ...rest] = lead.numePrenume.trim().split(/\s+/);
  return rest.join(' ') || nume;
}

export function LeadAcordActions({
  lead, compact = false, onIssued,
}: {
  lead: LeadItem;
  compact?: boolean;
  onIssued: (lead: LeadItem) => void;
}) {
  const { slug: hostSlug } = useBroker();
  const crm = useCrmPath();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const slugRef = useRef<string | null | undefined>(undefined);

  if (lead.status === 'Convertit' && lead.userId) {
    return (
      <Link
        to={crm(`/crm/clienti/${lead.userId}`)}
        className={`inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 ${FOCUS_RING}`}
      >
        <UserCheck size={14} /> Vezi clientul
      </Link>
    );
  }

  const issue = async (): Promise<string | null> => {
    if (link) return link;
    setBusy(true);
    try {
      if (slugRef.current === undefined) {
        try { slugRef.current = (await brokersApi.getMe()).slug ?? hostSlug; } catch { slugRef.current = hostSlug; }
      }
      const { token } = await adminApi.createLeadAcordLink(lead.id);
      const url = leadAcordLinkFor(slugRef.current ?? null, token);
      setLink(url);
      onIssued(lead);
      return url;
    } catch {
      toast.error('Nu am putut genera linkul. Încearcă din nou.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    if (await copyToClipboard(link)) toast.success('Link copiat');
    else toast.error('Nu s-a putut copia linkul');
  };

  const fillNow = async () => {
    const win = window.open('', '_blank');
    const url = await issue();
    if (url && win) win.location.href = url;
    else win?.close();
  };

  const size = compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs';
  const primary = `inline-flex items-center gap-1.5 rounded-xl bg-brand-primary font-semibold text-white hover:opacity-90 disabled:opacity-60 ${size} ${FOCUS_RING}`;
  const secondary = `inline-flex items-center gap-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${size} ${FOCUS_RING}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!link && (
        <button type="button" onClick={() => { void issue(); }} disabled={busy} className={primary}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <FileSignature size={14} />} Trimite acordul
        </button>
      )}
      {link && (
        <>
          <button type="button" onClick={() => { void copy(); }} className={primary}>
            <Copy size={14} /> Copiază linkul
          </button>
          <a
            href={whatsappLink(lead.telefon ?? '', `Bună, ${leadFirstName(lead)}! Aici completezi acordul pentru analiza creditului, durează 3 minute: ${link}`)}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 font-semibold text-emerald-700 hover:bg-emerald-100 ${size} ${FOCUS_RING}`}
          >
            <MessageCircle size={14} /> Trimite pe WhatsApp
          </a>
        </>
      )}
      <button type="button" onClick={() => { void fillNow(); }} disabled={busy} className={secondary}>
        <ExternalLink size={14} /> Completează acum cu clientul
      </button>
    </div>
  );
}
