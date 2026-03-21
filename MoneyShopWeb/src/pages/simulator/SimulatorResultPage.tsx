import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, TrendingUp, Phone, Info, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { EligibilityResponse } from '@/services/api/eligibilityApi';
import { ContactBrokerModal } from '@/components/shared/ContactBrokerModal';

const ratingConfig: Record<string, { label: string; subtitle: string; bgClass: string; textClass: string; barClass: string; Icon: typeof ShieldCheck }> = {
  GREEN: {
    label: 'Eligibilitate ridicata',
    subtitle: 'Ai sanse foarte bune de aprobare',
    bgClass: 'bg-success-500/15',
    textClass: 'text-success-500',
    barClass: 'bg-success-500',
    Icon: ShieldCheck,
  },
  YELLOW: {
    label: 'Eligibilitate moderata',
    subtitle: 'Ai sanse bune, dar depinde de banca',
    bgClass: 'bg-warning-500/15',
    textClass: 'text-warning-500',
    barClass: 'bg-warning-500',
    Icon: ShieldAlert,
  },
  RED: {
    label: 'Eligibilitate scazuta',
    subtitle: 'Recomandam sa imbunatatesti profilul financiar',
    bgClass: 'bg-error-500/15',
    textClass: 'text-error-500',
    barClass: 'bg-error-500',
    Icon: ShieldX,
  },
};

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-5 h-5 rounded-full bg-dark-500 text-light-50 hover:text-light-80 hover:bg-dark-400 flex items-center justify-center transition-colors"
        aria-label="Informatii"
      >
        <Info size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-20 w-72 p-3 rounded-xl bg-dark-600 border border-dark-400 shadow-lg">
          <p className="text-xs text-light-70 leading-relaxed">{text}</p>
        </div>
      )}
    </span>
  );
}

function DtiBar({ value }: { value: number }) {
  const pct = Math.min(Math.round(value * 100), 100);
  const color = pct < 30 ? 'bg-success-500' : pct <= 50 ? 'bg-warning-500' : 'bg-error-500';
  const textColor = pct < 30 ? 'text-success-500' : pct <= 50 ? 'text-warning-500' : 'text-error-500';
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${textColor}`}>{pct}%</span>
        <span className="text-xs text-light-50">max recomandat 40%</span>
      </div>
      <div className="relative h-2 rounded-full bg-dark-500 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 left-[40%] w-px bg-light-50/30" title="40% limita bancara" />
      </div>
    </div>
  );
}

export default function SimulatorResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = (location.state as { result?: EligibilityResponse })?.result;
  const [showContactModal, setShowContactModal] = useState(false);

  if (!result) {
    navigate('/simulator');
    return null;
  }

  const rating = ratingConfig[result.decision.rating] || ratingConfig.YELLOW;
  const RatingIcon = rating.Icon;

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
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
        <p className="text-sm text-light-60 mb-4 text-center">Rating eligibilitate</p>
        <div className={`flex items-center gap-4 rounded-xl p-4 ${rating.bgClass}`}>
          <div className={`w-12 h-12 rounded-full ${rating.bgClass} flex items-center justify-center flex-shrink-0`}>
            <RatingIcon size={28} className={rating.textClass} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xl font-bold ${rating.textClass}`}>{rating.label}</p>
            <p className="text-sm text-light-60 mt-0.5">{rating.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <div className={`h-1.5 flex-1 rounded-full ${result.decision.rating === 'RED' || result.decision.rating === 'YELLOW' || result.decision.rating === 'GREEN' ? rating.barClass : 'bg-dark-500'} ${result.decision.rating === 'RED' ? 'opacity-100' : 'opacity-30'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${result.decision.rating === 'YELLOW' || result.decision.rating === 'GREEN' ? rating.barClass : 'bg-dark-500'} ${result.decision.rating === 'YELLOW' ? 'opacity-100' : result.decision.rating === 'GREEN' ? 'opacity-30' : 'opacity-30'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${result.decision.rating === 'GREEN' ? rating.barClass : 'bg-dark-500'}`} />
        </div>
        <p className="text-xs text-light-50 mt-3 text-center">Incredere: {result.decision.confidence}</p>
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
        <div className="py-3">
          <div className="flex items-center gap-1">
            <span className="text-sm text-light-60">Grad de indatorare (DTI)</span>
            <InfoTooltip text="Gradul de indatorare (DTI) reprezinta procentul din venitul tau lunar folosit pentru plata ratelor. Bancile accepta de obicei pana la 40%." />
          </div>
          <DtiBar value={result.dti.dtiUsed} />
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
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/apply')}
            className="flex-1 h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25"
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
        <button
          onClick={() => setShowContactModal(true)}
          className="w-full h-12 rounded-full bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition-all hover:shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2"
        >
          <Phone size={16} /> Contacteaza un broker
        </button>
      </div>

      {/* Contact broker modal */}
      <ContactBrokerModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        simulationDetails={
          result
            ? `Rating: ${rating.label}\n` +
              `Suma maxima: ${result.offers.maxLoanAmountRange ? `${formatCurrency(result.offers.maxLoanAmountRange.worstCase)} - ${formatCurrency(result.offers.maxLoanAmountRange.bestCase)}` : 'N/A'}\n` +
              `Rata estimata: ${result.offers.estimatedMonthlyPayment ? formatCurrency(result.offers.estimatedMonthlyPayment) : 'N/A'}\n` +
              `DTI: ${(result.dti.dtiUsed * 100).toFixed(0)}%`
            : undefined
        }
      />
    </div>
  );
}
