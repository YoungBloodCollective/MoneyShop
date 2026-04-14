import { useEffect, useState } from 'react';
import {
  Search, ArrowLeft, Save, Phone, Mail, MapPin,
  Banknote, Calendar, User, FileText, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type LeadItem } from '@/services/api/adminApi';

const SOURCE_LABELS: Record<string, string> = {
  api: 'Formular',
  chat_state_machine: 'Chat',
  landing: 'Landing',
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LeadItem | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    const data = await adminApi.getLeads();
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, []);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.numePrenume.toLowerCase().includes(s) ||
      l.telefon.includes(s) ||
      l.email.toLowerCase().includes(s) ||
      l.oras.toLowerCase().includes(s)
    );
  });

  const selectLead = (lead: LeadItem) => {
    setSelected(lead);
    setNotes(lead.adminNotes || '');
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await adminApi.updateLeadNotes(selected.id, notes);
      toast.success('Notite salvate');
      setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, adminNotes: notes } : l));
      setSelected(prev => prev ? { ...prev, adminNotes: notes } : null);
    } catch {
      toast.error('Eroare la salvarea notitelor');
    } finally {
      setSavingNotes(false);
    }
  };

  const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

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
          <h1 className="text-2xl font-bold text-light-100">{selected.numePrenume}</h1>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
            {SOURCE_LABELS[selected.source] || selected.source}
          </span>
        </div>
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4">Informatii contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { icon: User, label: 'Nume', value: selected.numePrenume },
              { icon: Phone, label: 'Telefon', value: selected.telefon },
              { icon: Mail, label: 'Email', value: selected.email },
              { icon: MapPin, label: 'Oras', value: selected.oras },
              { icon: Banknote, label: 'Venit net lunar', value: `${fmt(selected.venitNetLunar)} RON` },
              { icon: Banknote, label: 'Bonuri masa', value: selected.bonuriMasaAprox ? `${fmt(selected.bonuriMasaAprox)} RON` : '-' },
              { icon: FileText, label: 'Credite active', value: selected.crediteActive ? 'Da' : 'Nu' },
              { icon: Banknote, label: 'Sold total aprox', value: selected.soldTotalAprox ? `${fmt(selected.soldTotalAprox)} RON` : '-' },
              { icon: FileText, label: 'Tip creditor', value: selected.tipCreditor || '-' },
              { icon: FileText, label: 'Intarzieri', value: selected.intarzieri ? `Da (${selected.intarzieriZileMax ?? '?'} zile)` : 'Nu' },
              { icon: FileText, label: 'Poprire/Executor', value: selected.poprireSauExecutorUltimii5Ani ? (selected.situatiePoprireInchisa ? 'Da (inchisa)' : 'Da (activa)') : 'Nu' },
              { icon: Calendar, label: 'Data inregistrare', value: new Date(selected.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
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
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare size={16} /> Notite admin
          </h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={1000}
            rows={6}
            placeholder="Scrie notite despre client dupa apelul telefonic..."
            className="w-full px-4 py-3 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-light-50">{notes.length}/1000 caractere</span>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-success-500 text-white text-sm font-medium hover:bg-success-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} /> {savingNotes ? 'Se salveaza...' : 'Salveaza notite'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-100">Gestionare lead-uri</h1>
        {!loading && <span className="text-sm text-light-60">{filtered.length} lead-uri</span>}
      </div>
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta dupa nume, telefon, email, oras..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <User size={48} className="mx-auto text-light-50 mb-4" />
          <p className="text-light-60">{search ? 'Niciun rezultat gasit' : 'Nu exista lead-uri'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => (
            <button
              key={lead.id}
              onClick={() => selectLead(lead)}
              className="w-full flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 text-left hover:border-brand-primary/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-light-90">{lead.numePrenume}</p>
                  <span className="text-xs text-light-50">·</span>
                  <p className="text-sm text-light-70">{lead.oras}</p>
                  {lead.adminNotes && (
                    <>
                      <span className="text-xs text-light-50">·</span>
                      <MessageSquare size={12} className="text-brand-primary" />
                    </>
                  )}
                </div>
                <p className="text-xs text-light-60 mt-0.5">
                  {lead.telefon} · {lead.email} · {fmt(lead.venitNetLunar)} RON/luna
                  · {new Date(lead.createdAt).toLocaleDateString('ro-RO')}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/15 text-brand-primary border border-brand-primary/30 shrink-0 ml-3">
                {SOURCE_LABELS[lead.source] || lead.source}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
