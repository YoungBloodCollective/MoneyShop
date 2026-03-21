import { useState } from 'react';
import {
  BarChart3, Download, Search, ChevronDown,
  Banknote, FileText, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type MonthlyReportItem, type ExportReportRequest } from '@/services/api/adminApi';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';

const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function AdminReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [bankFilter, setBankFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reportData, setReportData] = useState<MonthlyReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await adminApi.getMonthlyReport({
        month,
        year,
        bankName: bankFilter || undefined,
        typeCredit: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setReportData(data);
    } catch {
      toast.error('Eroare la generarea raportului');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const request: ExportReportRequest = {
        startDate: new Date(year, month - 1, 1).toISOString(),
        endDate: new Date(year, month, 0).toISOString(),
        bankName: bankFilter || undefined,
        typeCredit: typeFilter || undefined,
      };
      const data = await adminApi.exportReport(request);

      if (data.length === 0) {
        toast.error('Nu exista date pentru export');
        return;
      }

      // Convert to CSV
      const headers = ['ID', 'Client', 'Tip Credit', 'Banca', 'Suma Aprobata', 'Comision', 'Data Disbursare'];
      const rows = data.map(item => [
        item.id,
        item.clientName || '',
        item.typeCredit || '',
        item.bankName || '',
        item.sumaAprobata ?? '',
        item.comision ?? '',
        item.dataDisbursare ? new Date(item.dataDisbursare).toLocaleDateString('ro-RO') : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport_${MONTHS[month - 1]}_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Export finalizat: ${data.length} inregistrari`);
    } catch {
      toast.error('Eroare la exportul raportului');
    } finally {
      setExporting(false);
    }
  };

  const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  const totalAprobat = reportData.reduce((sum, r) => sum + (r.sumaAprobata || 0), 0);
  const totalComision = reportData.reduce((sum, r) => sum + (r.comision || 0), 0);

  const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/15 flex items-center justify-center">
            <BarChart3 size={22} className="text-brand-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-light-100">Rapoarte</h1>
            <p className="text-light-60 text-sm">Genereaza si exporta rapoarte lunare</p>
          </div>
        </div>
        {reportData.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-secondary text-white text-sm font-medium hover:bg-brand-secondary/90 transition-all hover:shadow-lg hover:shadow-brand-secondary/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> {exporting ? 'Se exporta...' : 'Exporta CSV'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4">Filtre raport</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Month */}
          <div className="relative">
            <label className="block text-xs text-light-50 mb-1.5">Luna</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm appearance-none focus:border-brand-primary focus:outline-none transition-colors"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 bottom-3.5 text-light-50 pointer-events-none" />
          </div>

          {/* Year */}
          <div className="relative">
            <label className="block text-xs text-light-50 mb-1.5">An</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm appearance-none focus:border-brand-primary focus:outline-none transition-colors"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 bottom-3.5 text-light-50 pointer-events-none" />
          </div>

          {/* Bank */}
          <div>
            <label className="block text-xs text-light-50 mb-1.5">Banca</label>
            <input
              type="text"
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              placeholder="Nume banca..."
              className="w-full h-11 px-3 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Credit type */}
          <div className="relative">
            <label className="block text-xs text-light-50 mb-1.5">Tip credit</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm appearance-none focus:border-brand-primary focus:outline-none transition-colors"
            >
              <option value="">Toate</option>
              <option value="ipotecar">Ipotecar</option>
              <option value="nevoi_personale">Nevoi personale</option>
              <option value="refinantare">Refinantare</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 bottom-3.5 text-light-50 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <label className="block text-xs text-light-50 mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm appearance-none focus:border-brand-primary focus:outline-none transition-colors"
            >
              <option value="">Toate</option>
              {STATUS_OPTIONS.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 bottom-3.5 text-light-50 pointer-events-none" />
          </div>
        </div>

        <button
          onClick={loadReport}
          disabled={loading}
          className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search size={16} /> {loading ? 'Se genereaza...' : 'Genereaza raport'}
        </button>
      </div>

      {/* Summary stats */}
      {hasSearched && !loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-brand-primary" />
              <span className="text-xs text-light-60 uppercase tracking-wider">Total aplicatii</span>
            </div>
            <p className="text-2xl font-bold text-light-100">{reportData.length}</p>
          </div>
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={18} className="text-success-500" />
              <span className="text-xs text-light-60 uppercase tracking-wider">Total aprobat</span>
            </div>
            <p className="text-2xl font-bold text-light-100">{fmt(totalAprobat)} <span className="text-sm font-normal text-light-50">RON</span></p>
          </div>
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={18} className="text-brand-secondary" />
              <span className="text-xs text-light-60 uppercase tracking-wider">Total comision</span>
            </div>
            <p className="text-2xl font-bold text-light-100">{fmt(totalComision)} <span className="text-sm font-normal text-light-50">RON</span></p>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hasSearched && (
        reportData.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-light-50 mb-4" />
            <p className="text-light-60">Niciun rezultat pentru filtrele selectate</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-6 gap-4 px-5 py-2 text-xs text-light-50 uppercase tracking-wider">
              <span>Client</span>
              <span>Tip credit</span>
              <span>Banca</span>
              <span className="text-right">Suma aprobata</span>
              <span className="text-right">Comision</span>
              <span className="text-right">Data disbursare</span>
            </div>

            {reportData.map(item => (
              <div key={item.id} className="bg-dark-700 border border-dark-400 rounded-xl px-5 py-4">
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-6 gap-4 items-center">
                  <span className="text-sm font-medium text-light-90 truncate">{item.clientName || '-'}</span>
                  <span className="text-sm text-light-70">{item.typeCredit || '-'}</span>
                  <span className="text-sm text-light-70">{item.bankName || '-'}</span>
                  <span className="text-sm text-light-90 text-right font-medium">
                    {item.sumaAprobata ? `${fmt(item.sumaAprobata)} RON` : '-'}
                  </span>
                  <span className="text-sm text-brand-secondary text-right font-medium">
                    {item.comision ? `${fmt(item.comision)} RON` : '-'}
                  </span>
                  <span className="text-sm text-light-60 text-right">
                    {item.dataDisbursare ? new Date(item.dataDisbursare).toLocaleDateString('ro-RO') : '-'}
                  </span>
                </div>
                {/* Mobile */}
                <div className="sm:hidden space-y-1">
                  <p className="text-sm font-medium text-light-90">{item.clientName || '-'}</p>
                  <p className="text-xs text-light-60">
                    {item.typeCredit || '-'} &middot; {item.bankName || '-'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-light-90">{item.sumaAprobata ? `${fmt(item.sumaAprobata)} RON` : '-'}</span>
                    <span className="text-xs text-light-60">
                      {item.dataDisbursare ? new Date(item.dataDisbursare).toLocaleDateString('ro-RO') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
