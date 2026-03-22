import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Upload, FileText, AlertTriangle, CheckCircle, XCircle, TrendingDown, Building2, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { bcReportApi, type BcReportUploadResult, type BcReportSummaryDto, type BcParsedData, type BcAccountSummary } from '@/services/api/bcReportApi';

type ReportData = BcReportUploadResult | (BcReportSummaryDto & { isEmpty?: false });

export default function BcReportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    bcReportApi.getLatest()
      .then((data) => {
        if (!('isEmpty' in data && data.isEmpty)) {
          setReport(data as BcReportSummaryDto);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Doar fisiere PDF sunt acceptate');
      return;
    }

    setUploading(true);
    try {
      const result = await bcReportApi.upload(file);
      setReport(result);
      toast.success('Raport BC incarcat si analizat cu succes');
    } catch {
      toast.error('Eroare la incarcarea raportului');
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const parsedData: BcParsedData | undefined = report
    ? ('parsedData' in report ? report.parsedData : undefined)
    : undefined;

  const ficoScore = parsedData?.ficoScore
    ?? (report && 'ficoScore' in report ? report.ficoScore : undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-800 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile')} aria-label="Inapoi la profil" className="p-2 rounded-xl bg-dark-700 hover:bg-dark-600 transition-colors">
            <ArrowLeft className="w-5 h-5 text-light-50" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-light-100">Raport Birou de Credit</h1>
            <p className="text-sm text-light-50">Incarca raportul BC pentru analiza automata</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-brand-primary bg-brand-primary/10'
              : 'border-dark-500 bg-dark-700 hover:border-dark-400'
          }`}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={onFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-light-60">Se analizeaza raportul...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-light-50" />
              <p className="text-light-60">Trage raportul PDF aici sau click pentru a selecta</p>
              <p className="text-xs text-light-40">Doar fisiere PDF, max 30MB</p>
            </div>
          )}
        </div>

        {/* Report exists info */}
        {report && 'fileName' in report && report.fileName && (
          <div className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-xl">
            <FileText className="w-4 h-4 text-light-50" />
            <span className="text-sm text-light-80">{report.fileName}</span>
            {'createdAt' in report && (
              <span className="text-xs text-light-40 ml-auto">
                {new Date(report.createdAt).toLocaleDateString('ro-RO')}
              </span>
            )}
          </div>
        )}

        {/* Parse Warnings */}
        {'parseWarnings' in (report || {}) && (report as BcReportUploadResult)?.parseWarnings?.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-500">Avertismente parsare</span>
            </div>
            <ul className="space-y-1">
              {(report as BcReportUploadResult).parseWarnings.map((w, i) => (
                <li key={i} className="text-xs text-yellow-400/80">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Results */}
        {report && (
          <>
            {/* FICO Score */}
            <FicoScoreCard score={ficoScore} explanations={parsedData?.ficoExplanationCodes} nrIfn={parsedData?.nonBankingIndicators?.totalAccounts} />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                label="Total conturi"
                value={parsedData?.accounts?.filter(a => a.creditor).length ?? 0}
                icon={<FileText className="w-4 h-4" />}
              />
              <SummaryCard
                label="Conturi active"
                value={parsedData?.accounts?.filter(a => a.creditor && a.currentBalance > 0 && a.arrearsAmount === 0).length ?? 0}
                icon={<CheckCircle className="w-4 h-4" />}
                color="text-success-400"
              />
              <SummaryCard
                label="Cu intarzieri"
                value={parsedData?.accounts?.filter(a => a.creditor && a.arrearsAmount > 0).length ?? 0}
                icon={<XCircle className="w-4 h-4" />}
                color="text-error-400"
              />
              <SummaryCard
                label="Obligatii lunare"
                value={formatCurrency('totalMonthlyObligations' in report ? report.totalMonthlyObligations : (report as BcReportSummaryDto)?.existingMonthlyObligations ?? 0)}
                icon={<TrendingDown className="w-4 h-4" />}
              />
            </div>

            {/* Banking vs Non-Banking Indicators */}
            {parsedData && (
              <div className="grid md:grid-cols-2 gap-4">
                {parsedData.bankingIndicators && (
                  <IndicatorsCard
                    title="Indicatori Bancari"
                    icon={<Landmark className="w-4 h-4" />}
                    indicators={parsedData.bankingIndicators}
                  />
                )}
                {parsedData.nonBankingIndicators && (
                  <IndicatorsCard
                    title="Indicatori Non-Bancari (IFN)"
                    icon={<Building2 className="w-4 h-4" />}
                    indicators={parsedData.nonBankingIndicators}
                  />
                )}
              </div>
            )}

            {/* Accounts Table */}
            {parsedData && parsedData.accounts.length > 0 && (
              <AccountsTable accounts={parsedData.accounts} />
            )}

            {/* Inquiries */}
            {parsedData && parsedData.inquiries.length > 0 && (
              <InquiriesSection inquiries={parsedData.inquiries} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function FicoScoreCard({ score, explanations, nrIfn }: { score?: number; explanations?: string[]; nrIfn?: number }) {
  if (!score) return null;

  const displayScore = score < 581 ? 581 : score;
  const showAsterisk = score >= 500 && score <= 580 && (nrIfn ?? 0) <= 10;

  const getColor = (s: number) => {
    if (s >= 700) return 'text-success-400';
    if (s >= 550) return 'text-warning-400';
    return 'text-error-400';
  };

  const getBgColor = (s: number) => {
    if (s >= 700) return 'bg-success-500/10 border-success-500/30';
    if (s >= 550) return 'bg-warning-500/10 border-warning-500/30';
    return 'bg-error-500/10 border-error-500/30';
  };

  const getLabel = (s: number) => {
    if (s >= 750) return 'Excelent';
    if (s >= 700) return 'Foarte bun';
    if (s >= 650) return 'Bun';
    if (s >= 550) return 'Mediu';
    if (s >= 450) return 'Scazut';
    return 'Foarte scazut';
  };

  const percentage = ((displayScore - 300) / (850 - 300)) * 100;

  return (
    <div className={`rounded-2xl border p-6 ${getBgColor(displayScore)}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-light-50 mb-1">FICO Score</p>
          <p className={`text-4xl font-bold ${getColor(displayScore)}`}>{displayScore}{showAsterisk && '*'}</p>
          <p className={`text-sm font-medium mt-1 ${getColor(displayScore)}`}>{getLabel(displayScore)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-light-40">Interval: 300 - 850</p>
        </div>
      </div>
      <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            displayScore >= 700 ? 'bg-success-400' : displayScore >= 550 ? 'bg-warning-400' : 'bg-error-400'
          }`}
          style={{ width: `${Math.max(2, percentage)}%` }}
        />
      </div>
      {showAsterisk && (
        <p className="text-xs text-light-50 mb-3">* Scor FICO sub limita standard. Eligibil cu conditii speciale daca nu exista mai mult de 10 credite non-bancare.</p>
      )}
      {explanations && explanations.length > 0 && (
        <div className="space-y-1 pt-3 border-t border-white/10">
          <p className="text-xs text-light-40 mb-2">Factori care influenteaza scorul:</p>
          {explanations.map((code, i) => (
            <p key={i} className="text-xs text-light-50">• {code}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="bg-dark-700 rounded-xl p-4 border border-dark-600">
      <div className={`flex items-center gap-2 mb-2 ${color || 'text-light-50'}`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color || 'text-light-100'}`}>{value}</p>
    </div>
  );
}

