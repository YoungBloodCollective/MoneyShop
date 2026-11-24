import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { commissionApi, type CommissionReportFormat } from '@/services/api/commissionApi';
import { brokersApi, type BrokerAdminItem } from '@/services/api/brokersApi';
import { downloadBlob } from '@/lib/downloadBlob';
import { isAdminWorkspace } from '@/lib/crmPath';
import { currentMonth } from '@/pages/crm/bankStatsHelpers';
import { FIELD_FOCUS, FOCUS_RING } from '@/pages/crm/crmHelpers';

const FIELD = `h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 ${FIELD_FOCUS}`;
const LABEL = 'mb-1.5 block text-xs text-slate-500';
const BTN = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${FOCUS_RING}`;

/** Monthly commission report as PDF or Excel. A broker downloads their own; the Super Admin picks a broker. */
export function CommissionReportCard() {
  const { pathname } = useLocation();
  const admin = isAdminWorkspace(pathname);
  const [month, setMonth] = useState(currentMonth);
  const [brokers, setBrokers] = useState<BrokerAdminItem[]>([]);
  const [brokerId, setBrokerId] = useState('');
  const [busy, setBusy] = useState<CommissionReportFormat | null>(null);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    brokersApi.list()
      .then(list => { if (active) setBrokers(list); })
      .catch(() => { if (active) toast.error('Nu am putut încărca lista de brokeri'); });
    return () => { active = false; };
  }, [admin]);

  const download = async (format: CommissionReportFormat) => {
    if (!/^\d{4}-\d{2}$/.test(month)) { toast.error('Alege luna raportului.'); return; }
    if (admin && !brokerId) { toast.error('Alege brokerul pentru care generezi raportul.'); return; }
    setBusy(format);
    try {
      const { blob, fileName } = await commissionApi.downloadReport(month, format, admin ? Number(brokerId) : undefined);
      downloadBlob(blob, fileName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nu am putut genera raportul');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Raport lunar de comisioane</h2>
      <p className="mt-1 text-sm text-slate-500">
        Dosarele disbursate în luna aleasă, cu procentul aplicat și comisionul pentru fiecare, subtotaluri pe bancă și totaluri.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div>
          <label htmlFor="commission-report-month" className={LABEL}>Luna</label>
          <input id="commission-report-month" type="month" value={month} max={currentMonth()} onChange={e => setMonth(e.target.value)} className={FIELD} />
        </div>
        {admin && (
          <div>
            <label htmlFor="commission-report-broker" className={LABEL}>Broker</label>
            <select id="commission-report-broker" value={brokerId} onChange={e => setBrokerId(e.target.value)} className={FIELD}>
              <option value="">Alege brokerul</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.displayName}</option>)}
            </select>
          </div>
        )}
        <button type="button" onClick={() => download('pdf')} disabled={busy != null} className={`${BTN} bg-brand-primary text-white hover:opacity-90`}>
          {busy === 'pdf' ? <Download className="h-4 w-4 animate-pulse" /> : <FileText className="h-4 w-4" />} {busy === 'pdf' ? 'Se generează…' : 'Descarcă PDF'}
        </button>
        <button type="button" onClick={() => download('xlsx')} disabled={busy != null} className={`${BTN} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
          {busy === 'xlsx' ? <Download className="h-4 w-4 animate-pulse" /> : <FileSpreadsheet className="h-4 w-4" />} {busy === 'xlsx' ? 'Se generează…' : 'Descarcă Excel'}
        </button>
      </div>
    </section>
  );
}
