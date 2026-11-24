import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useCrmPath } from '@/lib/crmPath';
import { apiErrorMessage } from '@/services/api/brokersApi';
import { referralsApi, type ReferralItem, type ReferralOverview, type ReferralStatus } from '@/services/api/referralsApi';
import { CreditTypePill, StagePill } from '@/components/crm/client/ClientWorkSection';
import { PageHeader, SkeletonCards, EmptyState, ErrorState, SegmentChips } from './crmShared';
import { money, dateShort, FOCUS_RING } from './crmHelpers';

type Side = 'sent' | 'received' | 'all';

const STATUS_LABEL: Record<ReferralStatus, string> = {
  AsteaptaClient: 'Așteaptă clientul',
  Acceptat: 'Acceptat',
  Refuzat: 'Refuzat',
  Expirat: 'Expirat',
  Anulat: 'Anulat',
};

const STATUS_PILL: Record<ReferralStatus, string> = {
  AsteaptaClient: 'bg-amber-50 text-amber-700',
  Acceptat: 'bg-emerald-50 text-emerald-700',
  Refuzat: 'bg-rose-50 text-rose-700',
  Expirat: 'bg-slate-100 text-slate-600',
  Anulat: 'bg-slate-100 text-slate-600',
};

const MODE_PILL: Record<string, string> = {
  Colaborare: 'bg-indigo-50 text-indigo-700',
  Transfer: 'bg-sky-50 text-sky-700',
};

function ReferralCard({ item, side, onCancel, cancelling }: {
  item: ReferralItem;
  side: Side;
  onCancel: (item: ReferralItem) => void;
  cancelling: boolean;
}) {
  const crm = useCrmPath();
  const collaboration = item.mode === 'Colaborare';
  const accepted = item.status === 'Acceptat';
  const files = item.files ?? null;
  const clientLabel = item.clientName ?? (side === 'received' ? 'Client în așteptarea acordului' : 'Client');

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {item.clientUserId ? (
            <Link to={crm(`/crm/clienti/${item.clientUserId}`)} className={`block truncate rounded font-semibold text-slate-800 hover:text-brand-primary hover:underline ${FOCUS_RING}`}>
              {clientLabel}
            </Link>
          ) : (
            <span className={`block truncate font-semibold ${item.clientName ? 'text-slate-800' : 'text-slate-500'}`}>{clientLabel}</span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
            {side === 'received' ? (
              <span>de la <span className="font-medium text-slate-700">{item.fromBrokerName}</span></span>
            ) : side === 'sent' ? (
              <span>către <span className="font-medium text-slate-700">{item.toBrokerName}</span>{item.toBrokerOras ? `, ${item.toBrokerOras}` : ''}</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-slate-700">{item.fromBrokerName}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-label="către" />
                <span className="font-medium text-slate-700">{item.toBrokerName}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${MODE_PILL[item.mode] ?? 'bg-slate-100 text-slate-600'}`}>{item.mode}</span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[item.status]}`}>{STATUS_LABEL[item.status]}</span>
          <span className="text-xs text-slate-400">{dateShort(item.createdAt)}</span>
        </div>
      </div>

      {item.note && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600"><span className="font-medium text-slate-700">Notă: </span>{item.note}</p>
      )}

      {item.status === 'AsteaptaClient' && (
        <p className="mt-3 text-xs text-slate-500">Clientul a primit mesajul și poate răspunde până pe {dateShort(item.consentExpiresAt)}.</p>
      )}
      {item.status === 'Refuzat' && <p className="mt-3 text-xs text-slate-500">Clientul nu a fost de acord. Nu s-a transmis nimic.</p>}

      {accepted && collaboration && (
        <div className="mt-3 space-y-3">
          {side !== 'received' && (
            files && files.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {files.map((f, i) => (
                  <li key={`${f.bankName}-${f.statusChangedAt}-${i}`} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-slate-700">{f.bankName}</span>
                        <CreditTypePill type={f.creditType} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <StagePill status={f.status} />
                        <span>{dateShort(f.statusChangedAt)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap font-semibold text-slate-800">{money(f.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Încă nu sunt dosare. Apar aici după ce clientul semnează acordul cu {item.toBrokerName} și acesta le adaugă.</p>
            )
          )}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-sm">
            <span className="text-indigo-800">
              {side === 'received'
                ? `De plătit către ${item.fromBrokerName} (${item.sharePercent}%)`
                : side === 'sent'
                  ? `Comisionul tău (${item.sharePercent}%)`
                  : `Partea ${item.fromBrokerName} (${item.sharePercent}%)`}
            </span>
            <span className="font-semibold text-indigo-900">{money(item.shareAmount ?? 0)}</span>
          </div>
          <p className="text-xs text-slate-400">Estimat din dosarele disbursate, cu comisionul calculat de platformă pentru {item.toBrokerName}.</p>
        </div>
      )}

      {accepted && !collaboration && (
        <p className="mt-3 text-xs text-slate-500">Transfer finalizat: clientul este la {item.toBrokerName}. Nu există vizibilitate și nici comision împărțit.</p>
      )}

      {item.canCancel && side !== 'received' && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onCancel(item)}
            disabled={cancelling}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 ${FOCUS_RING}`}
          >
            {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Anulează cererea
          </button>
        </div>
      )}
    </li>
  );
}

export default function CrmColaborariPage() {
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'sent' | 'received'>('sent');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(() => referralsApi.overview(), []);

  useEffect(() => {
    let active = true;
    load()
      .then(d => { if (active) { setOverview(d); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, attempt]);

  const retry = () => { setLoading(true); setAttempt(a => a + 1); };

  const cancel = async (item: ReferralItem) => {
    if (!window.confirm(`Anulezi cererea către ${item.toBrokerName}? Linkul trimis clientului nu va mai funcționa.`)) return;
    setCancellingId(item.id);
    try {
      await referralsApi.cancel(item.id);
      toast.success('Cererea a fost anulată.');
      setOverview(await load());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut anula cererea.'));
    } finally {
      setCancellingId(null);
    }
  };

  const adminView = !!overview?.all;
  const segments = useMemo(() => [
    { key: 'sent', label: 'Trimise' },
    { key: 'received', label: 'Primite' },
  ], []);
  const counts = { sent: overview?.sent.length ?? 0, received: overview?.received.length ?? 0 };

  const side: Side = adminView ? 'all' : tab;
  const items = adminView ? overview?.all ?? [] : overview?.[tab] ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Colaborează"
        subtitle={adminView ? 'Toți clienții trimiși între brokeri' : 'Clienții trimiși colegilor și cei primiți de la ei'}
      />
      {!loading && !failed && !adminView && (
        <SegmentChips segments={segments} active={tab} onChange={k => setTab(k as 'sent' | 'received')} counts={counts} />
      )}
      {loading ? (
        <SkeletonCards count={4} />
      ) : failed ? (
        <ErrorState message="Nu am putut încărca colaborările" onRetry={retry} />
      ) : items.length === 0 ? (
        <EmptyState message={
          adminView ? 'Nicio trimitere între brokeri încă.'
            : tab === 'sent' ? 'Nu ai trimis niciun client. Deschide un client sau un dosar și apasă „Colaborează / Transferă”.'
              : 'Nu ai primit încă niciun client de la colegi.'
        } />
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <ReferralCard key={item.id} item={item} side={side} onCancel={cancel} cancelling={cancellingId === item.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
