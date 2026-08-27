import { useEffect, useState } from 'react';
import { Search, Users, TrendingUp, CheckCircle, Clock, XCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { brokerAdminApi } from '@/services/api/brokerCrmApi';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLAN_COLORS: Record<string, string> = {
  Trial: 'bg-gray-500/15 text-gray-400',
  Basic: 'bg-blue-500/15 text-blue-400',
  Full: 'bg-yellow-500/15 text-yellow-400',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-success-500/15 text-success-400',
  Pending: 'bg-warning-500/15 text-warning-400',
  Suspended: 'bg-red-500/15 text-red-400',
  Rejected: 'bg-gray-500/15 text-gray-400',
};

interface BrokerRow {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  firma?: string;
  judet?: string;
  slug: string;
  plan: string;
  status: string;
  isActive: boolean;
  leadsTotal: number;
  dosareTotal: number;
  dosareAprobate: number;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  createdAt: string;
}

export default function AdminBrokerCrmPage() {
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedBroker, setSelectedBroker] = useState<BrokerRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        brokerAdminApi.getBrokers({ status: filterStatus || undefined, plan: filterPlan || undefined }),
        brokerAdminApi.getStats(),
      ]);
      setBrokers(b);
      setStats(s);
    } catch {
      toast.error('Eroare la incarcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterPlan, filterStatus]);

  const filtered = brokers.filter(b =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase()) ||
    b.firma?.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase())
  );

  async function changeStatus(broker: BrokerRow, status: string) {
    setActionLoading(true);
    try {
      await brokerAdminApi.updateStatus(broker.userId, status);
      toast.success(`Status schimbat la ${status}`);
      setBrokers(bs => bs.map(b => b.id === broker.id ? { ...b, status, isActive: status === 'Active' } : b));
      if (selectedBroker?.id === broker.id) setSelectedBroker(s => s ? { ...s, status, isActive: status === 'Active' } : s);
    } catch {
      toast.error('Eroare la schimbarea statusului');
    } finally {
      setActionLoading(false); }
  }

  async function changePlan(broker: BrokerRow, plan: string) {
    setActionLoading(true);
    try {
      await brokerAdminApi.setPlan(broker.userId, plan, plan !== 'Trial' ? 1 : undefined);
      toast.success(`Plan schimbat la ${plan}`);
      setBrokers(bs => bs.map(b => b.id === broker.id ? { ...b, plan } : b));
      if (selectedBroker?.id === broker.id) setSelectedBroker(s => s ? { ...s, plan } : s);
    } catch {
      toast.error('Eroare la schimbarea planului');
    } finally {
      setActionLoading(false); }
  }

  const statCards = [
    { label: 'Total brokeri CRM', value: stats?.total ?? 0, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/15' },
    { label: 'Activi', value: stats?.active ?? 0, icon: CheckCircle, color: 'text-success-500', bg: 'bg-success-500/15' },
    { label: 'Trial', value: stats?.trial ?? 0, icon: Clock, color: 'text-warning-500', bg: 'bg-warning-500/15' },
    { label: 'Leads generate', value: stats?.totalLeads ?? 0, icon: TrendingUp, color: 'text-brand-secondary', bg: 'bg-brand-secondary/15' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center">
          <TrendingUp size={22} className="text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-light-100">Brokeri CRM</h1>
          <p className="text-light-60 text-sm">Gestioneaza conturile broker din platforma SaaS</p>
        </div>
        <button onClick={load} className="ml-auto p-2 text-light-50 hover:text-light-90 hover:bg-dark-600 rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !brokers.length ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cauta dupa nume, email, firma, slug..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 text-sm focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
            <select
              value={filterPlan}
              onChange={e => setFilterPlan(e.target.value)}
              className="h-10 px-3 rounded-xl bg-dark-700 border border-dark-400 text-light-90 text-sm focus:border-brand-primary focus:outline-none"
            >
              <option value="">Toate planurile</option>
              <option value="Trial">Trial</option>
              <option value="Basic">Basic</option>
              <option value="Full">Full</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-xl bg-dark-700 border border-dark-400 text-light-90 text-sm focus:border-brand-primary focus:outline-none"
            >
              <option value="">Toate statusurile</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={clsx('bg-dark-700 border border-dark-400 rounded-2xl overflow-hidden',
              selectedBroker ? 'lg:col-span-2' : 'lg:col-span-3')}>
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={40} className="mx-auto text-light-50 mb-3 opacity-40" />
                  <p className="text-light-60">
                    {search ? 'Niciun broker gasit pentru cautarea ta.' : 'Nu exista brokeri CRM inregistrati.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 border-b border-dark-400 text-xs text-light-50 uppercase tracking-wider">
                    <span className="col-span-4">Broker</span>
                    <span className="col-span-2">Firma</span>
                    <span className="col-span-2">Plan</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-2 text-right">Leads / Dosare</span>
                  </div>
                  <div className="divide-y divide-dark-400">
                    {filtered.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBroker(selectedBroker?.id === b.id ? null : b)}
                        className={clsx(
                          'w-full text-left grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 px-5 py-3.5 hover:bg-dark-600/50 transition-colors',
                          selectedBroker?.id === b.id && 'bg-dark-600'
                        )}
                      >
                        <div className="sm:col-span-4 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary text-xs font-bold flex-shrink-0">
                            {b.name?.charAt(0)?.toUpperCase() || 'B'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-light-90 truncate">{b.name}</p>
                            <p className="text-xs text-light-50 truncate">{b.email}</p>
                          </div>
                        </div>
                        <div className="sm:col-span-2 flex items-center">
                          <span className="text-xs text-light-60 truncate">{b.firma || '—'}</span>
                        </div>
                        <div className="sm:col-span-2 flex items-center">
                          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', PLAN_COLORS[b.plan] ?? 'bg-gray-500/15 text-gray-400')}>
                            {b.plan}
                          </span>
                        </div>
                        <div className="sm:col-span-2 flex items-center">
                          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status] ?? 'bg-gray-500/15 text-gray-400')}>
                            {b.status}
                          </span>
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-end gap-3 text-xs text-light-60">
                          <span>{b.leadsTotal ?? 0} leads</span>
                          <span>{b.dosareTotal ?? 0} dosare</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {selectedBroker && (
              <BrokerDetail
                broker={selectedBroker}
                onClose={() => setSelectedBroker(null)}
                onStatusChange={changeStatus}
                onPlanChange={changePlan}
                actionLoading={actionLoading}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BrokerDetail({ broker, onClose, onStatusChange, onPlanChange, actionLoading }: {
  broker: BrokerRow;
  onClose: () => void;
  onStatusChange: (b: BrokerRow, s: string) => void;
  onPlanChange: (b: BrokerRow, p: string) => void;
  actionLoading: boolean;
}) {
  return (
    <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-light-90">{broker.name}</h3>
          <p className="text-xs text-light-50 mt-0.5">{broker.email}</p>
          <div className="flex gap-2 mt-2">
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', PLAN_COLORS[broker.plan] ?? '')}>
              {broker.plan}
            </span>
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[broker.status] ?? '')}>
              {broker.status}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-light-50 hover:text-light-90 text-xl leading-none">×</button>
      </div>

      <div className="space-y-1.5 text-sm">
        {broker.phone && <Row label="Telefon" value={broker.phone} />}
        {broker.firma && <Row label="Firma" value={broker.firma} />}
        {broker.judet && <Row label="Judet" value={broker.judet} />}
        <Row label="Slug" value={`/apply/${broker.slug}`} mono />
        <Row label="Leads" value={String(broker.leadsTotal ?? 0)} />
        <Row label="Dosare" value={`${broker.dosareTotal ?? 0} total, ${broker.dosareAprobate ?? 0} aprobate`} />
        {broker.trialEndsAt && (
          <Row label="Trial pana la" value={new Date(broker.trialEndsAt).toLocaleDateString('ro-RO')} />
        )}
        {broker.subscriptionEndsAt && (
          <Row label="Abonament pana la" value={new Date(broker.subscriptionEndsAt).toLocaleDateString('ro-RO')} />
        )}
        <Row label="Inregistrat" value={new Date(broker.createdAt).toLocaleDateString('ro-RO')} />
      </div>

      <div>
        <p className="text-xs font-medium text-light-50 mb-2 uppercase tracking-wider">Schimba status</p>
        <div className="flex flex-wrap gap-1.5">
          {(['Active', 'Pending', 'Suspended', 'Rejected'] as const).map(s => (
            <button
              key={s}
              disabled={actionLoading || broker.status === s}
              onClick={() => onStatusChange(broker, s)}
              className={clsx(
                'text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50',
                broker.status === s
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-dark-600 text-light-60 border-dark-400 hover:border-brand-primary hover:text-brand-primary'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-light-50 mb-2 uppercase tracking-wider">Schimba plan</p>
        <div className="flex flex-wrap gap-1.5">
          {(['Trial', 'Basic', 'Full'] as const).map(p => (
            <button
              key={p}
              disabled={actionLoading || broker.plan === p}
              onClick={() => onPlanChange(broker, p)}
              className={clsx(
                'text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50',
                broker.plan === p
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-dark-600 text-light-60 border-dark-400 hover:border-brand-primary hover:text-brand-primary'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-light-50 min-w-[100px] flex-shrink-0">{label}:</span>
      <span className={clsx('text-light-80', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}
