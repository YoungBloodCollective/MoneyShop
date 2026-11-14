import { useState } from 'react';
import { Download, Search, ChevronDown, Banknote, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type MonthlyReportItem, type ExportReportRequest } from '@/services/api/adminApi';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';
import { PageHeader, EmptyState } from './crmShared';
import { creditTypeLabel } from './crmHelpers';

const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const escapeCsvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const FIELD = 'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 focus:border-brand-primary focus:outline-none';
const LABEL = 'mb-1.5 block text-xs text-slate-500';

const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

export default function CrmRapoartePage() {
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
        toast.error('Nu există date pentru export');
        return;
      }

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
        ...rows.map(row => row.map(escapeCsvCell).join(',')),
      ].join('\n');

      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport_${MONTHS[month - 1]}_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Export finalizat: ${data.length} înregistrări`);
    } catch {
      toast.error('Eroare la exportul raportului');
    } finally {
      setExporting(false);
    }
  };

  const totalAprobat = reportData.reduce((sum, r) => sum + (r.sumaAprobata || 0), 0);
  const totalComision = reportData.reduce((sum, r) => sum + (r.comision || 0), 0);
  const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapoarte"
        subtitle="Generează și exportă rapoarte lunare"
        action={reportData.length > 0 ? (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download size={16} /> {exporting ? 'Se exportă...' : 'Exportă CSV'}
          </button>
        ) : undefined}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Filtre raport</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="relative">
            <label className={LABEL}>Luna</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={FIELD}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute bottom-3.5 right-3 text-slate-400" />
          </div>
          <div className="relative">
            <label className={LABEL}>An</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={FIELD}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute bottom-3.5 right-3 text-slate-400" />
          </div>
          <div>
            <label className={LABEL}>Banca</label>
            <input
              type="text"
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              placeholder="Nume bancă..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div className="relative">
            <label className={LABEL}>Tip credit</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={FIELD}>
              <option value="">Toate</option>
              <option value="ipotecar">Ipotecar</option>
              <option value="nevoi_personale">Nevoi personale</option>
              <option value="refinantare">Refinanțare</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute bottom-3.5 right-3 text-slate-400" />
          </div>
          <div className="relative">
            <label className={LABEL}>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={FIELD}>
              <option value="">Toate</option>
              {STATUS_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute bottom-3.5 right-3 text-slate-400" />
          </div>
        </div>
        <button
          onClick={loadReport}
          disabled={loading}
          className="mt-4 flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Search size={16} /> {loading ? 'Se generează...' : 'Generează raport'}
        </button>
      </div>

      {hasSearched && !loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-primary" />
              <span className="text-xs uppercase tracking-wider text-slate-500">Total aplicații</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{reportData.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Banknote size={18} className="text-emerald-600" />
              <span className="text-xs uppercase tracking-wider text-slate-500">Total aprobat</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{fmt(totalAprobat)} <span className="text-sm font-normal text-slate-500">RON</span></p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Banknote size={18} className="text-amber-600" />
              <span className="text-xs uppercase tracking-wider text-slate-500">Total comision</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{fmt(totalComision)} <span className="text-sm font-normal text-slate-500">RON</span></p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-primary border-t-transparent" />
        </div>
      ) : hasSearched && (
        reportData.length === 0 ? (
          <EmptyState message="Niciun rezultat pentru filtrele selectate" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Tip credit</th>
                  <th className="px-5 py-3 font-medium">Banca</th>
                  <th className="px-5 py-3 text-right font-medium">Suma aprobată</th>
                  <th className="px-5 py-3 text-right font-medium">Comision</th>
                  <th className="px-5 py-3 text-right font-medium">Data debursării</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(item => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-800">{item.clientName || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{item.typeCredit ? creditTypeLabel(item.typeCredit) : '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{item.bankName || '-'}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{item.sumaAprobata ? `${fmt(item.sumaAprobata)} RON` : '-'}</td>
                    <td className="px-5 py-3 text-right font-medium text-emerald-700">{item.comision ? `${fmt(item.comision)} RON` : '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{item.dataDisbursare ? new Date(item.dataDisbursare).toLocaleDateString('ro-RO') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
