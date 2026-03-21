import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Info, TrendingDown, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { eligibilityApi, type CalcSimpleRequest } from '@/services/api/eligibilityApi';
import { userFinancialDataApi } from '@/services/api/userFinancialDataApi';

export default function SimulatorFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loanType = (location.state as { loanType?: string })?.loanType || 'NP';
  const isRefinance = loanType === 'REFINANTARE';

  const [form, setForm] = useState({
    salaryNet: '',
    mealTickets: '',
    termMonths: loanType === 'IPOTECAR' ? '360' : '60',
    desiredAmount: '',
    propertyValue: '',
    // Refinancing-specific fields
    currentRate: '',
    currentBalance: '',
    currentMonthsLeft: '',
  });
  const [loading, setLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Auto-fill from user's stored financial data
  useEffect(() => {
    userFinancialDataApi.getMyData()
      .then((data) => {
        if (!data.isEmpty && data.salariuNet) {
          setForm(prev => ({
            ...prev,
            salaryNet: data.salariuNet?.toString() || prev.salaryNet,
            mealTickets: data.bonuriMasa && data.sumaBonuriMasa ? data.sumaBonuriMasa.toString() : prev.mealTickets,
          }));
          setPrefilled(true);
        }
      })
      .catch(() => {});
  }, []);

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // Real-time refinancing comparison
  const refiComparison = useMemo(() => {
    if (!isRefinance) return null;
    const currentRate = parseFloat(form.currentRate) || 0;
    const currentBalance = parseFloat(form.currentBalance) || 0;
    const currentMonthsLeft = parseInt(form.currentMonthsLeft) || 0;
    const newTerm = parseInt(form.termMonths) || 60;

    if (currentRate <= 0 || currentBalance <= 0) return null;

    // Estimate new rate (refinancing typically gets 1-3% lower APR)
    const estimatedNewApr = 0.085; // 8.5% est
    const monthlyRate = estimatedNewApr / 12;
    const newPayment = currentBalance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -newTerm));
    const savings = currentRate - newPayment;
    const totalOldCost = currentRate * currentMonthsLeft;
    const totalNewCost = newPayment * newTerm;

    return {
      currentRate,
      newRate: Math.round(newPayment),
      savings: Math.round(savings),
      totalSavings: Math.round(totalOldCost - totalNewCost),
      percentSaved: currentRate > 0 ? Math.round((savings / currentRate) * 100) : 0,
    };
  }, [isRefinance, form.currentRate, form.currentBalance, form.currentMonthsLeft, form.termMonths]);

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
        desiredAmount: form.desiredAmount ? parseFloat(form.desiredAmount) : (form.currentBalance ? parseFloat(form.currentBalance) : undefined),
        propertyValue: form.propertyValue ? parseFloat(form.propertyValue) : undefined,
      };
      const result = await eligibilityApi.calculateSimple(request);
      navigate('/simulator/result', { state: { result, refiComparison } });
    } catch {
      toast.error('Eroare la calculare');
    } finally {
      setLoading(false);
    }
  };

  const loanLabel = loanType === 'NP' ? 'Nevoi personale' :
    loanType === 'IPOTECAR' ? 'Ipotecar' : 'Refinantare';

  const fmt = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });

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
        {prefilled && (
          <div className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl px-4 py-2.5">
            <Info size={16} className="text-brand-primary flex-shrink-0" />
            <p className="text-xs text-brand-primary">Date pre-completate din profilul tau financiar. Poti modifica orice camp.</p>
          </div>
        )}

        {/* Refinancing: current credit details */}
        {isRefinance && (
          <div className="bg-dark-600 rounded-xl p-4 space-y-4 border border-dark-400/50">
            <p className="text-xs text-light-40 uppercase tracking-wider font-medium">Creditul actual</p>
            <div>
              <label className="block text-sm font-medium text-light-70 mb-1.5">Rata lunara curenta (RON) *</label>
              <input
                type="number"
                value={form.currentRate}
                onChange={e => update('currentRate', e.target.value)}
                placeholder="ex: 1500"
                className="w-full h-12 px-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-light-70 mb-1.5">Sold ramas (RON)</label>
                <input
                  type="number"
                  value={form.currentBalance}
                  onChange={e => update('currentBalance', e.target.value)}
                  placeholder="ex: 50000"
                  className="w-full h-12 px-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-light-70 mb-1.5">Luni ramase</label>
                <input
                  type="number"
                  value={form.currentMonthsLeft}
                  onChange={e => update('currentMonthsLeft', e.target.value)}
                  placeholder="ex: 36"
                  className="w-full h-12 px-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Real-time refinancing comparison */}
        {refiComparison && refiComparison.savings > 0 && (
          <div className="bg-success-500/10 border border-success-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={16} className="text-success-400" />
              <p className="text-sm font-medium text-success-400">Estimare economie prin refinantare</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-light-50 mb-1">Rata actuala</p>
                <p className="text-lg font-bold text-light-90">{fmt(refiComparison.currentRate)}</p>
                <p className="text-[10px] text-light-50">RON/luna</p>
              </div>
              <div className="text-center flex flex-col items-center justify-center">
                <ArrowDown size={20} className="text-success-400 mb-1" />
                <p className="text-xs font-bold text-success-400">-{refiComparison.percentSaved}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-light-50 mb-1">Rata noua est.</p>
                <p className="text-lg font-bold text-success-400">{fmt(refiComparison.newRate)}</p>
                <p className="text-[10px] text-light-50">RON/luna</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-success-500/20 flex justify-between text-xs">
              <span className="text-light-50">Economie lunara</span>
              <span className="font-bold text-success-400">-{fmt(refiComparison.savings)} RON</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-light-70 mb-0.5">Salariu net lunar (RON) *</label>
          <span className="block text-xs text-light-50 mb-1.5">(suma primita in mana)</span>
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
          <label className="block text-sm font-medium text-light-70 mb-1.5">{isRefinance ? 'Perioada noua dorita (luni)' : 'Perioada (luni)'}</label>
          <input
            type="number"
            value={form.termMonths}
            onChange={e => update('termMonths', e.target.value)}
            placeholder="ex: 60"
            className="w-full h-12 px-4 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
          />
        </div>

        {!isRefinance && (
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
        )}

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
          className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Se calculeaza...' : 'Calculeaza eligibilitatea'}
        </button>
      </form>
    </div>
  );
}
