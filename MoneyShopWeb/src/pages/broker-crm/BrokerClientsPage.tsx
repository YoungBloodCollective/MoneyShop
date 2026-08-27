import { useEffect, useState } from 'react';
import { Search, Plus, Phone, Mail, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import { brokerLeadsApi, brokerDosareApi } from '@/services/api/brokerCrmApi';
import type { BrokerLead, LeadStatus } from '@/types/broker.types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_COLORS: Record<LeadStatus, string> = {
  'Nou': 'bg-blue-100 text-blue-700',
  'Contactat': 'bg-yellow-100 text-yellow-700',
  'Interesat': 'bg-indigo-100 text-indigo-700',
  'Dosar deschis': 'bg-purple-100 text-purple-700',
  'Neinteresat': 'bg-gray-100 text-gray-500',
  'Nu raspunde': 'bg-orange-100 text-orange-700',
};

const ALL_STATUSES: LeadStatus[] = ['Nou', 'Contactat', 'Interesat', 'Dosar deschis', 'Neinteresat', 'Nu raspunde'];

export default function BrokerClientsPage() {
  const [leads, setLeads] = useState<BrokerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLead, setSelectedLead] = useState<BrokerLead | null>(null);
  const [newDosarLeadId, setNewDosarLeadId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await brokerLeadsApi.getAll({ search: search || undefined, status: filterStatus || undefined });
      setLeads(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterStatus]);

  async function changeStatus(lead: BrokerLead, status: LeadStatus) {
    try {
      await brokerLeadsApi.updateStatus(lead.id, status);
      setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, status } : l));
      if (selectedLead?.id === lead.id) setSelectedLead(s => s ? { ...s, status } : s);
      toast.success('Status actualizat');
    } catch { toast.error('Eroare la actualizare'); }
  }

  async function createDosar(lead: BrokerLead) {
    try {
      const res = await brokerDosareApi.create({
        brokerLeadId: lead.id,
        numeClient: `${lead.nume} ${lead.prenume ?? ''}`.trim(),
        telefonClient: lead.telefon,
        emailClient: lead.email,
        tipCredit: lead.tipCredit,
        sumaSolicitata: lead.sumaDorita,
      });
      await changeStatus(lead, 'Dosar deschis');
      toast.success(`Dosar #${res.id} creat!`);
    } catch { toast.error('Eroare la creare dosar'); }
  }

  async function deleteLead(id: number) {
    if (!confirm('Stergi definitiv acest lead?')) return;
    try {
      await brokerLeadsApi.delete(id);
      setLeads(ls => ls.filter(l => l.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
      toast.success('Lead sters');
    } catch { toast.error('Eroare la stergere'); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti & Lead-uri</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} lead-uri</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cauta dupa nume, telefon, email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white">
          <option value="">Toate statusurile</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={clsx('bg-white rounded-xl border border-gray-200 overflow-hidden',
          selectedLead ? 'lg:col-span-2' : 'lg:col-span-3')}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">Niciun lead gasit</p>
              <p className="text-sm mt-1">Lead-urile apar automat cand cineva completeaza formularul tau</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leads.map(lead => (
                <button key={lead.id} onClick={() => setSelectedLead(lead)}
                  className={clsx('w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors',
                    selectedLead?.id === lead.id && 'bg-indigo-50')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{lead.nume} {lead.prenume}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{lead.telefon} {lead.email ? `· ${lead.email}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[lead.status as LeadStatus] ?? 'bg-gray-100 text-gray-600')}>
                        {lead.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                    {lead.tipCredit && <span>{lead.tipCredit}</span>}
                    {lead.salariuNet && <span>{lead.salariuNet.toLocaleString('ro-RO')} RON</span>}
                    {lead.judet && <span>{lead.judet}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedLead && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selectedLead.nume} {selectedLead.prenume}</h3>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block',
                  STATUS_COLORS[selectedLead.status as LeadStatus] ?? 'bg-gray-100 text-gray-600')}>
                  {selectedLead.status}
                </span>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>

            <div className="space-y-2 text-sm">
              <InfoRow icon={Phone} value={selectedLead.telefon} />
              {selectedLead.email && <InfoRow icon={Mail} value={selectedLead.email} />}
              {selectedLead.tipCredit && <div className="text-gray-600"><span className="text-gray-400">Tip: </span>{selectedLead.tipCredit}</div>}
              {selectedLead.salariuNet && <div className="text-gray-600"><span className="text-gray-400">Salariu: </span>{selectedLead.salariuNet.toLocaleString('ro-RO')} RON</div>}
              {selectedLead.sumaDorita && <div className="text-gray-600"><span className="text-gray-400">Suma dorita: </span>{selectedLead.sumaDorita.toLocaleString('ro-RO')} RON</div>}
              {selectedLead.judet && <div className="text-gray-600"><span className="text-gray-400">Judet: </span>{selectedLead.judet}</div>}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Schimba status</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => changeStatus(selectedLead, s)}
                    className={clsx('text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                      selectedLead.status === s
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-brand-primary hover:text-brand-primary')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              {selectedLead.status !== 'Dosar deschis' && (
                <button onClick={() => createDosar(selectedLead)}
                  className="w-full py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                  + Deschide dosar
                </button>
              )}
              <button onClick={() => deleteLead(selectedLead.id)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Sterge lead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span>{value}</span>
    </div>
  );
}
