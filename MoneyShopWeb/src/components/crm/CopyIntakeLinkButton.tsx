import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';
import { brokersApi } from '@/services/api/brokersApi';
import { useBroker } from '@/context/brokerContextValue';
import { clientLinkFor } from '@/lib/brokerHost';
import { copyToClipboard } from '@/lib/clipboard';

export function CopyIntakeLinkButton() {
  const { slug: hostSlug } = useBroker();
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    setBusy(true);
    let slug = hostSlug;
    try {
      slug = (await brokersApi.getMe()).slug ?? hostSlug;
    } catch {
      slug = hostSlug;
    }
    if (await copyToClipboard(clientLinkFor(slug))) toast.success('Link copiat');
    else toast.error('Nu s-a putut copia linkul');
    setBusy(false);
  };

  return (
    <button
      onClick={copy}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      <Copy className="h-4 w-4" /> Copiază linkul de acord
    </button>
  );
}
