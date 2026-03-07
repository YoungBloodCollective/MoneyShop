import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { eligibilityApi, type CalcSimpleRequest } from '@/services/api/eligibilityApi';

export default function SimulatorFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loanType = (location.state as { loanType?: string })?.loanType || 'NP';

  const [form, setForm] = useState({
    salaryNet: '',
    mealTickets: '',
    termMonths: loanType === 'IPOTECAR' ? '360' : '60',
    desiredAmount: '',
    propertyValue: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.salaryNet) { toast.error('Introdu salariul net'); return; }

    setLoading(true);
    try {
      const request: CalcSimpleRequest = {
        loanType: loanType as CalcSimpleRequest['loanType'],
        salaryNetUser: parseFloat(form.salaryNet),
        mealTicketsUser: form.mealTickets ? parseFloat(form.mealTickets) : undefined,
        termMonths: parseInt(form.termMonths),
        desiredAmount: form.desiredAmount ? parseFloat(form.desiredAmount) : undefined,
        propertyValue: form.propertyValue ? parseFloat(form.propertyValue) : undefined,
      };
      const result = await eligibilityApi.calculateSimple(request);
      navigate('/simulator/result', { state: { result } });
    } catch {
      toast.error('Eroare la calculare');
    } finally {
      setLoading(false);
    }
  };

  const loanLabel = loanType === 'NP' ? 'Nevoi personale' :
    loanType === 'IPOTECAR' ? 'Ipotecar' : 'Refinantare';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/simulator')}
        className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80"
      >
        <ArrowLeft size={16} /> Inapoi
      </button>

      <h1 className="text-2xl font-bold text-light-100">Simulator: {loanLabel}</h1>

      <form onSubmit={handleSubmit} className="bg-dark-700 border border-dark-400 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Salariu net lunar (RON) *</label>
          <input
            type="number"
            value={form.salaryNet}
            onChange={e => update('salaryNet', e.target.value)}
            placeholder="ex: 4500"
            className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Tichete de masa (RON/luna)</label>
          <input
            type="number"
            value={form.mealTickets}
            onChange={e => update('mealTickets', e.target.value)}
            placeholder="ex: 800"
            className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Perioada (luni)</label>
          <input
            type="number"
            value={form.termMonths}
            onChange={e => update('termMonths', e.target.value)}
            placeholder="ex: 60"
            className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-70 mb-1.5">Suma dorita (RON)</label>
          <input
            type="number"
            value={form.desiredAmount}
            onChange={e => update('desiredAmount', e.target.value)}
            placeholder="Optional"
            className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
          />
        </div>

        {loanType === 'IPOTECAR' && (
          <div>
            <label className="block text-sm font-medium text-light-70 mb-1.5">Valoare imobil (RON)</label>
            <input
              type="number"
              value={form.propertyValue}
              onChange={e => update('propertyValue', e.target.value)}
              placeholder="ex: 250000"
              className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Se calculeaza...' : 'Calculeaza eligibilitatea'}
        </button>
      </form>
    </div>
  );
}
