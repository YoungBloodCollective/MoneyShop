import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, ChevronLeft, ChevronRight, CheckCircle2, Shield, Award, Clock, Star, Users, FileCheck, Building2, ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInView } from '@/hooks/useInView';
import { apiClient } from '@/services/api/apiClient';
import toast from 'react-hot-toast';

const creditOptions = [
  { key: 'NP', label: 'Credit Nevoi Personale' },
  { key: 'IPOTECAR', label: 'Credit Ipotecar' },
] as const;
type LoanType = (typeof creditOptions)[number]['key'];
type Gender = 'M' | 'F';
type IncomeType = 'salariat' | 'pensionar' | 'altele';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const birthYearOptions = Array.from({ length: 60 }, (_, i) => currentYear - 18 - i);
const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function calcMaxTerm(
  loanType: LoanType,
  incomeType: IncomeType,
  gender: Gender,
  birthYear: number,
  birthMonth: number,
): number {
  const ageInMonths = (currentYear - birthYear) * 12 + (currentMonth - birthMonth);
  const baseTerm = loanType === 'IPOTECAR' ? 420 : 60;
  if (incomeType === 'pensionar') {
    const maxAgeMonths = 74 * 12 + 11;
    const remaining = maxAgeMonths - ageInMonths;
    return Math.max(0, Math.min(baseTerm, remaining));
  }
  const maxAge = (loanType === 'NP' && gender === 'F') ? 63 : 65;
  const maxAgeMonths = maxAge * 12;
  const remaining = maxAgeMonths - ageInMonths;
  return Math.max(0, Math.min(baseTerm, remaining));
}

const bankLogos = [
  { name: 'BCR', src: '/images/partners/bcr.png' },
  { name: 'BRD', src: '/images/partners/brd.png' },
  { name: 'ING', src: '/images/partners/ing.png' },
  { name: 'Banca Transilvania', src: '/images/partners/bt.png' },
  { name: 'UniCredit Bank', src: '/images/partners/unicredit.png' },
  { name: 'ProCredit Bank', src: '/images/partners/procredit.png' },
  { name: 'Libra Bank', src: '/images/partners/libra.png' },
  { name: 'Exim Bank', src: '/images/partners/eximbank.svg' },
  { name: 'Patria Bank', src: '/images/partners/patria.svg' },
];

const judete = [
  'Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud', 'Botosani', 'Braila',
  'Brasov', 'Bucuresti', 'Buzau', 'Calarasi', 'Caras-Severin', 'Cluj', 'Constanta',
  'Covasna', 'Dambovita', 'Dolj', 'Galati', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara',
  'Ialomita', 'Iasi', 'Ilfov', 'Maramures', 'Mehedinti', 'Mures', 'Neamt', 'Olt',
  'Prahova', 'Salaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timis', 'Tulcea',
  'Vaslui', 'Valcea', 'Vrancea',
];

const tipuriCredit = ['Credit Nevoi Personale', 'Credit Ipotecar', 'Refinantare'];

const howItWorks = [
  { num: 1, title: 'Calculeaza', desc: 'Alege suma si tipul de credit', img: '/images/landing/step1.png' },
  { num: 2, title: 'Verificare 100% Online', desc: 'ANAF \u2022 Birou de Credite', img: '/images/landing/step2.png' },
  { num: 3, title: 'Compara Oferte', desc: 'Cele mai bune banci', img: '/images/landing/step3.png' },
  { num: 4, title: 'Semneaza', desc: 'Aplica rapid', img: '/images/landing/step4.png' },
];

