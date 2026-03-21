import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CreditCard, Home, CheckCircle, AlertTriangle, XCircle,
  ShieldCheck, ShieldAlert, ShieldX, TrendingUp, Phone, Calculator, Loader2,
  Info, Building2, FileText, Wallet, ChevronRight, Sparkles,
} from 'lucide-react';
import { bcReportApi, type BcReportSummaryDto } from '@/services/api/bcReportApi';
import { userFinancialDataApi, type UserFinancialData, type SaveFinancialDataRequest } from '@/services/api/userFinancialDataApi';
import { calculateAdvanced, type AdvancedCalcInput, type AdvancedCalcResult } from '@/lib/eligibility/engine';
import { ContactBrokerModal } from '@/components/shared/ContactBrokerModal';

type LoanType = 'NP' | 'IPOTECAR';

const ratingConfig = {
  GREEN: { label: 'Eligibilitate ridicata', subtitle: 'Ai sanse foarte bune de aprobare', bgClass: 'bg-success-500/15', textClass: 'text-success-500', barClass: 'bg-success-500', Icon: ShieldCheck },
  YELLOW: { label: 'Eligibilitate moderata', subtitle: 'Ai sanse bune, dar depinde de banca', bgClass: 'bg-warning-500/15', textClass: 'text-warning-500', barClass: 'bg-warning-500', Icon: ShieldAlert },
  RED: { label: 'Eligibilitate scazuta', subtitle: 'Recomandam sa imbunatatesti profilul financiar', bgClass: 'bg-error-500/15', textClass: 'text-error-500', barClass: 'bg-error-500', Icon: ShieldX },
};

const fmt = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });
const fmtCurrency = (v: number) => `${fmt(v)} RON`;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
            i < current ? 'bg-brand-primary text-white' : i === current ? 'bg-brand-primary/20 text-brand-primary border-2 border-brand-primary' : 'bg-dark-500 text-light-50'
          }`}>
            {i < current ? <CheckCircle size={16} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`w-8 h-0.5 ${i < current ? 'bg-brand-primary' : 'bg-dark-500'}`} />}
        </div>
      ))}
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-5 h-5 rounded-full bg-dark-500 text-light-50 hover:text-light-80 hover:bg-dark-400 flex items-center justify-center transition-colors">
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

function DtiBar({ value, cap }: { value: number; cap: number }) {
  const pct = Math.min(Math.round(value * 100), 100);
  const capPct = Math.round(cap * 100);
  const color = pct < 30 ? 'bg-success-500' : pct <= 50 ? 'bg-warning-500' : 'bg-error-500';
  const textColor = pct < 30 ? 'text-success-500' : pct <= 50 ? 'text-warning-500' : 'text-error-500';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${textColor}`}>{pct}%</span>
        <span className="text-xs text-light-50">limita aplicata {capPct}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-dark-500 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 w-px bg-light-50/30" style={{ left: `${capPct}%` }} />
      </div>
    </div>
  );
}

