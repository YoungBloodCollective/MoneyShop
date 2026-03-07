import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { applicationsApi } from '@/services/api/applicationsApi';

const LOAN_TYPES = [
  { value: 'NP', label: 'Credit de nevoi personale' },
  { value: 'IPOTECAR', label: 'Credit ipotecar' },
  { value: 'REFINANTARE', label: 'Refinantare' },
];

const steps = ['Tip credit', 'Detalii', 'Confirmare'];

export default function ApplicationWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    loanType: '',
    amount: '',
    term: '',
    purpose: '',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const next = () => {
    if (step === 0 && !form.loanType) { toast.error('Selecteaza tipul de credit'); return; }
    if (step === 1 && (!form.amount || !form.term)) { toast.error('Completeaza toate campurile'); return; }
    setStep(s => s + 1);
  };

  const submit = async () => {
    setLoading(true);
    try {
      await applicationsApi.createApplication({
        loanType: form.loanType,
        requestedAmount: parseFloat(form.amount),
        requestedTermMonths: parseInt(form.term),
        purpose: form.purpose || undefined,
      });
      toast.success('Aplicatie depusa cu succes!');
      navigate('/dashboard/success');
    } catch {
      toast.error('Eroare la depunerea aplicatiei');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < step ? 'bg-success-500 text-white' :
              i === step ? 'bg-brand-primary text-white' :
              'bg-dark-600 text-light-50'
            }`}>
              {i < step ? <Check size={16} /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? 'text-light-100 font-medium' : 'text-light-50'}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-dark-400" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 lg:p-8">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-light-100 mb-4">Ce tip de credit doresti?</h2>
            {LOAN_TYPES.map(lt => (
              <button
                key={lt.value}
                onClick={() => update('loanType', lt.value)}
                className={`w-full p-4 rounded-xl text-left border transition-colors ${
                  form.loanType === lt.value
                    ? 'border-brand-primary bg-brand-primary/10 text-light-100'
                    : 'border-dark-400 bg-dark-600 text-light-80 hover:border-dark-300'
                }`}
              >
                <p className="font-medium">{lt.label}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-light-100 mb-4">Detalii credit</h2>
            <div>
              <label className="block text-sm font-medium text-light-70 mb-1.5">Suma dorita (RON)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                placeholder="ex: 50000"
                className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-70 mb-1.5">Perioada (luni)</label>
              <input
                type="number"
                value={form.term}
                onChange={e => update('term', e.target.value)}
                placeholder="ex: 60"
                className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-70 mb-1.5">Scopul creditului (optional)</label>
              <input
                type="text"
                value={form.purpose}
                onChange={e => update('purpose', e.target.value)}
                placeholder="ex: Renovare casa"
                className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-light-100 mb-4">Confirma aplicatia</h2>
            <div className="space-y-3">
              {[
                { label: 'Tip credit', value: LOAN_TYPES.find(l => l.value === form.loanType)?.label },
                { label: 'Suma', value: `${parseFloat(form.amount).toLocaleString('ro-RO')} RON` },
                { label: 'Perioada', value: `${form.term} luni` },
                ...(form.purpose ? [{ label: 'Scop', value: form.purpose }] : []),
              ].map(item => (
                <div key={item.label} className="flex justify-between py-3 border-b border-dark-400 last:border-0">
                  <span className="text-sm text-light-60">{item.label}</span>
                  <span className="text-sm font-medium text-light-90">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm text-light-70 hover:text-light-90 border border-dark-400 hover:border-dark-300 transition-colors"
        >
          <ArrowLeft size={16} /> Inapoi
        </button>

        {step < 2 ? (
          <button
            onClick={next}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
          >
            Continua <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-success-500 text-white text-sm font-medium hover:bg-success-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Se trimite...' : 'Depune aplicatia'}
          </button>
        )}
      </div>
    </div>
  );
}
