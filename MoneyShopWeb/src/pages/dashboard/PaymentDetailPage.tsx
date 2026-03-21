import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bcReportApi, type BcReportSummaryDto } from '@/services/api/bcReportApi';
import { userFinancialDataApi, type UserFinancialData } from '@/services/api/userFinancialDataApi';

interface DisplayCredit {
  name: string;
  balance: number;
  monthlyPayment: number;
  hasArrears: boolean;
  source: 'bc' | 'manual';
}

function formatCreditName(accountType?: string, creditor?: string): string {
  const type = accountType || 'Credit';
  if (creditor && creditor.trim()) return `${type} — ${creditor}`;
  return type;
}

function SkeletonCard() {
  return (
    <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-500" />
          <div className="space-y-2">
            <div className="h-4 w-40 bg-dark-500 rounded" />
            <div className="h-3 w-24 bg-dark-500 rounded" />
          </div>
        </div>
        <div className="h-6 w-20 bg-dark-500 rounded" />
      </div>
    </div>
  );
}

export default function PaymentDetailPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<DisplayCredit[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);

  useEffect(() => {
    Promise.all([
      bcReportApi.getLatest().catch(() => null),
      userFinancialDataApi.getMyData().catch(() => null),
    ]).then(([bc, fin]) => {
      const bcData = bc && !('isEmpty' in bc) ? bc as BcReportSummaryDto : null;
      const activeAccounts = bcData?.parsedData?.accounts?.filter(a => a.isActive && a.currentBalance > 0 && a.creditor?.trim()) ?? [];

      if (activeAccounts.length > 0) {
        const bcBankInd = bcData?.parsedData?.bankingIndicators;
        const bcNonBankInd = bcData?.parsedData?.nonBankingIndicators;
        const bcTotal = (bcBankInd?.totalMonthlyPayment ?? 0) + (bcNonBankInd?.totalMonthlyPayment ?? 0);
        setTotalMonthly(bcTotal);
        setCredits(activeAccounts.map(a => ({
          name: formatCreditName(a.accountType, a.creditor),
          balance: a.currentBalance,
          monthlyPayment: 0,
          hasArrears: a.arrearsAmount > 0,
          source: 'bc' as const,
        })));
      } else if (fin && !fin.isEmpty && fin.credits?.length) {
        const manualCredits = fin.credits;
        setTotalMonthly(manualCredits.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0));
        setCredits(manualCredits.map(c => ({
          name: c.name || 'Credit',
          balance: c.remainingAmount,
          monthlyPayment: c.monthlyPayment,
          hasArrears: false,
          source: 'manual' as const,
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la dashboard
      </button>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-warning-500/15 flex items-center justify-center">
          <CalendarClock size={22} className="text-warning-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-light-100">Detalii plati lunare</h1>
          <p className="text-sm text-light-60">Breakdown-ul ratelor tale lunare</p>
        </div>
      </div>

      {loading ? (
        <>
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 animate-pulse">
            <div className="h-3 w-32 bg-dark-500 rounded mb-3" />
            <div className="h-8 w-40 bg-dark-500 rounded mb-2" />
            <div className="h-3 w-24 bg-dark-500 rounded" />
          </div>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </>
      ) : (
        <>
          <div className="bg-gradient-to-r from-warning-500/10 to-warning-500/5 border border-warning-500/20 rounded-2xl p-6">
            <p className="text-xs text-light-50 uppercase tracking-wider mb-1">Total rata lunara</p>
            <p className="text-3xl font-bold text-light-100">{fmt(totalMonthly)} <span className="text-base font-normal text-light-50">RON</span></p>
            <p className="text-sm text-light-60 mt-1">{credits.length} credit{credits.length !== 1 ? 'e' : ''} activ{credits.length !== 1 ? 'e' : ''}</p>
          </div>

          {credits.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-light-100">Credite active</h2>
              {credits.map((credit, i) => (
                <div key={i} className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-info-500/15 flex items-center justify-center">
                        <CreditCard size={18} className="text-info-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-100">{credit.name}</p>
                        <p className="text-xs text-light-50">Sold: {fmt(credit.balance)} RON</p>
                        {credit.hasArrears && (
                          <span className="text-[10px] text-error-400 font-medium">Cu intarzieri</span>
                        )}
                      </div>
                    </div>
                    {credit.monthlyPayment > 0 && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-light-100">{fmt(credit.monthlyPayment)} RON</p>
                        <p className="text-xs text-light-50">/luna</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
              <CalendarClock size={40} className="mx-auto text-light-50 mb-3 opacity-40" />
              <h2 className="text-lg font-semibold text-light-100 mb-1">Niciun credit inregistrat</h2>
              <p className="text-sm text-light-50">Incarca un Raport BC pentru a vedea creditele tale.</p>
              <button
                onClick={() => navigate('/profile/bc-report')}
                className="mt-4 px-5 py-2 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
              >
                Incarca Raport BC
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
