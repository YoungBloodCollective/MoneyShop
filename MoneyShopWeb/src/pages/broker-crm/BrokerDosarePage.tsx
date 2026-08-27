import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ChevronRight, Clock, X } from 'lucide-react';
import { brokerDosareApi } from '@/services/api/brokerCrmApi';
import type { BrokerDosar, DosarStatus, PipelineColumn } from '@/types/broker.types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PIPELINE_STATUSES: DosarStatus[] = [
  'Nou', 'Pregatire dosar', 'Trimis la banca', 'Analiza banca',
  'Aprobare conditionata', 'Aprobat', 'Contractat', 'Respins'
];

const STATUS_COLORS: Record<string, string> = {
  'Nou': 'bg-gray-100 text-gray-600',
  'Analiza ANAF/BC': 'bg-blue-100 text-blue-700',
  'Pregatire dosar': 'bg-yellow-100 text-yellow-700',
  'Trimis la banca': 'bg-indigo-100 text-indigo-700',
  'Analiza banca': 'bg-purple-100 text-purple-700',
  'Aprobare conditionata': 'bg-orange-100 text-orange-700',
  'Aprobat': 'bg-green-100 text-green-700',
  'Contractat': 'bg-emerald-100 text-emerald-700',
  'Respins': 'bg-red-100 text-red-700',
  'Retras': 'bg-gray-100 text-gray-400',
};

const TIP_CREDIT_OPTIONS = ['Personal', 'Imobiliar', 'Refinantare', 'Prima Casa', 'Business'];

