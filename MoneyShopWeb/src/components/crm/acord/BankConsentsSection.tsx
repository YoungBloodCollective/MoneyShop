import { useCallback, useEffect, useState } from 'react';
import { Copy, Download, Link2, Loader2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  acordApi, type AcordDetails, type BankConsentBank, type BankConsentInfo,
} from '@/services/api/acordApi';
import { BANK_CONSENT_STATUS, consentLink, formatDateTime, whatsappLink } from './acordLabels';

const SELECT_CLS = 'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus:outline-none';

export type BankConsentsAcord = Pick<AcordDetails, 'acordId' | 'status' | 'signedAt' | 'telefon' | 'prenume'>;

export function BankConsentsSection({ acord, onSigned }: { acord: BankConsentsAcord; onSigned: () => void }) {
  const [banks, setBanks] = useState<BankConsentBank[]>([]);
  const [requests, setRequests] = useState<BankConsentInfo[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<{ url: string; bankName: string } | null>(null);
  const [codebitorLoading, setCodebitorLoading] = useState(false);
  const [codebitorRelation, setCodebitorRelation] = useState('');

  const loadRequests = useCallback(() => {
    acordApi.adminBankConsents(acord.acordId).then(setRequests).catch(() => undefined);
  }, [acord.acordId]);

  useEffect(() => {
    acordApi.adminBankConsentBanks()
      .then(list => { setBanks(list); setBankCode(c => c || list[0]?.code || ''); })
      .catch(() => undefined);
    loadRequests();
  }, [loadRequests]);

  const create = async () => {
    if (!bankCode) return;
    setCreating(true);
    try {
      const created = await acordApi.adminCreateBankConsent(acord.acordId, bankCode);
      setLink({ url: consentLink(created.token, created.brokerSlug), bankName: created.request.bankName });
      loadRequests();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg || 'Nu am putut genera linkul');
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copiat');
    } catch {
      toast.error('Nu s-a putut copia linkul');
    }
  };

  const refresh = () => {
    loadRequests();
    onSigned();
  };

  const acordSigned = acord.status === 'signed' || acord.status === 'completed';
  const generateCodebitorForm = async () => {
    setCodebitorLoading(true);
    try {
      const blob = await acordApi.codebitorFormBlob(acord.acordId, codebitorRelation);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const data = (err as { response?: { data?: unknown } }).response?.data;
      const text = data instanceof Blob ? await data.text().catch(() => '') : '';
      toast.error(text.replace(/^"|"$/g, '') || 'Nu am putut genera formularul');
    } finally {
      setCodebitorLoading(false);
    }
  };

  return (
    <>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Consimțăminte bănci</h2>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!acord.signedAt ? (
          <p className="text-sm text-slate-500">Clientul trebuie să semneze întâi acordul.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Generează un link către formularele băncii, completate cu datele clientului. Linkul e valabil 7 zile.
            </p>
            <div className="flex flex-wrap gap-2">
              <select value={bankCode} onChange={e => setBankCode(e.target.value)} className={SELECT_CLS}>
                {banks.map(b => (
                  <option key={b.code} value={b.code}>
                    {b.name}{b.documentCount > 1 ? ` (${b.documentCount} documente)` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={create}
                disabled={creating || !bankCode}
                className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Generează link
              </button>
            </div>
            {link && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1 text-xs text-slate-500">Link documente {link.bankName}</p>
                <p className="mb-3 break-all text-sm text-slate-800">{link.url}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={copy} className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white">
                    <Copy size={15} /> Copiază
                  </button>
                  <a
                    href={whatsappLink(acord.telefon, `Bună, ${acord.prenume}! Te rog să semnezi documentele pentru ${link.bankName}: ${link.url}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    <MessageCircle size={15} /> Trimite pe WhatsApp
                  </a>
                </div>
              </div>
            )}
          </>
        )}
        {requests.length > 0 && (
          <div className="mt-4 space-y-2">
            {requests.map(r => {
              const status = BANK_CONSENT_STATUS[r.status] ?? { label: r.status, className: 'text-slate-600' };
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm">
                  <span className="text-slate-700">{r.bankName} · {formatDateTime(r.createdAt)}</span>
                  <span className={status.className}>{status.label}{r.signedAt ? ` · ${formatDateTime(r.signedAt)}` : ''}</span>
                </div>
              );
            })}
            <button onClick={refresh} className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800">
              Reîncarcă statusul
            </button>
          </div>
        )}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs text-slate-500">
            Cererea de codebitor Patria face parte din pachetul Patria semnat prin link. Butonul de mai jos e scurtătura pentru clienții care au semnat deja pachetul: se completează din datele acordului, poartă semnătura capturată la semnarea acordului, iar generarea se înregistrează în jurnalul de audit.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={codebitorRelation}
              onChange={e => setCodebitorRelation(e.target.value)}
              aria-label="Relația codebitorului cu solicitantul"
              className={SELECT_CLS}
            >
              <option value="">Relația codebitorului cu solicitantul — nespecificat</option>
              <option value="sot">Soț/soție</option>
              <option value="parinti">Părinți</option>
              <option value="socri">Socri</option>
              <option value="copii">Copii</option>
              <option value="partener">Partener(ă)</option>
              <option value="frate">Frate/soră</option>
            </select>
            <button
              onClick={generateCodebitorForm}
              disabled={codebitorLoading || !acordSigned}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {codebitorLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Generează cererea de codebitor (Patria) — completată și semnată
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
