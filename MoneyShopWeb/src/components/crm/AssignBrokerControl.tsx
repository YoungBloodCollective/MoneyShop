import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserRoundCog } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isAdminWorkspace } from '@/lib/crmPath';
import { assignmentsApi, type AssignableType } from '@/services/api/assignmentsApi';
import { brokersApi, type BrokerAdminItem } from '@/services/api/brokersApi';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';

const ACTION_TOAST: Record<string, string> = {
  assign: 'Atribuit. Brokerul a fost notificat pe email.',
  transfer: 'Transferat. Noul broker a fost notificat pe email.',
  unassign: 'Mutat înapoi în inbox-ul Super Admin.',
  unchanged: 'Brokerul era deja acesta.',
};

/**
 * Super Admin control to assign or transfer a request to a broker. Rendered only for the
 * Super Admin in the /admin workspace; brokers never see it.
 */
export function AssignBrokerControl({
  entityType, id, currentBrokerId, brokers, onAssigned, compact,
}: {
  entityType: AssignableType;
  id: string;
  currentBrokerId: number | null | undefined;
  /** Broker list from the page; when omitted the control loads it itself. */
  brokers?: BrokerAdminItem[];
  onAssigned: (brokerProfileId: number | null) => void;
  compact?: boolean;
}) {
  const { isSuperAdmin } = useAuth();
  const { pathname } = useLocation();
  const [target, setTarget] = useState<string>(currentBrokerId != null ? String(currentBrokerId) : '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [ownBrokers, setOwnBrokers] = useState<BrokerAdminItem[]>([]);
  const visible = isSuperAdmin && isAdminWorkspace(pathname);
  const needsOwnList = visible && brokers === undefined;

  useEffect(() => {
    if (!needsOwnList) return;
    let active = true;
    brokersApi.list().then(list => { if (active) setOwnBrokers(list); }).catch(() => undefined);
    return () => { active = false; };
  }, [needsOwnList]);

  if (!visible) return null;

  const current = currentBrokerId != null ? String(currentBrokerId) : '';
  const changed = target !== current;
  const active = (brokers ?? ownBrokers).filter(b => b.status === 'Active');
  const isTransfer = currentBrokerId != null;

  const submit = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      const res = await assignmentsApi.assign({
        entityType, id,
        brokerProfileId: target ? Number(target) : null,
        reason: reason.trim() || undefined,
      });
      toast.success(ACTION_TOAST[res.action] ?? 'Salvat.');
      setReason('');
      onAssigned(res.toBrokerProfileId);
    } catch {
      toast.error('Nu s-a putut salva atribuirea.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-3 rounded-xl bg-slate-50 p-2.5'}`}>
      <UserRoundCog className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <label className="sr-only" htmlFor={`assign-${entityType}-${id}`}>Broker responsabil</label>
      <select
        id={`assign-${entityType}-${id}`}
        value={target}
        onChange={e => setTarget(e.target.value)}
        className={`rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 ${FIELD_FOCUS}`}
      >
        <option value="">Neatribuit (inbox Super Admin)</option>
        {active.map(b => <option key={b.id} value={b.id}>{b.displayName}</option>)}
      </select>
      {changed && isTransfer && (
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          maxLength={500}
          placeholder="Motivul transferului (opțional)"
          aria-label="Motivul transferului"
          className={`min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs ${FIELD_FOCUS}`}
        />
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!changed || saving}
        className={`rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 ${FOCUS_RING}`}
      >
        {saving ? 'Se salvează…' : isTransfer ? 'Transferă' : 'Atribuie'}
      </button>
    </div>
  );
}
