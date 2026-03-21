import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bcReportApi, type BcReportSummaryDto } from '@/services/api/bcReportApi';
import { userFinancialDataApi } from '@/services/api/userFinancialDataApi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444'];

interface DisplayCredit {
  name: string;
  balance: number;
  monthlyPayment: number;
  hasArrears: boolean;
}

function formatCreditName(accountType?: string, creditor?: string): string {
  const type = accountType || 'Credit';
  if (creditor && creditor.trim()) return `${type} — ${creditor}`;
  return type;
}

export default function CreditsDetailPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<DisplayCredit[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [dti, setDti] = useState(0);

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
        const bcOwed = (bcBankInd?.totalAmountOwed ?? 0) + (bcNonBankInd?.totalAmountOwed ?? 0);
        const bcMonthly = (bcBankInd?.totalMonthlyPayment ?? 0) + (bcNonBankInd?.totalMonthlyPayment ?? 0);
        setTotalDebt(bcOwed);
        setTotalMonthly(bcMonthly);
        if (fin && !fin.isEmpty && fin.venitTotal && fin.venitTotal > 0) {
          setDti(bcMonthly / fin.venitTotal);
        }
        setCredits(activeAccounts.map(a => ({
          name: formatCreditName(a.accountType, a.creditor),
          balance: a.currentBalance,
          monthlyPayment: 0,
          hasArrears: a.arrearsAmount > 0,
        })));
      } else if (fin && !fin.isEmpty) {
        const manualCredits = fin.credits ?? [];
        setTotalDebt(manualCredits.reduce((s, c) => s + (c.remainingAmount || 0), 0));
        setTotalMonthly(fin.rataTotalaLunara ?? manualCredits.reduce((s, c) => s + (c.monthlyPayment || 0), 0));
        setDti(fin.dti ?? 0);
        setCredits(manualCredits.map(c => ({
          name: c.name || 'Credit',
          balance: c.remainingAmount,
          monthlyPayment: c.monthlyPayment,
          hasArrears: false,
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });
  const dtiColor = dti <= 0.3 ? 'text-success-500' : dti <= 0.5 ? 'text-warning-500' : 'text-error-500';
  const dtiLabel = dti <= 0.3 ? 'Excelent' : dti <= 0.4 ? 'Bun' : dti <= 0.5 ? 'Acceptabil' : 'Risc ridicat';

  const pieData = credits
    .filter(c => c.balance > 0)
    .map(c => ({ name: c.name, value: c.balance }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-36 bg-dark-500 rounded animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-dark-500 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-dark-500 rounded animate-pulse" />
            <div className="h-4 w-56 bg-dark-500 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 animate-pulse">
            <div className="h-3 w-32 bg-dark-500 rounded mb-3" />
            <div className="h-7 w-36 bg-dark-500 rounded mb-2" />
            <div className="h-3 w-24 bg-dark-500 rounded" />
          </div>
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5 animate-pulse">
            <div className="h-3 w-32 bg-dark-500 rounded mb-3" />
            <div className="h-7 w-20 bg-dark-500 rounded mb-2" />
            <div className="h-3 w-24 bg-dark-500 rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-dark-700 border border-dark-400 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-dark-500" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-40 bg-dark-500 rounded" />
                  <div className="h-3 w-20 bg-dark-500 rounded" />
                </div>
              </div>
              <div className="h-4 w-28 bg-dark-500 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la dashboard
      </button>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-info-500/15 flex items-center justify-center">
          <CreditCard size={22} className="text-info-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-light-100">Detalii credite</h1>
          <p className="text-sm text-light-60">Situatia completa a creditelor tale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <p className="text-xs text-light-50 uppercase tracking-wider mb-1">Total datorie ramasa</p>
          <p className="text-2xl font-bold text-light-100">{fmt(totalDebt)} <span className="text-sm font-normal text-light-50">RON</span></p>
          <p className="text-xs text-light-50 mt-1">{credits.length} credit{credits.length !== 1 ? 'e' : ''} activ{credits.length !== 1 ? 'e' : ''}</p>
        </div>
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className={dtiColor} />
            <p className="text-xs text-light-50 uppercase tracking-wider">Grad indatorare (DTI)</p>
          </div>
          <p className={`text-2xl font-bold ${dtiColor}`}>{Math.round(dti * 100)}%</p>
          <p className="text-xs text-light-50 mt-1">{dtiLabel}</p>
          <div className="w-full h-2 bg-dark-500 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${dti <= 0.3 ? 'bg-success-500' : dti <= 0.5 ? 'bg-warning-500' : 'bg-error-500'}`}
              style={{ width: `${Math.min(dti * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {pieData.length > 0 && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-light-100 mb-4">Distributie sold credite</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: 13 }}
                  formatter={(value) => [`${fmt(value as number)} RON`, 'Sold ramas']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-light-60">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {credits.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-light-100">Toate creditele</h2>
          {credits.map((credit, i) => (
            <div key={i} className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}>
                  <CreditCard size={18} style={{ color: COLORS[i % COLORS.length] }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-light-100">{credit.name}</p>
                  {credit.hasArrears && <span className="text-[10px] text-error-400 font-medium">Cu intarzieri</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-light-50">Sold ramas</p>
                  <p className="text-sm font-semibold text-light-100">{fmt(credit.balance)} RON</p>
                </div>
                {credit.monthlyPayment > 0 && (
                  <div>
                    <p className="text-xs text-light-50">Rata lunara</p>
                    <p className="text-sm font-semibold text-light-100">{fmt(credit.monthlyPayment)} RON</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
          <CreditCard size={40} className="mx-auto text-light-50 mb-3 opacity-40" />
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

      {credits.length > 0 && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-light-100 mb-3">Sumar total</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-light-60">Total datorie ramasa</span>
              <span className="font-medium text-light-100">{fmt(totalDebt)} RON</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-light-60">Total rate lunare</span>
              <span className="font-medium text-light-100">{fmt(totalMonthly)} RON</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-dark-400">
              <span className="text-light-60">Grad indatorare</span>
              <span className={`font-bold ${dtiColor}`}>{(dti * 100).toFixed(1)}% — {dtiLabel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