export default function AdvancedCalculatorPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loanType, setLoanType] = useState<LoanType | null>(null);

  const [loading, setLoading] = useState(false);
  const [finData, setFinData] = useState<UserFinancialData | null>(null);
  const [bcData, setBcData] = useState<BcReportSummaryDto | null>(null);
  const [hasBc, setHasBc] = useState<boolean | null>(null);
  const [hasSalaries, setHasSalaries] = useState(false);

  const [sal1, setSal1] = useState('');
  const [sal2, setSal2] = useState('');
  const [sal3, setSal3] = useState('');
  const [mealTickets, setMealTickets] = useState('');
  const [savingSalaries, setSavingSalaries] = useState(false);

  const [termMonths, setTermMonths] = useState(60);
  const [desiredAmount, setDesiredAmount] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [isFirstHome, setIsFirstHome] = useState(true);
  const [incomeSource, setIncomeSource] = useState<'RO' | 'STRAINATATE'>('RO');

  const [result, setResult] = useState<AdvancedCalcResult | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const [fin, bc] = await Promise.all([
        userFinancialDataApi.getMyData().catch(() => null),
        bcReportApi.getLatest().catch(() => null),
      ]);
      const finOk = fin && !fin.isEmpty ? fin : null;
      setFinData(finOk);
      if (finOk?.salariu1 && finOk?.salariu2 && finOk?.salariu3) {
        setHasSalaries(true);
        setSal1(String(finOk.salariu1));
        setSal2(String(finOk.salariu2));
        setSal3(String(finOk.salariu3));
        setMealTickets(finOk.sumaBonuriMasa ? String(finOk.sumaBonuriMasa) : '');
      }
      if (bc && !('isEmpty' in bc)) {
        setBcData(bc as BcReportSummaryDto);
        setHasBc(true);
      } else {
        setHasBc(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 1) loadUserData();
  }, [step, loadUserData]);

  const avgSalary = useMemo(() => {
    const s1 = parseFloat(sal1) || 0;
    const s2 = parseFloat(sal2) || 0;
    const s3 = parseFloat(sal3) || 0;
    if (s1 > 0 && s2 > 0 && s3 > 0) return Math.round((s1 + s2 + s3) / 3);
    return 0;
  }, [sal1, sal2, sal3]);

  const canContinueStep2 = hasBc && avgSalary > 0;

  const saveSalaries = async () => {
    setSavingSalaries(true);
    try {
      const req: SaveFinancialDataRequest = {
        salariu1: parseFloat(sal1) || 0,
        salariu2: parseFloat(sal2) || 0,
        salariu3: parseFloat(sal3) || 0,
        bonuriMasa: parseFloat(mealTickets) > 0,
        sumaBonuriMasa: parseFloat(mealTickets) || 0,
        credits: finData?.credits ?? [],
      };
      await userFinancialDataApi.saveMyData(req);
      setHasSalaries(true);
    } finally {
      setSavingSalaries(false);
    }
  };

  const runCalculation = useCallback(() => {
    if (!bcData || !loanType) return;
    const input: AdvancedCalcInput = {
      loanType,
      avgSalary,
      mealTickets: parseFloat(mealTickets) || 0,
      ficoScore: bcData.ficoScore ?? undefined,
      existingObligations: bcData.existingMonthlyObligations ?? 0,
      dpd30Count: bcData.dpd30Count ?? 0,
      dpd60Count: bcData.dpd60Count ?? 0,
      dpd90PlusCount: bcData.dpd90PlusCount ?? 0,
      nonbankClosedLast4Y: bcData.nonbankClosedLast4Years ?? 0,
      nonbankActiveNow: bcData.nonbankActiveNow ?? 0,
      termMonths,
      desiredAmount: parseFloat(desiredAmount) || undefined,
      propertyValue: loanType === 'IPOTECAR' ? (parseFloat(propertyValue) || undefined) : undefined,
      isFirstHome: loanType === 'IPOTECAR' ? isFirstHome : undefined,
      incomeSource: loanType === 'IPOTECAR' ? incomeSource : undefined,
    };
    setResult(calculateAdvanced(input));
  }, [bcData, loanType, avgSalary, mealTickets, termMonths, desiredAmount, propertyValue, isFirstHome, incomeSource]);

  const goToResults = () => {
    runCalculation();
    setStep(3);
  };

  const liveMaxAmount = useMemo(() => {
    if (!bcData || !loanType) return null;
    const input: AdvancedCalcInput = {
      loanType,
      avgSalary,
      mealTickets: parseFloat(mealTickets) || 0,
      ficoScore: bcData.ficoScore ?? undefined,
      existingObligations: bcData.existingMonthlyObligations ?? 0,
      dpd30Count: bcData.dpd30Count ?? 0,
      dpd60Count: bcData.dpd60Count ?? 0,
      dpd90PlusCount: bcData.dpd90PlusCount ?? 0,
      nonbankClosedLast4Y: bcData.nonbankClosedLast4Years ?? 0,
      nonbankActiveNow: bcData.nonbankActiveNow ?? 0,
      termMonths,
      desiredAmount: parseFloat(desiredAmount) || undefined,
      propertyValue: loanType === 'IPOTECAR' ? (parseFloat(propertyValue) || undefined) : undefined,
      isFirstHome: loanType === 'IPOTECAR' ? isFirstHome : undefined,
      incomeSource: loanType === 'IPOTECAR' ? incomeSource : undefined,
    };
    try { return calculateAdvanced(input); } catch { return null; }
  }, [bcData, loanType, avgSalary, mealTickets, termMonths, desiredAmount, propertyValue, isFirstHome, incomeSource]);

  const ratingInfo = result ? ratingConfig[result.rating] : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => step === 0 ? navigate('/simulator') : setStep(s => s - 1)} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> {step === 0 ? 'Inapoi la simulator' : 'Inapoi'}
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-light-100">Calculator avansat</h1>
          <p className="text-sm text-light-60 mt-0.5">Analiza personalizata bazata pe datele tale reale</p>
        </div>
        <StepIndicator current={step} total={4} />
      </div>

      {/* Step 0: Choose loan type */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-light-70">Ce tip de credit te intereseaza?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setLoanType('NP'); setTermMonths(60); setStep(1); }}
              className="group bg-dark-700 border border-dark-400 rounded-2xl p-6 text-left hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-primary/5 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-primary/15 flex items-center justify-center text-brand-primary mb-4 group-hover:bg-brand-primary/25 transition-colors">
                <CreditCard size={24} />
              </div>
              <h3 className="text-lg font-semibold text-light-100 mb-1">Credit nevoi personale</h3>
              <p className="text-sm text-light-60">Pana la 60 luni, evaluare FICO completa</p>
            </button>
            <button
              onClick={() => { setLoanType('IPOTECAR'); setTermMonths(360); setStep(1); }}
              className="group bg-dark-700 border border-dark-400 rounded-2xl p-6 text-left hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-primary/5 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-500 mb-4 group-hover:bg-cyan-500/25 transition-colors">
                <Home size={24} />
              </div>
              <h3 className="text-lg font-semibold text-light-100 mb-1">Credit ipotecar</h3>
              <p className="text-sm text-light-60">Pana la 30 ani, analiza avans si stress test</p>
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Data check */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center">
                <Wallet size={20} className="text-brand-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-light-100">Venituri (ultimele 3 salarii nete)</h2>
                {hasSalaries && <p className="text-xs text-success-500">Date incarcate</p>}
              </div>
              {hasSalaries && <CheckCircle size={20} className="text-success-500" />}
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-dark-500 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-light-50 mb-1 block">Salariu 1</label>
                    <input type="number" value={sal1} onChange={e => { setSal1(e.target.value); setHasSalaries(false); }} placeholder="0" className="w-full h-10 bg-dark-800 border border-dark-400 rounded-xl px-3 text-sm text-light-100 placeholder:text-light-50 focus:outline-none focus:border-brand-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-light-50 mb-1 block">Salariu 2</label>
                    <input type="number" value={sal2} onChange={e => { setSal2(e.target.value); setHasSalaries(false); }} placeholder="0" className="w-full h-10 bg-dark-800 border border-dark-400 rounded-xl px-3 text-sm text-light-100 placeholder:text-light-50 focus:outline-none focus:border-brand-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-light-50 mb-1 block">Salariu 3</label>
                    <input type="number" value={sal3} onChange={e => { setSal3(e.target.value); setHasSalaries(false); }} placeholder="0" className="w-full h-10 bg-dark-800 border border-dark-400 rounded-xl px-3 text-sm text-light-100 placeholder:text-light-50 focus:outline-none focus:border-brand-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-light-50 mb-1 block">Bonuri de masa (lunar, optional)</label>
                  <input type="number" value={mealTickets} onChange={e => setMealTickets(e.target.value)} placeholder="0" className="w-full h-10 bg-dark-800 border border-dark-400 rounded-xl px-3 text-sm text-light-100 placeholder:text-light-50 focus:outline-none focus:border-brand-primary/50" />
                </div>
                {avgSalary > 0 && (
                  <div className="flex items-center justify-between bg-brand-primary/5 border border-brand-primary/10 rounded-xl px-4 py-2.5">
                    <span className="text-sm text-light-70">Salariu mediu net</span>
                    <span className="text-sm font-semibold text-brand-primary">{fmtCurrency(avgSalary)}</span>
                  </div>
                )}
                {!hasSalaries && avgSalary > 0 && (
                  <button onClick={saveSalaries} disabled={savingSalaries} className="w-full h-10 rounded-xl bg-dark-600 border border-dark-400 text-sm font-medium text-light-80 hover:bg-dark-500 transition-colors flex items-center justify-center gap-2">
                    {savingSalaries ? <Loader2 size={16} className="animate-spin" /> : null}
                    Salveaza salariile
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <FileText size={20} className="text-cyan-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-light-100">Raport Biroul de Credit</h2>
                {hasBc && <p className="text-xs text-success-500">Raport incarcat</p>}
                {hasBc === false && <p className="text-xs text-error-400">Lipseste — obligatoriu</p>}
              </div>
              {hasBc ? <CheckCircle size={20} className="text-success-500" /> : hasBc === false ? <XCircle size={20} className="text-error-400" /> : null}
            </div>
            {loading ? (
              <div className="h-16 bg-dark-500 rounded-xl animate-pulse mt-3" />
            ) : hasBc && bcData ? (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-800 rounded-xl p-3">
                    <p className="text-xs text-light-50">Scor FICO</p>
                    <p className="text-lg font-bold text-light-100">{bcData.ficoScore ?? 'N/A'}</p>
                  </div>
                  <div className="bg-dark-800 rounded-xl p-3">
                    <p className="text-xs text-light-50">Obligatii lunare</p>
                    <p className="text-lg font-bold text-light-100">{fmtCurrency(bcData.existingMonthlyObligations ?? 0)}</p>
                  </div>
                </div>
                {((bcData.dpd30Count ?? 0) > 0 || (bcData.dpd60Count ?? 0) > 0 || (bcData.dpd90PlusCount ?? 0) > 0) && (
                  <div className="flex gap-2 flex-wrap">
                    {(bcData.dpd30Count ?? 0) > 0 && <span className="text-xs px-2 py-1 rounded-full bg-warning-500/15 text-warning-400">{bcData.dpd30Count} intarzieri 30+ zile</span>}
                    {(bcData.dpd60Count ?? 0) > 0 && <span className="text-xs px-2 py-1 rounded-full bg-error-500/15 text-error-400">{bcData.dpd60Count} intarzieri 60+ zile</span>}
                    {(bcData.dpd90PlusCount ?? 0) > 0 && <span className="text-xs px-2 py-1 rounded-full bg-error-500/15 text-error-400">{bcData.dpd90PlusCount} intarzieri 90+ zile</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-light-60 mb-3">Incarca raportul BC pentru a continua analiza.</p>
                <button onClick={() => navigate('/profile/bc-report')} className="w-full h-10 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2">
                  <FileText size={16} /> Incarca Raport BC
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canContinueStep2}
            className={`w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              canContinueStep2
                ? 'bg-brand-primary text-white hover:bg-brand-primary/90 hover:shadow-lg hover:shadow-brand-primary/25'
                : 'bg-dark-500 text-light-50 cursor-not-allowed'
            }`}
          >
            Continua <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Loan details */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-light-100">Detalii credit {loanType === 'NP' ? 'nevoi personale' : 'ipotecar'}</h2>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-light-70 flex items-center">
                  Perioada (luni)
                  <InfoTooltip text={loanType === 'NP' ? 'Durata maxima pentru nevoi personale: 60 luni (5 ani)' : 'Durata maxima pentru credit ipotecar: 360 luni (30 ani)'} />
                </label>
                <span className="text-sm font-semibold text-brand-primary">{termMonths} luni ({(termMonths / 12).toFixed(termMonths % 12 === 0 ? 0 : 1)} ani)</span>
              </div>
              <input
                type="range"
                min={loanType === 'NP' ? 6 : 60}
                max={loanType === 'NP' ? 60 : 360}
                step={loanType === 'NP' ? 6 : 12}
                value={termMonths}
                onChange={e => setTermMonths(Number(e.target.value))}
                className="w-full accent-brand-primary"
              />
              <div className="flex justify-between text-xs text-light-50 mt-1">
                <span>{loanType === 'NP' ? '6 luni' : '5 ani'}</span>
                <span>{loanType === 'NP' ? '5 ani' : '30 ani'}</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-light-70 mb-1.5 block">Suma dorita (optional)</label>
              <div className="relative">
                <input
                  type="number"
                  value={desiredAmount}
                  onChange={e => setDesiredAmount(e.target.value)}
                  placeholder="ex: 50000"
                  className="w-full h-11 bg-dark-800 border border-dark-400 rounded-xl px-3 pr-14 text-sm text-light-100 placeholder:text-light-50 focus:outline-none focus:border-brand-primary/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-50">RON</span>
              </div>
            </div>

            {loanType === 'IPOTECAR' && (
              <>
                <div>
                  <label className="text-sm text-light-70 mb-1.5 block">Valoarea imobilului</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={propertyValue}
                      onChange={e => setPropertyValue(e.target.value)}
                      placeholder="ex: 100000"
                      className="w-full h-11 bg-dark-800 border border-dark-400 rounded-xl px-3 pr-14 text-sm text-light-100 placeholder:text-light-50 focus:outline-none focus:border-brand-primary/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-50">RON</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-light-70">Prima locuinta?</label>
                  <div className="flex gap-2">
                    <button onClick={() => setIsFirstHome(true)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isFirstHome ? 'bg-brand-primary text-white' : 'bg-dark-600 text-light-60 hover:bg-dark-500'}`}>Da</button>
                    <button onClick={() => setIsFirstHome(false)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isFirstHome ? 'bg-brand-primary text-white' : 'bg-dark-600 text-light-60 hover:bg-dark-500'}`}>Nu</button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-light-70">Sursa venit</label>
                  <div className="flex gap-2">
                    <button onClick={() => setIncomeSource('RO')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${incomeSource === 'RO' ? 'bg-brand-primary text-white' : 'bg-dark-600 text-light-60 hover:bg-dark-500'}`}>Romania</button>
                    <button onClick={() => setIncomeSource('STRAINATATE')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${incomeSource === 'STRAINATATE' ? 'bg-brand-primary text-white' : 'bg-dark-600 text-light-60 hover:bg-dark-500'}`}>Strainatate</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {liveMaxAmount && (
            <div className="bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border border-brand-primary/20 rounded-2xl p-5">
              <p className="text-xs text-light-50 uppercase tracking-wider mb-1">Suma maxima estimata</p>
              <p className="text-3xl font-bold text-light-100">{fmtCurrency(liveMaxAmount.maxLoanAmount)}</p>
              <p className="text-sm text-light-60 mt-1">Rata lunara max: {fmtCurrency(liveMaxAmount.maxMonthlyPayment)}</p>
              {liveMaxAmount.maxLoanBestCase && liveMaxAmount.maxLoanWorstCase && (
                <p className="text-xs text-light-50 mt-2">Interval: {fmtCurrency(liveMaxAmount.maxLoanWorstCase)} — {fmtCurrency(liveMaxAmount.maxLoanBestCase)}</p>
              )}
            </div>
          )}

          <button
            onClick={goToResults}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-primary/90 hover:shadow-lg hover:shadow-brand-primary/25 transition-all"
          >
            <Sparkles size={16} /> Vezi rezultatul complet
          </button>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && ratingInfo && (
        <div className="space-y-5">
          {/* Rating card */}
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
            <p className="text-sm text-light-60 mb-4 text-center">Rating eligibilitate</p>
            <div className={`flex items-center gap-4 rounded-xl p-4 ${ratingInfo.bgClass}`}>
              <div className={`w-12 h-12 rounded-full ${ratingInfo.bgClass} flex items-center justify-center flex-shrink-0`}>
                <ratingInfo.Icon size={28} className={ratingInfo.textClass} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xl font-bold ${ratingInfo.textClass}`}>{ratingInfo.label}</p>
                <p className="text-sm text-light-60 mt-0.5">{ratingInfo.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className={`h-1.5 flex-1 rounded-full ${result.rating === 'RED' || result.rating === 'YELLOW' || result.rating === 'GREEN' ? ratingInfo.barClass : 'bg-dark-500'} ${result.rating === 'RED' ? 'opacity-100' : 'opacity-30'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${result.rating === 'YELLOW' || result.rating === 'GREEN' ? ratingInfo.barClass : 'bg-dark-500'} ${result.rating === 'YELLOW' ? 'opacity-100' : result.rating === 'GREEN' ? 'opacity-30' : 'opacity-30'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${result.rating === 'GREEN' ? ratingInfo.barClass : 'bg-dark-500'}`} />
            </div>
            <p className="text-xs text-light-50 mt-3 text-center">Incredere: {result.confidence}</p>
          </div>

          {/* FICO analysis */}
          {result.ficoScore !== undefined && (
            <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-light-100 flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-brand-primary" /> Analiza FICO
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-dark-800 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-light-100">{result.ficoScore}</p>
                  <p className="text-[10px] text-light-50">FICO</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-light-90">{result.ficoInterpretation}</p>
                  <p className="text-xs text-light-50 mt-1">
                    {result.lendersPool === 'STANDARD' ? 'Eligibil la toate bancile' : result.lendersPool === 'FALLBACK' ? `Eligibil la: ${result.fallbackLenders.join(', ')}` : 'Necesita analiza manuala'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Income & DTI */}
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-light-100 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-primary" /> Analiza venituri & capacitate
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-xs text-light-50">Salariu mediu</p>
                <p className="text-sm font-semibold text-light-100">{fmtCurrency(result.avgSalary)}</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-xs text-light-50">Venit eligibil</p>
                <p className="text-sm font-semibold text-light-100">{fmtCurrency(result.eligibleIncome)}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-sm text-light-70">Grad de indatorare (DTI)</span>
                <InfoTooltip text={`Cap DTI aplicat: ${(result.dtiUsed * 100).toFixed(0)}% — ${result.dtiCapReason === 'STANDARD' ? 'standard' : result.dtiCapReason === 'HIGH_DTI_WINDOW' ? 'fereastra DTI 50% activa' : result.dtiCapReason === 'HIGH_INCOME' ? 'venit ridicat' : result.dtiCapReason}`} />
              </div>
              <DtiBar value={result.existingObligations > 0 ? result.existingObligations / result.eligibleIncome : 0} cap={result.dtiUsed} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-xs text-light-50">Obligatii existente</p>
                <p className="text-sm font-semibold text-light-100">{fmtCurrency(result.existingObligations)}</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-xs text-light-50">Rata max disponibila</p>
                <p className="text-sm font-semibold text-light-100">{fmtCurrency(result.maxMonthlyPayment)}</p>
              </div>
            </div>
          </div>

          {/* Loan offer */}
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-light-100 flex items-center gap-2">
              <Building2 size={18} className="text-brand-primary" /> Oferta estimata
            </h2>
            <div className="bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 border border-brand-primary/20 rounded-xl p-4">
              <p className="text-xs text-light-50 mb-1">Suma maxima</p>
              <p className="text-3xl font-bold text-light-100">{fmtCurrency(result.maxLoanAmount)}</p>
              {result.maxLoanBestCase && result.maxLoanWorstCase && result.maxLoanAmount > 0 && (
                <p className="text-xs text-light-50 mt-1">Interval: {fmtCurrency(result.maxLoanWorstCase)} — {fmtCurrency(result.maxLoanBestCase)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-xs text-light-50">{loanType === 'IPOTECAR' ? 'Dobanda stress test' : 'DAE aplicata'}</p>
                <p className="text-sm font-semibold text-light-100">{result.aprUsed.toFixed(2)}%</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-xs text-light-50">Perioada</p>
                <p className="text-sm font-semibold text-light-100">{result.termMonths} luni</p>
              </div>
            </div>
            {result.estimatedMonthlyPayment && result.maxLoanAmount > 0 && (
              <div className="flex justify-between items-center py-3 border-t border-dark-400">
                <span className="text-sm text-light-60">Rata lunara estimata</span>
                <span className="text-sm font-bold text-light-100">{fmtCurrency(result.estimatedMonthlyPayment)}</span>
              </div>
            )}
            {result.downpaymentPercent !== undefined && (
              <div className="flex justify-between items-center py-3 border-t border-dark-400">
                <span className="text-sm text-light-60">Avans minim ({(result.downpaymentPercent * 100).toFixed(0)}%)</span>
                <span className="text-sm font-medium text-light-100">{result.downpaymentAmount ? fmtCurrency(result.downpaymentAmount) : '—'}</span>
              </div>
            )}
          </div>

          {/* Reasons */}
          {result.reasons.length > 0 && (
            <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-light-100 flex items-center gap-2">
                <CheckCircle size={18} className="text-success-500" /> Factori evaluati
              </h2>
              {result.reasons.map(r => (
                <div key={r.code} className="py-2">
                  <p className="text-sm font-medium text-light-90">{r.title}</p>
                  {r.details && <p className="text-xs text-light-60 mt-0.5">{r.details}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Risk flags */}
          {result.riskFlags.length > 0 && (
            <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-light-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-warning-500" /> Riscuri identificate
              </h2>
              {result.riskFlags.map(f => (
                <div key={f.code} className="py-2 flex items-start gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                    f.severity === 'HIGH' ? 'bg-error-500/15 text-error-400' : f.severity === 'MEDIUM' ? 'bg-warning-500/15 text-warning-400' : 'bg-dark-500 text-light-50'
                  }`}>{f.severity}</span>
                  <span className="text-sm text-light-90">{f.details || f.code}</span>
                </div>
              ))}
            </div>
          )}

          {/* Lender routing */}
          {result.fallbackLenders.length > 0 && (
            <div className="bg-warning-500/10 border border-warning-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={18} className="text-warning-500" />
                <h2 className="text-sm font-semibold text-light-100">Banci eligibile</h2>
              </div>
              <p className="text-sm text-light-60">Pe baza scorului FICO, esti eligibil doar la:</p>
              <div className="flex gap-2 mt-2">
                {result.fallbackLenders.map(l => (
                  <span key={l} className="px-3 py-1 rounded-full bg-warning-500/15 text-warning-400 text-sm font-medium">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard/apply')} className="flex-1 h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25">
                Aplica acum
              </button>
              <button onClick={() => { setResult(null); setStep(2); }} className="flex-1 h-12 rounded-full border border-dark-400 text-light-80 font-medium hover:border-dark-300 transition-colors">
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
        </div>
      )}

      <ContactBrokerModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        simulationDetails={
          result
            ? `Rating: ${ratingInfo?.label}\n` +
              `Suma maxima: ${fmtCurrency(result.maxLoanAmount)}\n` +
              (result.estimatedMonthlyPayment ? `Rata estimata: ${fmtCurrency(result.estimatedMonthlyPayment)}\n` : '') +
              `DTI: ${(result.dtiUsed * 100).toFixed(0)}%`
            : undefined
        }
      />
    </div>
  );
}