function IndicatorsCard({ title, icon, indicators }: { title: string; icon: React.ReactNode; indicators: { accountsInfo?: string; totalAccounts: number; accountsWithArrears: number; totalMonthlyPayment: number; totalAmountOwed: number; totalArrears: number; maxCurrentDelay?: string; contractsLast24Months: number; closedLast24Months: number } }) {
  return (
    <div className="bg-dark-700 rounded-xl p-4 border border-dark-600">
      <div className="flex items-center gap-2 mb-3 text-light-80">
        {icon}
        <span className="text-sm font-medium">{title}</span>
        {indicators.accountsInfo && (
          <span className="ml-auto text-xs bg-dark-600 px-2 py-0.5 rounded-full text-light-50">
            {indicators.accountsInfo}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Conturi totale" value={indicators.totalAccounts} />
        <Stat label="Cu restante" value={indicators.accountsWithArrears} color={indicators.accountsWithArrears > 0 ? 'text-error-400' : undefined} />
        <Stat label="Plata lunara" value={formatCurrency(indicators.totalMonthlyPayment)} />
        <Stat label="Total datorat" value={formatCurrency(indicators.totalAmountOwed)} />
        <Stat label="Total restante" value={formatCurrency(indicators.totalArrears)} color={indicators.totalArrears > 0 ? 'text-error-400' : undefined} />
        <Stat label="Intarziere max" value={indicators.maxCurrentDelay || '0 zile'} color={indicators.maxCurrentDelay?.includes('0 zile') ? undefined : 'text-error-400'} />
        <Stat label="Contracte 24 luni" value={indicators.contractsLast24Months} />
        <Stat label="Inchise 24 luni" value={indicators.closedLast24Months} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className="text-xs text-light-40">{label}</p>
      <p className={`font-medium ${color || 'text-light-80'}`}>{value}</p>
    </div>
  );
}

function AccountsTable({ accounts }: { accounts: BcAccountSummary[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'arrears'>('all');

  const filtered = accounts
    .filter(a => a.creditor)
    .filter(a => {
      if (filter === 'active') return a.isActive;
      if (filter === 'arrears') return a.arrearsAmount > 0;
      return true;
    });

  return (
    <div className="bg-dark-700 rounded-xl border border-dark-600 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-dark-600">
        <h3 className="text-sm font-medium text-light-100">Conturi ({filtered.length})</h3>
        <div className="flex gap-1">
          {(['all', 'active', 'arrears'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-brand-primary text-white' : 'bg-dark-600 text-light-50 hover:bg-dark-500'
              }`}
            >
              {f === 'all' ? 'Toate' : f === 'active' ? 'Active' : 'Cu restante'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600 text-light-40 text-xs">
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Tip</th>
              <th className="text-left p-3">Creditor</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Acordat</th>
              <th className="text-right p-3">Datorat</th>
              <th className="text-right p-3">Restanta</th>
              <th className="text-right p-3">Zile</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((account) => (
              <tr key={account.accountIndex} className="border-b border-dark-600/50 hover:bg-dark-600/30">
                <td className="p-3 text-light-50">{account.accountIndex}</td>
                <td className="p-3 text-light-80 max-w-[150px] truncate" title={account.accountType || '-'}>{account.accountType || '-'}</td>
                <td className="p-3 text-light-80 max-w-[150px] truncate" title={account.creditor || '-'}>{account.creditor || '-'}</td>
                <td className="p-3">
                  <StatusBadge currentBalance={account.currentBalance} arrearsAmount={account.arrearsAmount} />
                </td>
                <td className="p-3 text-right text-light-80">{formatCurrency(account.creditLimit)}</td>
                <td className="p-3 text-right text-light-80">{formatCurrency(account.currentBalance)}</td>
                <td className={`p-3 text-right ${account.arrearsAmount > 0 ? 'text-error-400 font-medium' : 'text-light-80'}`}>
                  {formatCurrency(account.arrearsAmount)}
                </td>
                <td className={`p-3 text-right ${account.daysOverdue > 0 ? 'text-error-400 font-medium' : 'text-light-50'}`}>
                  {account.daysOverdue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InquiriesSection({ inquiries }: { inquiries: { date?: string; institution?: string; purpose?: string }[] }) {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const countInRange = (start: Date) => inquiries.filter(inq => {
    if (!inq.date) return false;
    const d = new Date(inq.date);
    return d >= start && d <= now;
  }).length;
  const last3m = countInRange(threeMonthsAgo);
  const last6m = countInRange(sixMonthsAgo);
  const showWarning = last3m > 4 || last6m > 7;
  return (
    <div className="bg-dark-700 rounded-xl border border-dark-600 overflow-hidden">
      <div className="p-4 border-b border-dark-600">
        <h3 className="text-sm font-medium text-light-100">Interogarile din ultimele 12 luni ({inquiries.length})</h3>
      </div>
      {showWarning && (
        <div className="mx-4 mt-4 px-4 py-3 bg-error-500/15 border border-error-500/40 rounded-xl">
          <p className="text-sm font-semibold text-error-400">&#9888;&#65039; POSIBIL RISC LA APLICATIILE DE CREDIT</p>
        </div>
      )}
      <div className="divide-y divide-dark-600/50">
        {inquiries.map((inq, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-dark-600/30">
            <div>
              <p className="text-sm text-light-80">{inq.institution || '-'}</p>
              {inq.purpose && <p className="text-xs text-light-50">{inq.purpose}</p>}
            </div>
            <span className="text-xs text-light-40">{inq.date || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ currentBalance, arrearsAmount }: { currentBalance: number; arrearsAmount: number }) {
  if (currentBalance === 0) {
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-dark-500/20 text-light-50">Inchis</span>;
  }
  if (arrearsAmount > 0) {
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-error-500/20 text-error-400">Restant</span>;
  }
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-success-500/20 text-success-400">Activ</span>;
}

function formatCurrency(value: number): string {
  if (value === 0) return '0 RON';
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(value) + ' RON';
}
