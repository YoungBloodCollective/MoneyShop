import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, CreditCard, CalendarClock, ArrowRight,
  Plus, Calculator, FileText, ChevronRight, Upload, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { applicationsApi } from '@/services/api/applicationsApi';
import { userFinancialDataApi, type UserFinancialData } from '@/services/api/userFinancialDataApi';
import { bcReportApi, type BcReportSummaryDto } from '@/services/api/bcReportApi';
import type { Application } from '@/types/application.types';

function SkeletonBox() {
  return (
    <div className="bg-dark-700 border border-dark-400 rounded-xl p-4 h-full flex flex-col animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-dark-500" />
        <div className="h-3 w-20 bg-dark-500 rounded" />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-2">
        <div className="h-6 w-28 bg-dark-500 rounded" />
        <div className="h-3 w-36 bg-dark-500 rounded" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [financial, setFinancial] = useState<UserFinancialData | null>(null);
  const [bcReport, setBcReport] = useState<BcReportSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      applicationsApi.getAll().catch(() => []),
      userFinancialDataApi.getMyData().catch(() => null),
      bcReportApi.getLatest().catch(() => null),
    ]).then(([apps, fin, bc]) => {
      setApplications(apps);
      setFinancial(fin);
      setBcReport(bc && !('isEmpty' in bc) ? bc : null);
    }).finally(() => setLoading(false));
  }, []);

  const hasFinancial = financial && !financial.isEmpty;
  const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  const ficoScore = bcReport?.ficoScore ?? bcReport?.parsedData?.ficoScore ?? financial?.ficoScore;
  const hasBcReport = !!ficoScore;

  const bcBankInd = bcReport?.parsedData?.bankingIndicators;
  const bcNonBankInd = bcReport?.parsedData?.nonBankingIndicators;
  const bcTotalMonthly = (bcBankInd?.totalMonthlyPayment ?? 0) + (bcNonBankInd?.totalMonthlyPayment ?? 0);
  const bcTotalOwed = (bcBankInd?.totalAmountOwed ?? 0) + (bcNonBankInd?.totalAmountOwed ?? 0);
  const bcActiveAccounts = bcReport?.parsedData?.accounts?.filter(a => a.isActive && a.currentBalance > 0 && a.creditor?.trim()) ?? [];
  const bcAccountCount = bcActiveAccounts.length;
  const bcHasArrears = bcActiveAccounts.some(a => a.arrearsAmount > 0);
  const bcArrearsCount = bcActiveAccounts.filter(a => a.arrearsAmount > 0).length;

  const boxes = [
    {
      key: 'salary',
      label: 'Salariu net',
      value: hasFinancial ? `${fmt(financial?.salariuNet)} RON` : '— RON',
      icon: Wallet,
      iconBg: 'bg-brand-primary/15',
      iconColor: 'text-brand-primary',
      subtitle: hasFinancial ? 'Media ultimelor 3 luni' : 'Completeaza datele financiare',
      clickable: true,
      path: hasFinancial ? '/dashboard/salary-detail' : '/profile/financial',
    },
    {
      key: 'score',
      label: 'Scor de credit',
      value: hasBcReport ? `${ficoScore}` : null,
      icon: hasBcReport ? ShieldCheck : Upload,
      iconBg: hasBcReport ? 'bg-cyan-500/15' : 'bg-brand-primary/15',
      iconColor: hasBcReport ? 'text-cyan-500' : 'text-brand-primary',
      subtitle: hasBcReport
        ? (ficoScore! >= 700 ? 'Scor bun' : ficoScore! >= 500 ? 'Scor mediu' : 'Scor scazut')
        : 'Afla scorul tau de credit si obtine oferte personalizate',
      clickable: !hasBcReport,
      path: '/profile/bc-report',
    },
    {
      key: 'payment',
      label: 'Urmatoarea rata',
      value: (bcReport && bcTotalMonthly > 0)
        ? `${fmt(bcTotalMonthly)} RON`
        : hasFinancial ? `${fmt(financial?.rataTotalaLunara)} RON` : '— RON',
      icon: CalendarClock,
      iconBg: 'bg-warning-500/15',
      iconColor: 'text-warning-500',
      subtitle: (bcReport && bcAccountCount > 0)
        ? `${bcAccountCount} credit${bcAccountCount !== 1 ? 'e' : ''} active${bcHasArrears ? ` (${bcArrearsCount} cu intarzieri)` : ''}`
        : hasFinancial
          ? `${financial?.credits?.length || 0} credit${(financial?.credits?.length || 0) !== 1 ? 'e' : ''} active`
          : 'Niciun credit inregistrat',
      clickable: true,
      path: (bcReport || hasFinancial) ? '/dashboard/payment-detail' : '/profile/financial',
    },
    {
      key: 'credits',
      label: 'Total credite',
      value: (bcReport && bcTotalOwed > 0)
        ? `${fmt(bcTotalOwed)} RON`
        : hasFinancial ? `${fmt(financial?.soldTotal)} RON` : '— RON',
      icon: CreditCard,
      iconBg: 'bg-info-500/15',
      iconColor: 'text-info-500',
      subtitle: (bcReport && bcTotalOwed > 0 && hasFinancial && financial?.venitTotal)
        ? `Grad indatorare: ${((bcTotalMonthly / financial.venitTotal) * 100).toFixed(0)}%`
        : hasFinancial
          ? `Grad indatorare: ${((financial?.dti ?? 0) * 100).toFixed(0)}%`
          : 'Nicio datorie inregistrata',
      clickable: true,
      path: (bcReport || hasFinancial) ? '/dashboard/credits-detail' : '/profile/financial',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-light-100">
          Buna, {user?.name?.split(' ')[0] || 'Utilizator'}!
        </h1>
        <p className="text-light-60 text-sm mt-0.5">Iata un sumar al situatiei tale financiare</p>
      </div>

      {/* Verification banner */}
      {user && (!user.emailVerified || !user.phoneVerified || user.kycStatus !== 'verified') && (
        <div className="bg-warning-500/10 border border-warning-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning-400">Contul tau nu este complet verificat</p>
            <p className="text-xs text-light-60 mt-0.5">
              {!user.emailVerified && 'Email neverificat. '}
              {!user.phoneVerified && 'Telefon neverificat. '}
              {user.kycStatus !== 'verified' && 'KYC incomplet. '}
              Finalizeaza verificarea pentru acces complet.
            </p>
          </div>
          <button onClick={() => navigate('/onboarding')} className="shrink-0 px-4 py-2 bg-warning-500 text-dark-900 text-xs font-bold rounded-lg hover:bg-warning-400 transition-colors">
            Verifica acum
          </button>
        </div>
      )}

      {/* 4-box grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <>
            <SkeletonBox />
            <SkeletonBox />
            <SkeletonBox />
            <SkeletonBox />
          </>
        ) : (
          boxes.map(box => {
            const isScore = box.key === 'score';

            const content = (
              <div
                className={`bg-dark-700 border border-dark-400 rounded-xl p-4 h-full flex flex-col transition-all duration-200 ${
                  box.clickable
                    ? 'hover:border-brand-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/5 cursor-pointer group'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${box.iconBg} flex items-center justify-center`}>
                      <box.icon size={16} className={box.iconColor} />
                    </div>
                    <p className="text-[11px] text-light-50 uppercase tracking-wider font-medium">{box.label}</p>
                  </div>
                  {box.clickable && (
                    <ChevronRight size={14} className="text-light-50 group-hover:text-brand-primary transition-colors" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  {isScore && hasBcReport ? (
                    <div>
                      <span className={`text-2xl font-bold ${ficoScore! >= 700 ? 'text-success-500' : ficoScore! >= 500 ? 'text-warning-500' : 'text-error-500'}`}>
                        {ficoScore}
                      </span>
                      <p className="text-[11px] text-light-50 mt-1">{box.subtitle}</p>
                    </div>
                  ) : isScore && !hasBcReport ? (
                    <div>
                      <p className="text-sm font-semibold text-light-100">Incarca Raportul BC</p>
                      <p className="text-[11px] text-light-50 mt-0.5 leading-snug">{box.subtitle}</p>
                      <span className="inline-block mt-2 px-3 py-1.5 text-[11px] font-medium rounded-full bg-brand-primary text-white">
                        Incarca raport
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-light-100">{box.value}</p>
                      <p className="text-[11px] text-light-50 mt-1">{box.subtitle}</p>
                    </>
                  )}
                </div>
              </div>
            );

            return box.clickable ? (
              <button key={box.key} onClick={() => navigate(box.path)} className="text-left w-full">
                {content}
              </button>
            ) : (
              <div key={box.key}>{content}</div>
            );
          })
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/dashboard/apply')}
          className="flex items-center gap-3 bg-gradient-to-r from-brand-primary to-brand-secondary p-4 rounded-xl text-left hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/25 transition-all duration-200"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Aplicatie noua</p>
            <p className="text-white/70 text-xs">Depune o cerere de credit</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/simulator')}
          className="flex items-center gap-3 bg-dark-700 border border-dark-400 p-4 rounded-xl text-left hover:border-brand-purple/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-purple/5 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-purple/15 group-hover:bg-brand-purple/25 flex items-center justify-center transition-colors">
            <Calculator size={20} className="text-brand-purple" />
          </div>
          <div>
            <p className="text-light-100 font-semibold text-sm">Simulator</p>
            <p className="text-light-60 text-xs">Calculeaza rata lunara</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/dashboard/applications')}
          className="flex items-center gap-3 bg-dark-700 border border-dark-400 p-4 rounded-xl text-left hover:border-info-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-info-500/5 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-lg bg-info-500/15 group-hover:bg-info-500/25 flex items-center justify-center transition-colors">
            <FileText size={20} className="text-info-500" />
          </div>
          <div>
            <p className="text-light-100 font-semibold text-sm">Aplicatiile mele</p>
            <p className="text-light-60 text-xs">Vezi toate cererile</p>
          </div>
        </button>
      </div>

      {/* Recent applications */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-dark-700 border border-dark-400 rounded-xl px-4 py-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-dark-500 rounded" />
                  <div className="h-3 w-16 bg-dark-500 rounded" />
                </div>
                <div className="h-6 w-20 bg-dark-500 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-dark-700 border border-dark-400 rounded-xl p-5 text-center">
          <FileText size={28} className="text-light-40 mx-auto mb-2" />
          <p className="text-sm text-light-60">Nicio aplicatie inca</p>
          <p className="text-xs text-light-40 mt-0.5">Depune prima ta cerere de credit pentru a incepe</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-light-100">Aplicatii recente</h2>
            <button
              onClick={() => navigate('/dashboard/applications')}
              className="text-xs text-brand-primary hover:underline flex items-center gap-1"
            >
              Vezi toate <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {applications.slice(0, 3).map(app => (
              <div key={app.id} className="flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-4 py-3 hover:border-brand-primary/20 transition-all">
                <div>
                  <p className="text-sm font-medium text-light-90">{app.typeCredit || 'Credit'}</p>
                  <p className="text-xs text-light-60">{new Date(app.createdAt).toLocaleDateString('ro-RO')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  app.status === 'APROBAT' ? 'bg-success-500/15 text-success-400' :
                  app.status === 'RESPINS' ? 'bg-error-500/15 text-error-400' :
                  'bg-warning-500/15 text-warning-400'
                }`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
