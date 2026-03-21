import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { contactApi, type ContactBrokerRequest } from '@/services/api/contactApi';

interface ContactBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationDetails?: string;
}

export function ContactBrokerModal({ isOpen, onClose, simulationDetails }: ContactBrokerModalProps) {
  const [form, setForm] = useState({
    name: '',
    gender: 'M' as 'M' | 'F',
    salary: '',
    dateOfBirth: '',
    email: '',
    phone: '',
  });
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone || !form.salary || !form.dateOfBirth) {
      toast.error('Te rugam sa completezi toate campurile obligatorii');
      return;
    }

    setSending(true);
    try {
      const data: ContactBrokerRequest = {
        name: form.name,
        gender: form.gender,
        salary: parseFloat(form.salary) || 0,
        dateOfBirth: form.dateOfBirth,
        email: form.email,
        phone: form.phone,
        simulationDetails,
      };
      await contactApi.contactBroker(data);
      toast.success('Cererea ta a fost trimisa! Un broker te va contacta in curand.');
      onClose();
    } catch {
      toast.error('Eroare la trimiterea cererii. Incearca din nou.');
    } finally {
      setSending(false);
    }
  };

  const inputClass = 'w-full h-12 px-4 rounded-xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors text-sm';
  const labelClass = 'block text-xs font-medium text-light-60 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-700 border border-dark-400 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-700 border-b border-dark-400 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-light-100">Contacteaza un broker</h2>
            <p className="text-xs text-light-50">Completati datele si veti fi contactat in cel mai scurt timp</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-light-50 hover:bg-dark-600 hover:text-light-80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Nume complet *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Introdu numele tau complet"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Gen *</label>
            <select
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value as 'M' | 'F' })}
              className={inputClass}
            >
              <option value="M">Masculin</option>
              <option value="F">Feminin</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Salariu net (RON) *</label>
            <input
              type="number"
              value={form.salary}
              onChange={e => setForm({ ...form, salary: e.target.value })}
              placeholder="ex: 5000"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Data nasterii *</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplu.ro"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Telefon *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="07XX XXX XXX"
              className={inputClass}
            />
          </div>

          {/* Simulation details (read-only) */}
          {simulationDetails && (
            <div>
              <label className={labelClass}>Detalii simulare</label>
              <div className="w-full px-4 py-3 rounded-xl bg-dark-800/50 border border-dark-600 text-xs text-light-60 whitespace-pre-line">
                {simulationDetails}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <><Loader2 size={18} className="animate-spin" /> Se trimite...</>
            ) : (
              <><Send size={16} /> Trimite cererea</>
            )}
          </button>

          <p className="text-[10px] text-light-50 text-center">
            Prin trimiterea formularului, accepti sa fii contactat de un broker autorizat MoneyShop.
          </p>
        </form>
      </div>
    </div>
  );
}