export default function BrokerDosarePage() {
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([]);
  const [dosare, setDosare] = useState<BrokerDosar[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [selectedDosar, setSelectedDosar] = useState<BrokerDosar | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        brokerDosareApi.getPipeline(),
        brokerDosareApi.getAll({ status: filterStatus || undefined }),
      ]);
      setPipeline(p);
      setDosare(d);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  async function changeStatus(dosar: BrokerDosar, status: DosarStatus) {
    try {
      await brokerDosareApi.updateStatus(dosar.id, status);
      setDosare(ds => ds.map(d => d.id === dosar.id ? { ...d, status } : d));
      if (selectedDosar?.id === dosar.id) setSelectedDosar(s => s ? { ...s, status } : s);
      toast.success('Status actualizat');
      load();
    } catch { toast.error('Eroare'); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dosare</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dosare.length} dosare</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Dosar nou
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {(['list', 'pipeline'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {v === 'list' ? 'Lista' : 'Pipeline'}
            </button>
          ))}
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white">
          <option value="">Toate statusurile</option>
          {PIPELINE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={clsx('bg-white rounded-xl border border-gray-200 overflow-hidden',
            selectedDosar ? 'lg:col-span-2' : 'lg:col-span-3')}>
            {dosare.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>Niciun dosar. Creeaza primul dosar!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {dosare.map(d => (
                  <button key={d.id} onClick={() => setSelectedDosar(d)}
                    className={clsx('w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors',
                      selectedDosar?.id === d.id && 'bg-indigo-50')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{d.numeClient}</p>
                        <p className="text-xs text-gray-500">{d.tipCredit} {d.bancaTinta ? `· ${d.bancaTinta}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[d.status] ?? 'bg-gray-100')}>
                          {d.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      {d.sumaSolicitata && <span>{d.sumaSolicitata.toLocaleString('ro-RO')} RON</span>}
                      {d.terminLimita && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(d.terminLimita).toLocaleDateString('ro-RO')}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedDosar && (
            <DosarDetail dosar={selectedDosar} onClose={() => setSelectedDosar(null)}
              onStatusChange={changeStatus} />
          )}
        </div>
      ) : (
        <PipelineView pipeline={pipeline} onStatusChange={changeStatus} />
      )}

      {showCreate && (
        <CreateDosarModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function DosarDetail({ dosar, onClose, onStatusChange }: {
  dosar: BrokerDosar;
  onClose: () => void;
  onStatusChange: (d: BrokerDosar, s: DosarStatus) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900">{dosar.numeClient}</h3>
          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block', STATUS_COLORS[dosar.status])}>
            {dosar.status}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600">
        <div><span className="text-gray-400">Telefon: </span>{dosar.telefonClient}</div>
        {dosar.emailClient && <div><span className="text-gray-400">Email: </span>{dosar.emailClient}</div>}
        <div><span className="text-gray-400">Tip credit: </span>{dosar.tipCredit}</div>
        {dosar.bancaTinta && <div><span className="text-gray-400">Banca: </span>{dosar.bancaTinta}</div>}
        {dosar.sumaSolicitata && <div><span className="text-gray-400">Suma: </span>{dosar.sumaSolicitata.toLocaleString('ro-RO')} RON</div>}
        {dosar.sumaAprobata && <div><span className="text-gray-400">Aprobata: </span>{dosar.sumaAprobata.toLocaleString('ro-RO')} RON</div>}
        {dosar.note && <div className="bg-gray-50 rounded-lg p-2 text-xs">{dosar.note}</div>}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Muta in status</p>
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_STATUSES.map(s => (
            <button key={s} onClick={() => onStatusChange(dosar, s)}
              className={clsx('text-xs px-2 py-1.5 rounded-lg border transition-colors',
                dosar.status === s
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary')}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineView({ pipeline, onStatusChange }: {
  pipeline: PipelineColumn[];
  onStatusChange: (d: BrokerDosar, s: DosarStatus) => void;
}) {
  const active = pipeline.filter(col => PIPELINE_STATUSES.includes(col.status as DosarStatus));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {active.map(col => (
        <div key={col.status} className="flex-shrink-0 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', STATUS_COLORS[col.status] ?? 'bg-gray-100')}>
              {col.status}
            </span>
            <span className="text-xs text-gray-400">{col.items.length}</span>
          </div>
          <div className="space-y-2">
            {col.items.map((d: any) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <p className="font-semibold text-gray-900 text-xs truncate">{d.numeClient}</p>
                <p className="text-xs text-gray-500 truncate">{d.tipCredit} {d.bancaTinta ? `· ${d.bancaTinta}` : ''}</p>
                {d.sumaSolicitata && (
                  <p className="text-xs font-medium text-gray-700 mt-1">{d.sumaSolicitata.toLocaleString('ro-RO')} RON</p>
                )}
              </div>
            ))}
            {col.items.length === 0 && (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 h-16 flex items-center justify-center">
                <span className="text-xs text-gray-400">Gol</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateDosarModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ numeClient: '', telefonClient: '', emailClient: '', tipCredit: 'Personal', bancaTinta: '', sumaSolicitata: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await brokerDosareApi.create({
        numeClient: form.numeClient,
        telefonClient: form.telefonClient,
        emailClient: form.emailClient || undefined,
        tipCredit: form.tipCredit,
        bancaTinta: form.bancaTinta || undefined,
        sumaSolicitata: form.sumaSolicitata ? Number(form.sumaSolicitata) : undefined,
      });
      toast.success('Dosar creat!');
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la creare');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Dosar nou</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nume client *" value={form.numeClient} onChange={v => set('numeClient', v)} required />
            <Input label="Telefon *" value={form.telefonClient} onChange={v => set('telefonClient', v)} required />
          </div>
          <Input label="Email" value={form.emailClient} onChange={v => set('emailClient', v)} type="email" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tip credit</label>
              <select value={form.tipCredit} onChange={e => set('tipCredit', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white">
                {TIP_CREDIT_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Banca tinta" value={form.bancaTinta} onChange={v => set('bancaTinta', v)} />
          </div>
          <Input label="Suma solicitata (RON)" value={form.sumaSolicitata} onChange={v => set('sumaSolicitata', v)} type="number" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
              Anuleaza
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {loading ? 'Se creeaza...' : 'Creeaza dosar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}

function Input({ label, value, onChange, required, type = 'text' }: InputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
    </div>
  );
}
