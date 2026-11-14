import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, CreditCard, UserPlus, AlertTriangle, Gavel } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { brokersApi } from '@/services/api/brokersApi';
import { apiClient } from '@/services/api/apiClient';
import { adminApi } from '@/services/api/adminApi';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, SkeletonCards, EmptyState, SegmentChips, Pagination } from './crmShared';
import { usePaged } from './crmHelpers';

interface Appointment {
  id: number;
  nume: string;
  prenume: string;
  judet: string;
  tipCredit: string;
  salariuNet: number;
  telefon: string;
  email: string;
  status: string;
  notes?: string;
  intarzieriBirou?: string | null;
  popriRecuperare?: string | null;
  brokerProfileId?: number | null;
  createdAt: string;
}

const STATUS_OPTIONS = ['Nou', 'Contactat', 'In lucru', 'Trimis Lead', 'BC Probleme', 'DTI', 'Nu se incadreaza', 'Finalizat', 'Anulat'];

const STATUS_LABEL: Record<string, string> = {
  'In lucru': 'În lucru',
  'Nu se incadreaza': 'Nu se încadrează',
};

const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

const STATUS_PILL: Record<string, string> = {
  Nou: 'bg-sky-50 text-sky-700',
  Contactat: 'bg-amber-50 text-amber-700',
  'In lucru': 'bg-violet-50 text-violet-700',
  'Trimis Lead': 'bg-indigo-50 text-indigo-700',
  'BC Probleme': 'bg-orange-50 text-orange-700',
  DTI: 'bg-yellow-50 text-yellow-700',
  'Nu se incadreaza': 'bg-rose-50 text-rose-700',
  Finalizat: 'bg-emerald-50 text-emerald-700',
  Anulat: 'bg-slate-100 text-slate-600',
};

const SEGMENTS = [{ key: 'toate', label: 'Toate' }, ...STATUS_OPTIONS.map(s => ({ key: s, label: statusLabel(s) }))];

export default function CrmProgramariPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [segment, setSegment] = useState('toate');
  const [converting, setConverting] = useState<number | null>(null);
  const [brokerNames, setBrokerNames] = useState<Record<number, string>>({});

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(false);
      apiClient.get('/appointments')
        .then(r => { if (active) setAppointments(r.data); })
        .catch(() => { if (active) setError(true); })
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    brokersApi.list()
      .then(list => setBrokerNames(Object.fromEntries(list.map(b => [b.id, b.displayName]))))
      .catch(() => undefined);
  }, [isSuperAdmin]);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await apiClient.patch(`/appointments/${id}/status`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? res.data : a));
      toast.success(`Status actualizat: ${statusLabel(status)}`);
    } catch {
      toast.error('Eroare la actualizare');
    }
  };

  const convertToLead = async (id: number) => {
    setConverting(id);
    try {
      await adminApi.convertAppointmentToLead(id);
      toast.success('Lead creat! Redirecționare...');
      navigate('/crm/leaduri');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) toast.error('Lead-ul există deja');
      else toast.error('Eroare la conversie');
    } finally {
      setConverting(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { toate: appointments.length };
    for (const s of STATUS_OPTIONS) c[s] = appointments.filter(a => a.status === s).length;
    return c;
  }, [appointments]);

  const filtered = useMemo(
    () => segment === 'toate' ? appointments : appointments.filter(a => a.status === segment),
    [appointments, segment],
  );

  const { page, setPage, pageCount, slice, total, pageSize } = usePaged(filtered, 25);

  const header = <PageHeader title="Programări" subtitle="Lead-uri din formularul de contact" />;

  if (loading) return (<div className="space-y-6">{header}<SkeletonCards count={4} /></div>);

  return (
    <div className="space-y-5">
      {header}
      <SegmentChips segments={SEGMENTS} active={segment} onChange={setSegment} counts={counts} />

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <span>Nu s-au putut încărca programările.</span>
          <button onClick={() => setReloadKey(k => k + 1)} className="font-medium underline underline-offset-2">Reîncearcă</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={segment === 'toate' ? 'Nicio programare.' : `Nicio programare cu status „${statusLabel(segment)}”.`} />
      ) : (
        <div className="space-y-3">
          {slice.map(a => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{a.nume} {a.prenume}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_PILL[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <a href={`tel:${a.telefon}`} className="flex items-center gap-1 hover:text-slate-800"><Phone size={11} />{a.telefon}</a>
                    {a.email && <span className="flex items-center gap-1"><Mail size={11} />{a.email}</span>}
                    {a.judet && <span className="flex items-center gap-1"><MapPin size={11} />{a.judet}</span>}
                    {a.tipCredit && <span className="flex items-center gap-1"><CreditCard size={11} />{a.tipCredit}</span>}
                    <span className="text-slate-400">{a.salariuNet.toLocaleString('ro-RO')} RON</span>
                    {isSuperAdmin && a.brokerProfileId != null && brokerNames[a.brokerProfileId] && (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-brand-primary">{brokerNames[a.brokerProfileId]}</span>
                    )}
                  </div>
                  {(a.intarzieriBirou || a.popriRecuperare) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.intarzieriBirou && (() => {
                        const isNu = a.intarzieriBirou === 'NU';
                        const label = isNu ? 'fără întârzieri' : a.intarzieriBirou.replace(/^Da-/, '').toLowerCase() + ' întârziere';
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isNu ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                            <AlertTriangle size={10} /> Birou: {label}
                          </span>
                        );
                      })()}
                      {a.popriRecuperare && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${a.popriRecuperare === 'NU' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <Gavel size={10} /> Popriri/Recuperare: {a.popriRecuperare}
                        </span>
                      )}
                    </div>
                  )}
                  {a.notes && <p className="mt-2 text-xs text-slate-600">{a.notes}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(a.createdAt).toLocaleString('ro-RO')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => convertToLead(a.id)}
                    disabled={converting === a.id}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    title="Convertește în lead"
                  >
                    <UserPlus size={13} /> {converting === a.id ? '...' : 'Lead'}
                  </button>
                  <select
                    value={a.status}
                    onChange={e => updateStatus(a.id, e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-primary focus:outline-none"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
