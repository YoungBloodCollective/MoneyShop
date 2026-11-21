import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  PieChart, Pie, Cell,
} from 'recharts';
import { Calculator, Info } from 'lucide-react';
import { DEFAULT_CONFIG } from '@/lib/eligibility/config';
import { calculateMaxLoanAmount } from '@/lib/eligibility/formulas';
import type { CrmBcReportSnapshot, CrmIncomeSnapshot } from '@/types/crm.types';
import { money } from '@/pages/crm/crmHelpers';

const COLORS = { income: '#2D2DF0', bank: '#6E4CE5', ifn: '#F59E0B', free: '#10B981' };
const pct = (v: number) => `${(v * 100).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%`;

/**
 * Indicative analysis from what the broker entered: ANAF income and the BC report. Shows the
 * monthly income, how much of it goes to existing instalments (banks vs IFN), the debt-to-income
 * ratio against the 40% / 50% thresholds and the instalment still available. Not a credit offer.
 */
export function FinancialAnalysisCard({ income, bc }: {
  income?: CrmIncomeSnapshot | null;
  bc?: CrmBcReportSnapshot | null;
}) {
  const venit = income?.venitTotal ?? 0;
  const bank = bc ? bc.bankMonthlyPayment : 0;
  const ifn = bc ? bc.nonBankMonthlyPayment : 0;
  const obligatii = bc ? (bank + ifn > 0 ? bank + ifn : bc.existingMonthlyObligations ?? 0) : income?.rataTotalaLunara ?? 0;

  const { dtiStandard, dtiHigh, aprMax, maxTermMonths } = DEFAULT_CONFIG.np;
  const dti = venit > 0 ? obligatii / venit : null;
  const rataDisponibila = Math.max(0, venit * dtiStandard - obligatii);
  const sumaOrientativa = rataDisponibila > 0 ? Math.floor(calculateMaxLoanAmount(rataDisponibila, aprMax, maxTermMonths) / 100) * 100 : 0;

  const missing = [!income?.venitTotal && 'venitul din ANAF', !bc && 'raportul BC'].filter(Boolean) as string[];

  const months = [
    { name: 'Luna 3', value: income?.salariu3 ?? 0 },
    { name: 'Luna 2', value: income?.salariu2 ?? 0 },
    { name: 'Luna 1', value: income?.salariu1 ?? 0 },
  ].filter(m => m.value > 0);

  const split = [
    { name: 'Rate bănci', value: bank, color: COLORS.bank },
    { name: 'Rate IFN', value: ifn, color: COLORS.ifn },
    { name: 'Rămâne disponibil', value: Math.max(0, venit - obligatii), color: COLORS.free },
  ].filter(s => s.value > 0);
  if (bc && bank + ifn === 0 && obligatii > 0) split.unshift({ name: 'Rate existente', value: obligatii, color: COLORS.bank });

  const dtiTone = dti == null ? 'text-slate-400' : dti <= dtiStandard ? 'text-emerald-600' : dti <= dtiHigh ? 'text-amber-600' : 'text-rose-600';
  const barMax = Math.max(dtiHigh * 1.4, (dti ?? 0) * 1.1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-brand-primary" />
        <h2 className="text-sm font-semibold text-slate-800">Analiză financiară</h2>
      </div>

      {venit <= 0 ? (
        <p className="py-2 text-sm text-slate-400">
          Completează venitul din ANAF{!bc ? ' și încarcă raportul BC' : ''} ca să vezi analiza (venit, rate, grad de îndatorare).
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Venit lunar" value={money(Math.round(venit))} />
            <Stat label="Rate existente" value={money(Math.round(obligatii))} />
            <Stat label="Grad de îndatorare" value={dti == null ? '—' : pct(dti)} tone={dtiTone} />
            <Stat label={`Rată disponibilă (${pct(dtiStandard)})`} value={money(Math.round(rataDisponibila))} />
          </div>

          {dti != null && (
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                <span>Grad de îndatorare</span>
                <span>prag {pct(dtiStandard)} · maxim {pct(dtiHigh)}</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Grad de îndatorare ${pct(dti)}`}>
                <div
                  className={`h-full rounded-full ${dti <= dtiStandard ? 'bg-emerald-500' : dti <= dtiHigh ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, (dti / barMax) * 100)}%` }}
                />
                <span className="absolute inset-y-0 w-px bg-slate-500/60" style={{ left: `${(dtiStandard / barMax) * 100}%` }} />
                <span className="absolute inset-y-0 w-px bg-slate-500/60" style={{ left: `${(dtiHigh / barMax) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Venit net pe ultimele luni (ANAF)</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={v => money(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    {income?.salariuNet ? <ReferenceLine y={income.salariuNet} stroke="#94A3B8" strokeDasharray="4 4" /> : null}
                    <Bar dataKey="value" name="Venit net" fill={COLORS.income} radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Cum se împarte venitul lunar</p>
              <div className="flex h-44 items-center gap-3">
                <div className="h-full w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={split} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2} stroke="none">
                        {split.map(s => <Cell key={s.name} fill={s.color} />)}
                      </Pie>
                      <Tooltip formatter={v => money(Math.round(Number(v)))} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {split.map(s => (
                    <li key={s.name} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="text-slate-600">{s.name}</span>
                      <span className="font-semibold text-slate-800">{money(Math.round(s.value))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {sumaOrientativa > 0 && (
            <p className="rounded-xl bg-brand-primary/5 px-3 py-2 text-sm text-slate-700">
              Credit de nevoi personale orientativ: până la <strong>{money(sumaOrientativa)}</strong> pe {maxTermMonths} de luni,
              calculat la DAE maximă de {aprMax.toLocaleString('ro-RO')}% și rata disponibilă de mai sus.
            </p>
          )}

          <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
            <Info className="mt-px h-3 w-3 shrink-0" />
            Analiză orientativă din datele introduse, fără garanție de aprobare. Decizia și condițiile finale aparțin băncii.
            {missing.length > 0 && ` Lipsește ${missing.join(' și ')}.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-base font-semibold ${tone ?? 'text-slate-900'}`}>{value}</div>
    </div>
  );
}
