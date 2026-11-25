import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileSignature, Mail, Phone, RefreshCw, Sparkles } from 'lucide-react';
import { assignmentsApi, type AssignableType, type InboxItem } from '@/services/api/assignmentsApi';
import { brokersApi, type BrokerAdminItem } from '@/services/api/brokersApi';
import { AssignBrokerControl } from '@/components/crm/AssignBrokerControl';
import { EmptyState, ErrorState, PageHeader, SegmentChips, SkeletonCards } from '@/pages/crm/crmShared';
import { FOCUS_RING, relTime } from '@/pages/crm/crmHelpers';

const TYPE_META: Record<AssignableType, { label: string; icon: typeof Sparkles; cls: string }> = {
  appointment: { label: 'Programare', icon: CalendarClock, cls: 'bg-sky-50 text-sky-700' },
  lead: { label: 'Lead', icon: Sparkles, cls: 'bg-violet-50 text-violet-700' },
  acord: { label: 'Acord', icon: FileSignature, cls: 'bg-emerald-50 text-emerald-700' },
};

const REFRESH_MS = 30_000;

/**
 * Super Admin inbox: every request (site, calculator, acord, call booking) that has no broker
 * yet. The Super Admin assigns it here; it then appears in that broker's CRM. Assigning does
 * not convert the lead into a client or open a file — those stay separate steps in the CRM.
 */
export default function SuperAdminInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [brokers, setBrokers] = useState<BrokerAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [segment, setSegment] = useState<'toate' | AssignableType>('toate');

  useEffect(() => {
    let active = true;
    const load = (initial: boolean) => {
      if (initial) { setLoading(true); setError(false); }
      assignmentsApi.inbox()
        .then(list => { if (active) { setItems(list); setError(false); } })
        .catch(() => { if (active && initial) setError(true); })
        .finally(() => { if (active && initial) setLoading(false); });
    };
    queueMicrotask(() => { if (active) load(true); });
    // New requests show up without reloading the page.
    const timer = window.setInterval(() => load(false), REFRESH_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [reloadKey]);

  useEffect(() => {
    brokersApi.list().then(setBrokers).catch(() => undefined);
  }, []);

  const counts = useMemo(() => ({
    toate: items.length,
    appointment: items.filter(i => i.entityType === 'appointment').length,
    lead: items.filter(i => i.entityType === 'lead').length,
    acord: items.filter(i => i.entityType === 'acord').length,
  }), [items]);

  const visible = segment === 'toate' ? items : items.filter(i => i.entityType === segment);

  const removeItem = (item: InboxItem) =>
    setItems(prev => prev.filter(i => !(i.entityType === item.entityType && i.id === item.id)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="De atribuit"
        subtitle="Cereri fără broker: programări, lead-uri și acorduri. Alege brokerul responsabil; cererea apare imediat în CRM-ul lui."
        action={
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`}
          >
            <RefreshCw className="h-4 w-4" /> Reîncarcă
          </button>
        }
      />

      <SegmentChips
        active={segment}
        onChange={v => setSegment(v as typeof segment)}
        counts={counts}
        segments={[
          { key: 'toate', label: 'Toate' },
          { key: 'appointment', label: 'Programări' },
          { key: 'lead', label: 'Lead-uri' },
          { key: 'acord', label: 'Acorduri' },
        ]}
      />

      {loading ? (
        <SkeletonCards count={4} />
      ) : error ? (
        <ErrorState message="Nu s-a putut încărca inbox-ul." onRetry={() => setReloadKey(k => k + 1)} />
      ) : visible.length === 0 ? (
        <EmptyState message="Nimic de atribuit. Toate cererile au un broker." />
      ) : (
        <div className="space-y-3">
          {visible.map(item => {
            const meta = TYPE_META[item.entityType];
            const Icon = meta.icon;
            return (
              <div key={`${item.entityType}-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900">{item.name || 'Fără nume'}</h3>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {item.phone && <a href={`tel:${item.phone}`} className="flex items-center gap-1 hover:text-slate-800"><Phone size={11} />{item.phone}</a>}
                      {item.email && <span className="flex items-center gap-1"><Mail size={11} />{item.email}</span>}
                      {item.detail && <span>{item.detail}</span>}
                      {item.source && item.source !== meta.label && <span className="text-slate-400">Sursă: {item.source}</span>}
                      <span className="text-slate-400">{relTime(item.createdAt)}</span>
                    </div>
                    {item.answers && <p className="mt-1.5 text-xs text-slate-600">{item.answers}</p>}
                  </div>
                </div>
                <AssignBrokerControl
                  entityType={item.entityType}
                  id={item.id}
                  currentBrokerId={null}
                  brokers={brokers}
                  onAssigned={brokerId => { if (brokerId != null) removeItem(item); }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
