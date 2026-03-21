import { useEffect, useState } from 'react';
import {
  Search, ArrowLeft, ChevronDown, Save,
  FileText, Calendar, Banknote, User, Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type DisbursementRequest } from '@/services/api/adminApi';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';
import type { Application } from '@/types/application.types';

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS);

const STATUS_COLORS: Record<string, string> = {
  INREGISTRAT: 'bg-info-500/15 text-info-400 border-info-500/30',
  IN_ANALIZA: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
  NEVOIE_DOCUMENTE: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
  PREAPROBAT: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30',
  RESPINS: 'bg-error-500/15 text-error-400 border-error-500/30',
  OFERTA_TRANSMISA: 'bg-brand-purple/15 text-brand-purple border-brand-purple/30',
  ACCEPTAT_CLIENT: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30',
  TRIMIS_LA_BANCA: 'bg-info-500/15 text-info-400 border-info-500/30',
  APROBAT_BANCA: 'bg-success-500/15 text-success-400 border-success-500/30',
  DISBURSAT: 'bg-success-500/15 text-success-400 border-success-500/30',
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [updating, setUpdating] = useState(false);

  // Disbursement form
  const [disbursement, setDisbursement] = useState<DisbursementRequest>({});
  const [savingDisbursement, setSavingDisbursement] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    const filters: { status?: string; typeCredit?: string } = {};
    if (statusFilter) filters.status = statusFilter;
    if (typeFilter) filters.typeCredit = typeFilter;
    const apps = await adminApi.getApplications(filters);
    setApplications(apps);
    setLoading(false);
  };

  useEffect(() => {
    loadApplications();
  }, [statusFilter, typeFilter]);

  const filtered = applications.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.id.toString().includes(s) ||
      (a.typeCredit || '').toLowerCase().includes(s) ||
      a.status.toLowerCase().includes(s) ||
      (a.purpose || '').toLowerCase().includes(s)
    );
  });

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    setUpdating(true);
    try {
      await adminApi.updateStatus(id, newStatus);
      toast.success(`Status actualizat: ${APPLICATION_STATUS_LABELS[newStatus] || newStatus}`);
      // Update local state
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error('Eroare la actualizarea statusului');
    } finally {
      setUpdating(false);
    }
  };

  const handleDisbursementSave = async () => {
    if (!selected) return;
    setSavingDisbursement(true);
    try {
      await adminApi.updateDisbursement(selected.id, disbursement);
      toast.success('Informatii disbursare salvate');
      // Refresh data
      await loadApplications();
      setSelected(prev => prev ? {
        ...prev,
        sumaAprobata: disbursement.sumaAprobata ?? prev.sumaAprobata,
        comision: disbursement.comision ?? prev.comision,
        dataDisbursare: disbursement.dataDisbursare ?? prev.dataDisbursare,
        status: 'DISBURSAT',
      } : null);
    } catch {
      toast.error('Eroare la salvarea disbursarii');
    } finally {
      setSavingDisbursement(false);
    }
  };

  const selectApp = (app: Application) => {
    setSelected(app);
    setDisbursement({
      sumaAprobata: app.sumaAprobata ?? undefined,
      comision: app.comision ?? undefined,
      dataDisbursare: app.dataDisbursare ?? undefined,
    });
  };

  const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  const statusBadgeClass = (status: string) =>
    `px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-dark-500/15 text-light-60'}`;

  // Detail view
  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80 transition-colors"
        >
          <ArrowLeft size={16} /> Inapoi la lista
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-light-100">Aplicatie #{selected.id}</h1>
          <span className={statusBadgeClass(selected.status)}>
            {APPLICATION_STATUS_LABELS[selected.status] || selected.status}
          </span>
        </div>

        {/* Application details */}
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4">Detalii aplicatie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { icon: Hash, label: 'ID', value: `#${selected.id}` },
              { icon: FileText, label: 'Tip credit', value: selected.typeCredit || '-' },
              { icon: FileText, label: 'Tip operatiune', value: selected.tipOperatiune || '-' },
              { icon: Banknote, label: 'Suma solicitata', value: selected.requestedAmount ? `${fmt(selected.requestedAmount)} RON` : '-' },
              { icon: Calendar, label: 'Termen (luni)', value: selected.requestedTermMonths?.toString() || '-' },
              { icon: FileText, label: 'Scop', value: selected.purpose || '-' },
              { icon: Banknote, label: 'Salariu net', value: selected.salariuNet ? `${fmt(selected.salariuNet)} RON` : '-' },
              { icon: User, label: 'Scoring', value: selected.scoring?.toString() || '-' },
              { icon: User, label: 'DTI', value: selected.dti ? `${(selected.dti * 100).toFixed(1)}%` : '-' },
              { icon: Calendar, label: 'Creat', value: new Date(selected.createdAt).toLocaleDateString('ro-RO') },
              { icon: Calendar, label: 'Actualizat', value: new Date(selected.updatedAt).toLocaleDateString('ro-RO') },
              { icon: User, label: 'User ID', value: `#${selected.userId}` },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-dark-500/50">
                <span className="flex items-center gap-2 text-sm text-light-60">
                  <item.icon size={14} />
                  {item.label}
                </span>
                <span className="text-sm font-medium text-light-90">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status update */}
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4">Actualizeaza status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleStatusUpdate(selected.id, key)}
                disabled={updating || selected.status === key}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  selected.status === key
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : `${STATUS_COLORS[key] || 'bg-dark-600 text-light-60 border-dark-400'} hover:opacity-80`
                } disabled:opacity-40`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Disbursement form */}
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4">Informatii disbursare</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-light-50 uppercase tracking-wider mb-1.5">Suma aprobata (RON)</label>
              <input
                type="number"
                value={disbursement.sumaAprobata ?? ''}
                onChange={e => setDisbursement(prev => ({ ...prev, sumaAprobata: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="0"
                className="w-full h-11 px-3 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-light-50 uppercase tracking-wider mb-1.5">Comision (RON)</label>
              <input
                type="number"
                value={disbursement.comision ?? ''}
                onChange={e => setDisbursement(prev => ({ ...prev, comision: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="0"
                className="w-full h-11 px-3 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-light-50 uppercase tracking-wider mb-1.5">Data disbursare</label>
              <input
                type="date"
                value={disbursement.dataDisbursare?.split('T')[0] ?? ''}
                onChange={e => setDisbursement(prev => ({ ...prev, dataDisbursare: e.target.value || undefined }))}
                className="w-full h-11 px-3 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
          <button
            onClick={handleDisbursementSave}
            disabled={savingDisbursement}
            className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-full bg-success-500 text-white text-sm font-medium hover:bg-success-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> {savingDisbursement ? 'Se salveaza...' : 'Salveaza disbursare'}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-100">Gestionare aplicatii</h1>
        <div className="flex items-center gap-2">
          {!loading && (
            <span className="text-sm text-light-60">{filtered.length} aplicatii</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cauta dupa ID, tip, status..."
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-11 pl-3 pr-8 rounded-xl bg-dark-700 border border-dark-400 text-light-90 text-sm appearance-none focus:border-brand-primary focus:outline-none transition-colors min-w-[160px]"
          >
            <option value="">Toate statusurile</option>
            {STATUS_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-light-50 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-11 pl-3 pr-8 rounded-xl bg-dark-700 border border-dark-400 text-light-90 text-sm appearance-none focus:border-brand-primary focus:outline-none transition-colors min-w-[160px]"
          >
            <option value="">Toate tipurile</option>
            <option value="ipotecar">Ipotecar</option>
            <option value="nevoi_personale">Nevoi personale</option>
            <option value="refinantare">Refinantare</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-light-50 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto text-light-50 mb-4" />
          <p className="text-light-60">{search || statusFilter || typeFilter ? 'Niciun rezultat gasit' : 'Nu exista aplicatii'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <button
              key={app.id}
              onClick={() => selectApp(app)}
              className="w-full flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 text-left hover:border-brand-primary/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-light-90">
                    #{app.id}
                  </p>
                  <span className="text-xs text-light-50">·</span>
                  <p className="text-sm text-light-70">{app.typeCredit || 'Credit'}</p>
                </div>
                <p className="text-xs text-light-60 mt-0.5">
                  {new Date(app.createdAt).toLocaleDateString('ro-RO')}
                  {app.requestedAmount ? ` · ${fmt(app.requestedAmount)} RON` : ''}
                  {app.requestedTermMonths ? ` · ${app.requestedTermMonths} luni` : ''}
                </p>
              </div>
              <span className={statusBadgeClass(app.status)}>
                {APPLICATION_STATUS_LABELS[app.status] || app.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
