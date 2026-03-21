import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Wallet, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userFinancialDataApi, type UserFinancialData } from '@/services/api/userFinancialDataApi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function SalaryDetailPage() {
  const navigate = useNavigate();
  const [financial, setFinancial] = useState<UserFinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userFinancialDataApi.getMyData()
      .then(setFinancial)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  const salaryData = useMemo(() => {
    if (!financial) return [];
    const months = ['Luna 1', 'Luna 2', 'Luna 3'];
    const values = [financial.salariu1, financial.salariu2, financial.salariu3];
    return months.map((m, i) => ({ name: m, salariu: values[i] ?? 0 }));
  }, [financial]);

  const avgSalary = useMemo(() => {
    const vals = salaryData.map(d => d.salariu).filter(v => v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [salaryData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la dashboard
      </button>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-primary/15 flex items-center justify-center">
          <Wallet size={22} className="text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-light-100">Detalii salariu</h1>
          <p className="text-sm text-light-60">Evolutia salariului net pe ultimele 3 luni</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-brand-primary" />
            <p className="text-xs text-light-50 uppercase tracking-wider">Salariu mediu net</p>
          </div>
          <p className="text-xl font-bold text-light-100">{fmt(avgSalary)} RON</p>
        </div>

        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-success-500" />
            <p className="text-xs text-light-50 uppercase tracking-wider">Venit total</p>
          </div>
          <p className="text-xl font-bold text-light-100">{fmt(financial?.venitTotal || avgSalary)} RON</p>
        </div>

        {financial?.bonuriMasa && (
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed size={16} className="text-warning-500" />
              <p className="text-xs text-light-50 uppercase tracking-wider">Bonuri masa</p>
            </div>
            <p className="text-xl font-bold text-light-100">{fmt(financial?.sumaBonuriMasa)} RON</p>
          </div>
        )}
      </div>

      {/* Salary chart */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-light-100 mb-4">Evolutie salariu net</h2>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salaryData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: 13,
                }}
                formatter={(value) => [`${fmt(value as number)} RON`, 'Salariu']}
              />
              <ReferenceLine y={avgSalary} stroke="#6366f1" strokeDasharray="3 3" label={{ value: 'Medie', fill: '#6366f1', fontSize: 11 }} />
              <Bar dataKey="salariu" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Salary detail table */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-light-100 mb-4">Detalii pe luni</h2>
        <div className="space-y-3">
          {salaryData.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-dark-400 last:border-0">
              <span className="text-sm text-light-70">{d.name}</span>
              <span className="text-sm font-medium text-light-100">{fmt(d.salariu)} RON</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-semibold text-light-90">Media</span>
            <span className="text-sm font-bold text-brand-primary">{fmt(avgSalary)} RON</span>
          </div>
        </div>
      </div>
    </div>
  );
}