function useCountUp(end: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, trigger]);
  return value;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const carouselRef = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loanType, setLoanType] = useState<LoanType>('NP');
  const [gender, setGender] = useState<Gender>('M');
  const [incomeType, setIncomeType] = useState<IncomeType>('salariat');
  const [birthYear, setBirthYear] = useState(1990);
  const [birthMonth, setBirthMonth] = useState(1);
  const [salaryNet, setSalaryNet] = useState(5000);
  const [bonuriMasa, setBonuriMasa] = useState(0);
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerSalary, setPartnerSalary] = useState(0);
  const [partnerBonuri, setPartnerBonuri] = useState(0);

  const [showProgrameaza, setShowProgrameaza] = useState(false);
  const [progForm, setProgForm] = useState({ nume: '', prenume: '', judet: '', tipCredit: '', salariuNet: '', telefon: '', email: '' });
  const [progLoading, setProgLoading] = useState(false);

  const handleProgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgLoading(true);
    try {
      await apiClient.post('/appointments', {
        nume: progForm.nume,
        prenume: progForm.prenume,
        judet: progForm.judet,
        tipCredit: progForm.tipCredit,
        salariuNet: Number(progForm.salariuNet),
        telefon: progForm.telefon,
        email: progForm.email,
      });
      toast.success('Cererea ta a fost inregistrata! Te vom contacta in curand.');
      setShowProgrameaza(false);
      setProgForm({ nume: '', prenume: '', judet: '', tipCredit: '', salariuNet: '', telefon: '', email: '' });
    } catch {
      toast.error('A aparut o eroare. Te rugam sa incerci din nou.');
    } finally {
      setProgLoading(false);
    }
  };

  const stepsSection = useInView(0.1);
  const statsSection = useInView(0.3);

  const clientCount = useCountUp(200000, 1800, statsSection.isVisible);
  const bankCount = useCountUp(50, 1200, statsSection.isVisible);

  const results = useMemo(() => {
    const termMonths = calcMaxTerm(loanType, incomeType, gender, birthYear, birthMonth);
    if (termMonths <= 0) return { amount: 0, rate: 0, termMonths: 0, error: 'Varsta depaseste limita pentru acest tip de credit.' };
    let totalIncome = salaryNet + (incomeType === 'salariat' ? bonuriMasa : 0);
    if (hasPartner && loanType === 'IPOTECAR') {
      totalIncome += partnerSalary + partnerBonuri;
    }
    const dtiCap = totalIncome > 5700 ? 0.50 : 0.40;
    const apr = loanType === 'IPOTECAR' ? 0.065 : 0.059;
    const maxPayment = totalIncome * dtiCap;
    const monthlyRate = apr / 12;
    const factor = monthlyRate > 0 ? (1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate : termMonths;
    const maxLoan = Math.round(maxPayment * factor);
    return { amount: maxLoan, rate: apr * 100, termMonths, error: null };
  }, [loanType, gender, incomeType, birthYear, birthMonth, salaryNet, bonuriMasa, hasPartner, partnerSalary, partnerBonuri]);

  const fmt = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  const scrollCarousel = useCallback((dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ══════════ HEADER ══════════ */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center">
            <img src="/images/logo/logo-trimmed.png" alt="MoneyShop" className="h-8 sm:h-9 object-contain" />
          </button>
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { label: 'Despre MoneyShop', path: '/despre' },
              { label: 'Verifica Broker', path: '/verifica-broker' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)} className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors cursor-pointer">
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="tel:+40770548447" className="hidden md:flex items-center gap-1.5 text-sm text-gray-700 font-medium hover:text-gray-900 transition-colors">
              <Phone size={14} /> 0770 548 447
            </a>
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth/login')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              <Lock size={14} /> {isAuthenticated ? 'Dashboard' : 'Login'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden fixed left-0 right-0 top-16 z-[9999] bg-white border-b border-gray-200 shadow-2xl">
            <div className="flex flex-col p-4 gap-1">
              {[
                { label: 'Despre MoneyShop', path: '/despre' },
                { label: 'Verifica Broker', path: '/verifica-broker' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                  className="text-left px-4 py-3 text-base text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <hr className="my-2 border-gray-200" />
              <a href="tel:+40770548447" className="flex items-center gap-2 px-4 py-3 text-base text-gray-700 font-medium">
                <Phone size={16} /> 0770 548 447
              </a>
              <a href="tel:+40314340940" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 font-medium">
                <Phone size={14} /> 031 434 0940
              </a>
              <hr className="my-2 border-gray-200" />
              <button
                onClick={() => { navigate(isAuthenticated ? '/dashboard' : '/auth/login'); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Lock size={16} /> {isAuthenticated ? 'Dashboard' : 'Autentificare'}
              </button>
              <button
                onClick={() => { navigate('/legal'); setMobileMenuOpen(false); }}
                className="text-left px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Legal &amp; GDPR
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-white lg:min-h-[calc(100dvh-4rem)]">
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[55%] xl:w-[58%] 2xl:w-[62%]">
          <img src="/images/landing/family.png" alt="Familie fericita" className="w-full h-full object-cover object-[55%_center] animate-fade-in" />
          <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-white via-white/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/80" />
        </div>
        <div className="lg:hidden w-full h-52 sm:h-64 relative overflow-hidden">
          <img src="/images/landing/family.png" alt="Familie fericita" className="w-full h-full object-cover object-[center_30%]" />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-3 pb-6 lg:py-0 lg:pb-0 lg:flex lg:items-center lg:min-h-[calc(100dvh-4rem)]">
          <div className="max-w-xl w-full">
            <h1 className="text-2xl sm:text-3xl lg:text-[2.8rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight animate-slide-up">
              Gaseste cel mai bun credit
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 lg:mt-2 animate-slide-up anim-delay-1">
              <span className="text-lg sm:text-2xl lg:text-[2.2rem] font-extrabold text-blue-600">Rapid</span>
              <span className="text-lg sm:text-2xl lg:text-[2.2rem] font-extrabold text-gray-300">&middot;</span>
              <span className="text-lg sm:text-2xl lg:text-[2.2rem] font-extrabold text-green-500">Sigur</span>
              <span className="text-lg sm:text-2xl lg:text-[2.2rem] font-extrabold text-gray-300">&middot;</span>
              <span className="text-lg sm:text-2xl lg:text-[2.2rem] font-extrabold bg-yellow-300 px-2 py-0.5 rounded-lg text-gray-900">100% Gratuit</span>
            </div>
            <p className="text-gray-500 mt-2 text-xs sm:text-sm lg:text-base hidden sm:block animate-slide-up anim-delay-2">
              Compara ofertele tuturor <strong className="text-gray-700">bancilor</strong> si obtine aprobare in <strong className="text-gray-700">24h</strong>
            </p>
            <div className="hidden sm:flex flex-wrap gap-1.5 mt-3 animate-slide-up anim-delay-2">
              {[
                { icon: <CheckCircle2 size={13} className="text-green-500" />, text: 'Fara Comisioane' },
                { icon: <CheckCircle2 size={13} className="text-green-500" />, text: 'Aprobare Rapida' },
                { icon: <CheckCircle2 size={13} className="text-green-500" />, text: '100% Online' },
              ].map(badge => (
                <div key={badge.text} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600 shadow-sm">
                  {badge.icon} {badge.text}
                </div>
              ))}
            </div>
            {/* ── Calculator Card ── */}
            <div className="mt-3 sm:mt-4 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-slide-up anim-delay-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2">
                <h3 className="text-white font-bold text-sm">Credit</h3>
              </div>
              <div className="p-3 sm:p-4 space-y-2">
                <div className="flex gap-1.5">
                  {creditOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setLoanType(opt.key); if (opt.key !== 'IPOTECAR') { setHasPartner(false); setPartnerSalary(0); setPartnerBonuri(0); } }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                        loanType === opt.key
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">Data nasterii</label>
                    <div className="flex gap-1">
                      <select
                        value={birthMonth}
                        onChange={e => setBirthMonth(Number(e.target.value))}
                        className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                      <select
                        value={birthYear}
                        onChange={e => setBirthYear(Number(e.target.value))}
                        className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {birthYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">Gen</label>
                    <div className="flex gap-1">
                      {([['M', 'Masculin'], ['F', 'Feminin']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setGender(val)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                            gender === val
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">Tip venit</label>
                    <div className="flex gap-1">
                      {([['salariat', 'Salariat'], ['pensionar', 'Pensionar'], ['altele', 'Altele']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setIncomeType(val)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                            incomeType === val
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">
                      {incomeType === 'pensionar' ? 'Pensie Net (RON)' : 'Salariu Net (RON)'}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={50000}
                      value={salaryNet || ''}
                      onChange={e => setSalaryNet(Math.min(50000, Math.max(0, parseInt(e.target.value) || 0)))}
                      placeholder="5000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={`text-[10px] font-medium mb-0.5 block ${incomeType === 'salariat' ? 'text-gray-500' : 'text-gray-300'}`}>
                      Bonuri de masa (RON/luna)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={2000}
                      value={incomeType === 'salariat' ? (bonuriMasa || '') : ''}
                      onChange={e => setBonuriMasa(Math.min(2000, Math.max(0, parseInt(e.target.value) || 0)))}
                      placeholder={incomeType === 'salariat' ? '0' : '-'}
                      disabled={incomeType !== 'salariat'}
                      className={`w-full sm:w-1/2 border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        incomeType === 'salariat'
                          ? 'bg-gray-50 border-gray-200 text-gray-900'
                          : 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    />
                  </div>
                  {loanType === 'IPOTECAR' && (
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => { setHasPartner(!hasPartner); if (hasPartner) { setPartnerSalary(0); setPartnerBonuri(0); } }}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                          hasPartner
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <Users size={13} />
                        {hasPartner ? 'Partener adaugat' : 'Adauga partener (co-debitor)'}
                      </button>
                    </div>
                  )}
                  {hasPartner && loanType === 'IPOTECAR' && (
                    <>
                      <div>
                        <label className="text-[10px] font-medium text-blue-500 mb-0.5 block">Salariu Net Partener (RON)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={50000}
                          value={partnerSalary || ''}
                          onChange={e => setPartnerSalary(Math.min(50000, Math.max(0, parseInt(e.target.value) || 0)))}
                          placeholder="0"
                          className="w-full bg-blue-50/50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-blue-500 mb-0.5 block">Bonuri Partener (RON/luna)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={2000}
                          value={partnerBonuri || ''}
                          onChange={e => setPartnerBonuri(Math.min(2000, Math.max(0, parseInt(e.target.value) || 0)))}
                          placeholder="0"
                          className="w-full bg-blue-50/50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-xl p-3 border border-blue-200/40">
                  {results.error ? (
                    <p className="text-xs text-red-500 font-medium py-1">{results.error}</p>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] text-blue-600 font-medium">Poti primi pana la:</p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                          {fmt(results.amount)} <span className="text-[10px] font-semibold text-gray-400">RON</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">{results.termMonths} luni</p>
                        <p className="text-xs text-gray-500">
                          de la <strong className="text-gray-900">{results.rate.toFixed(1)}%</strong>/an
                        </p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/simulator')}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-lg shadow-green-500/25"
                  >
                    Calculeaza Instant <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ BANK PARTNERS CAROUSEL ══════════ */}
      <section className="bg-white border-y border-gray-100 py-6 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-xs text-gray-400 mb-5 font-medium tracking-wide">&mdash; Parteneri Bancari &mdash;</p>
          <div className="relative">
            <button onClick={() => scrollCarousel('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div ref={carouselRef} className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-hide px-10 scroll-smooth">
              {[...bankLogos, ...bankLogos].map((bank, i) => (
                <div key={`${bank.name}-${i}`} className="flex-shrink-0 flex items-center justify-center h-10 w-28 sm:w-32 opacity-70 hover:opacity-100 transition-all cursor-pointer">
                  <img src={bank.src} alt={bank.name} className="h-8 sm:h-10 max-w-full object-contain" />
                </div>
              ))}
            </div>
            <button onClick={() => scrollCarousel('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ CUM FUNCTIONEAZA ══════════ */}
      <section className="bg-gray-50 py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-center text-2xl lg:text-3xl font-extrabold text-gray-900 mb-10 lg:mb-14">
            <span className="border-b-4 border-blue-600 pb-2">Cum functioneaza?</span>
          </h2>
          <div ref={stepsSection.ref} className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-5 items-stretch">
            {howItWorks.map((step, i) => (
              <div
                key={step.num}
                className={`relative transition-all duration-700 ease-out ${stepsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full flex flex-col">
                  <div className="aspect-[4/3] bg-white flex items-center justify-center p-5">
                    <img
                      src={step.img}
                      alt={step.title}
                      className="max-h-full max-w-full object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="px-3.5 pb-3.5 pt-1 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-6 h-6 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {step.num}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">{step.title}</h3>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">{step.desc}</p>
                  </div>
                </div>
                {i < howItWorks.length - 1 && (
                  <div
                    className={`hidden lg:flex absolute top-[38%] -right-[14px] z-10 transition-all duration-500 ${stepsSection.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
                    style={{ transitionDelay: `${i * 150 + 400}ms` }}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center animate-arrow-pulse">
                      <ArrowRight size={14} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {/* Broker autorizat — 5th card */}
            <div
              className={`col-span-2 lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-700 ease-out overflow-hidden flex flex-col h-full ${stepsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '600ms' }}
            >
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                <img src="/images/landing/alex.jpeg" alt="Broker autorizat" className="w-full h-full object-cover object-top" />
              </div>
              <div className="px-3.5 pb-3.5 pt-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Broker autorizat de credite</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Programeaza un apel gratuit</p>
                </div>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => setShowProgrameaza(true)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 rounded-xl text-xs transition-colors shadow-md shadow-green-500/20"
                  >
                    Programeaza
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">
                    Sau suna: <strong className="text-gray-700">0770 548 447</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TRUST / STATS BAR ══════════ */}
      <section ref={statsSection.ref} className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 py-5">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`flex flex-wrap items-center justify-center gap-5 sm:gap-8 lg:gap-12 transition-all duration-700 ease-out ${statsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-2.5">
              <Users size={22} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-lg font-extrabold text-white leading-tight">{fmt(clientCount)}+</p>
                <p className="text-[10px] text-gray-400">Clienti multumiti</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Building2 size={22} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-lg font-extrabold text-white leading-tight">{bankCount}+</p>
                <p className="text-[10px] text-gray-400">Banci Partenere</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock size={22} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Aprobare</p>
                <p className="text-lg font-extrabold text-white leading-tight">in 24h</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Star size={22} className="text-yellow-400 fill-yellow-400 shrink-0" />
              <div>
                <p className="text-lg font-extrabold text-white leading-tight">4.9/5</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={9} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Shield size={22} className="text-green-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Transmisii</p>
                <p className="text-xs font-bold text-white">Securizate</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={22} className="text-blue-400 shrink-0" />
              <p className="text-xs font-bold text-white">GDPR</p>
            </div>
            <div className="flex items-center gap-2">
              <Award size={22} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Autorizat</p>
                <p className="text-xs font-bold text-white">BNR</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-gray-900 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <img src="/images/logo/logo-trimmed.png" alt="MoneyShop" className="h-8 brightness-0 invert object-contain" />
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Broker de credite autorizat BNR. Comparam ofertele tuturor bancilor pentru tine, complet gratuit.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Credite</p>
              <div className="space-y-1.5 text-[11px] text-gray-400">
                <p className="hover:text-white cursor-pointer transition-colors">Nevoi Personale</p>
                <p className="hover:text-white cursor-pointer transition-colors">Credit Ipotecar</p>
                <p className="hover:text-white cursor-pointer transition-colors">Credit Auto</p>
                <p className="hover:text-white cursor-pointer transition-colors">Credit Business</p>
                <p className="hover:text-white cursor-pointer transition-colors">Refinantare</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Companie</p>
              <div className="space-y-1.5 text-[11px] text-gray-400">
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/despre')}>Despre MoneyShop</p>
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/verifica-broker')}>Verifica un broker</p>
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/legal')}>Termeni si conditii</p>
                <p className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/legal')}>Politica de confidentialitate</p>
                <p className="hover:text-white cursor-pointer transition-colors">Blog</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Contact</p>
              <div className="space-y-1.5 text-[11px] text-gray-400">
                <p className="flex items-center gap-1.5"><Phone size={11} /> 0770 548 447</p>
                <p className="flex items-center gap-1.5"><Phone size={11} /> 031 434 0940</p>
                <p>contact@moneyshop.ro</p>
                <p>Bucuresti, Romania</p>
                <p>L-V: 09:00 - 18:00</p>
              </div>
              <div className="mt-3">
                <p className="text-[10px] text-gray-500 mb-1.5">Inregistrat ASF &bull; Autorizat BNR</p>
                <div className="flex gap-2">
                  <FileCheck size={14} className="text-gray-600" />
                  <Shield size={14} className="text-gray-600" />
                  <Award size={14} className="text-gray-600" />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col items-center gap-5">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 border-2 border-[#1a1a6b] rounded-full px-5 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                <img src="/images/anpc-logo.png" alt="ANPC" className="h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-[#1a1a6b] leading-tight uppercase">Solutionarea Alternativa</p>
                  <p className="text-[10px] font-bold text-[#1a1a6b] leading-tight uppercase">a Litigiilor</p>
                  <span className="inline-block mt-0.5 bg-[#1a1a6b] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase">Detalii</span>
                </div>
              </a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 border-2 border-[#1a1a6b] rounded-full px-5 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-[#1a1a6b] leading-tight uppercase">Solutionarea Online</p>
                  <p className="text-[10px] font-bold text-[#1a1a6b] leading-tight uppercase">a Litigiilor</p>
                  <span className="inline-block mt-0.5 bg-[#1a1a6b] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase">Detalii</span>
                </div>
              </a>
            </div>
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-gray-600">&copy; {new Date().getFullYear()} MoneyShop. Toate drepturile rezervate.</p>
              <div className="flex items-center gap-4 text-[11px] text-gray-600">
                <a href="/legal" className="hover:text-gray-400 transition-colors">Legal</a>
                <a href="/despre" className="hover:text-gray-400 transition-colors">Despre</a>
                <a href="/legal" className="hover:text-gray-400 transition-colors">GDPR</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {showProgrameaza && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowProgrameaza(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Programeaza un apel</h2>
              <button onClick={() => setShowProgrameaza(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProgSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nume</label>
                  <input
                    type="text"
                    required
                    value={progForm.nume}
                    onChange={e => setProgForm(f => ({ ...f, nume: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prenume</label>
                  <input
                    type="text"
                    required
                    value={progForm.prenume}
                    onChange={e => setProgForm(f => ({ ...f, prenume: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Judet</label>
                <select
                  required
                  value={progForm.judet}
                  onChange={e => setProgForm(f => ({ ...f, judet: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
                >
                  <option value="">Selecteaza judetul</option>
                  {judete.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tip de credit</label>
                <select
                  required
                  value={progForm.tipCredit}
                  onChange={e => setProgForm(f => ({ ...f, tipCredit: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
                >
                  <option value="">Selecteaza tipul</option>
                  {tipuriCredit.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Salariu net (RON)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={progForm.salariuNet}
                  onChange={e => setProgForm(f => ({ ...f, salariuNet: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numar de telefon</label>
                <input
                  type="text"
                  required
                  value={progForm.telefon}
                  onChange={e => setProgForm(f => ({ ...f, telefon: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={progForm.email}
                  onChange={e => setProgForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
              <button
                type="submit"
                disabled={progLoading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-green-500/20"
              >
                {progLoading ? 'Se trimite...' : 'Trimite cererea'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes arrowPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); }
          50% { transform: scale(1.15); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5); }
        }
        .animate-slide-up {
          animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-fade-in {
          animation: fadeIn 1.2s ease-out both;
        }
        .animate-arrow-pulse {
          animation: arrowPulse 2.5s ease-in-out infinite;
        }
        .anim-delay-1 { animation-delay: 0.12s; }
        .anim-delay-2 { animation-delay: 0.24s; }
        .anim-delay-3 { animation-delay: 0.36s; }

        @media (prefers-reduced-motion: reduce) {
          .animate-slide-up,
          .animate-fade-in,
          .animate-arrow-pulse { animation: none !important; }
          .anim-delay-1, .anim-delay-2, .anim-delay-3 { animation-delay: 0s !important; }
        }
      `}</style>
    </div>
  );
}
