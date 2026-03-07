import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import type { EligibilityResponse } from '@/services/api/eligibilityApi';

export default function SimulatorResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = (location.state as { result?: EligibilityResponse })?.result;

  if (!result) {
    navigate('/simulator');
    return null;
  }

  const ratingColors: Record<string, string> = {
    GREEN: 'text-success-500',
    YELLOW: 'text-warning-500',
    RED: 'text-error-500',
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/simulator')}
        className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80"
      >
        <ArrowLeft size={16} /> Inapoi la simulator
      </button>

      <h1 className="text-2xl font-bold text-light-100">Rezultat simulare</h1>

      {/* Rating */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 text-center">
        <p className="text-sm text-light-60 mb-2">Rating eligibilitate</p>
        <p className={`text-4xl font-bold ${ratingColors[result.decision.rating] || 'text-light-100'}`}>
          {result.decision.rating}
        </p>
        <p className="text-sm text-light-60 mt-1">Incredere: {result.decision.confidence}</p>
      </div>

      {/* Offers */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-light-100 flex items-center gap-2">
          <TrendingUp size={20} className="text-brand-primary" /> Oferta estimata
        </h2>
        {result.offers.maxLoanAmountRange && (
          <div className="flex justify-between py-3 border-b border-dark-400">
            <span className="text-sm text-light-60">Suma maxima</span>
            <span className="text-sm font-medium text-light-90">
              {formatCurrency(result.offers.maxLoanAmountRange.worstCase)} - {formatCurrency(result.offers.maxLoanAmountRange.bestCase)}
            </span>
          </div>
        )}
        {result.offers.estimatedMonthlyPayment && (
          <div className="flex justify-between py-3 border-b border-dark-400">
            <span className="text-sm text-light-60">Rata lunara estimata</span>
            <span className="text-sm font-medium text-light-90">{formatCurrency(result.offers.estimatedMonthlyPayment)}</span>
          </div>
        )}
        <div className="flex justify-between py-3 border-b border-dark-400">
          <span className="text-sm text-light-60">Plata maxima lunara</span>
          <span className="text-sm font-medium text-light-90">{formatCurrency(result.offers.affordability.paymentMax)}</span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-sm text-light-60">DTI folosit</span>
          <span className="text-sm font-medium text-light-90">{(result.dti.dtiUsed * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Reasons */}
      {result.decision.reasons.length > 0 && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-light-100 flex items-center gap-2">
            <CheckCircle size={20} className="text-success-500" /> Factori pozitivi
          </h2>
          {result.decision.reasons.map(r => (
            <div key={r.code} className="py-2">
              <p className="text-sm font-medium text-light-90">{r.title}</p>
              {r.details && <p className="text-xs text-light-60 mt-0.5">{r.details}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Risk flags */}
      {result.decision.riskFlags.length > 0 && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-light-100 flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning-500" /> Riscuri identificate
          </h2>
          {result.decision.riskFlags.map(f => (
            <div key={f.code} className="py-2">
              <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                f.severity === 'HIGH' ? 'bg-error-500/15 text-error-400' : 'bg-warning-500/15 text-warning-400'
              }`}>{f.severity}</span>
              <span className="text-sm text-light-90">{f.details || f.code}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/apply')}
          className="flex-1 h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors"
        >
          Aplica acum
        </button>
        <button
          onClick={() => navigate('/simulator/form')}
          className="flex-1 h-12 rounded-full border border-dark-400 text-light-80 font-medium hover:border-dark-300 transition-colors"
        >
          Recalculeaza
        </button>
      </div>
    </div>
  );
}
