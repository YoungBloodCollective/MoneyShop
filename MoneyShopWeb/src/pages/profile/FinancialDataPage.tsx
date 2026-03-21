import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, DollarSign, Save, TrendingUp, Wallet, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userFinancialDataApi } from '@/services/api/userFinancialDataApi';

interface FormState {
  salariu1: string;
  salariu2: string;
  salariu3: string;
  bonuriMasa: boolean;
  sumaBonuriMasa: string;
}

export default function FinancialDataPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ficoScore, setFicoScore] = useState<number | undefined>();
  const [form, setForm] = useState<FormState>({
    salariu1: '', salariu2: '', salariu3: '',
    bonuriMasa: false, sumaBonuriMasa: '',
  });

  useEffect(() => {
    userFinancialDataApi.getMyData()
      .then((data) => {
        if (!data.isEmpty) {
          setForm({
            salariu1: data.salariu1?.toString() || '',
            salariu2: data.salariu2?.toString() || '',
            salariu3: data.salariu3?.toString() || '',
            bonuriMasa: data.bonuriMasa ?? false,
            sumaBonuriMasa: data.sumaBonuriMasa?.toString() || '',
          });
          if (data.ficoScore) setFicoScore(data.ficoScore);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgSalary = useMemo(() => {
    const vals = [form.salariu1, form.salariu2, form.salariu3]
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [form.salariu1, form.salariu2, form.salariu3]);

  const totalIncome = useMemo(() => {
    let total = avgSalary;
    if (form.bonuriMasa) total += parseFloat(form.sumaBonuriMasa) || 0;
    return total;
  }, [avgSalary, form.bonuriMasa, form.sumaBonuriMasa]);

  const salaryValues = useMemo(() => [
    parseFloat(form.salariu1) || 0,
    parseFloat(form.salariu2) || 0,
    parseFloat(form.salariu3) || 0,
  ], [form.salariu1, form.salariu2, form.salariu3]);

  const handleSave = async () => {
    if (!form.salariu1 && !form.salariu2 && !form.salariu3) {
      toast.error('Introdu cel putin un salariu');
      return;
    }
    setSaving(true);
    try {
      await userFinancialDataApi.saveMyData({
        salariu1: parseFloat(form.salariu1) || undefined,
        salariu2: parseFloat(form.salariu2) || undefined,
        salariu3: parseFloat(form.salariu3) || undefined,
        bonuriMasa: form.bonuriMasa,
        sumaBonuriMasa: form.bonuriMasa ? (parseFloat(form.sumaBonuriMasa) || undefined) : undefined,
        credits: [],
      });
      toast.success('Date financiare salvate cu succes!');
    } catch {
      toast.error('Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxSalary = Math.max(...salaryValues, 1);
  const hasSalaries = salaryValues.some(v => v > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <h1 className="text-xl font-bold text-light-100 flex items-center gap-2">
        <DollarSign size={22} className="text-brand-primary" /> Date financiare
      </h1>

      {/* FICO score banner */}
      {ficoScore && (
        <div className="flex items-center gap-4 bg-dark-700 border border-dark-400 rounded-xl px-5 py-3">
          <ShieldCheck size={20} className={ficoScore >= 700 ? 'text-success-500' : ficoScore >= 500 ? 'text-warning-500' : 'text-error-500'} />
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${ficoScore >= 700 ? 'text-success-500' : ficoScore >= 500 ? 'text-warning-500' : 'text-error-500'}`}>
              {ficoScore}
            </span>
            <span className="text-sm text-light-50">FICO — {ficoScore >= 700 ? 'Scor bun' : ficoScore >= 500 ? 'Scor mediu' : 'Scor scazut'}</span>
          </div>
        </div>
      )}

      {/* Salary inputs with inline mini bars */}
      <div className="bg-dark-700 border border-dark-400 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-brand-secondary" />
          <h2 className="text-sm font-semibold text-light-100">Ultimele 3 salarii nete</h2>
        </div>

        <div className="space-y-2.5">
          {(['salariu1', 'salariu2', 'salariu3'] as const).map((key, i) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-light-50 w-12 shrink-0">Luna {i + 1}</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="0"
                  className="w-full h-9 px-3 pr-12 rounded-lg bg-dark-600 border border-dark-400 text-sm text-light-90 placeholder:text-light-40 focus:border-brand-primary focus:outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-40">RON</span>
              </div>
              {hasSalaries && (
                <div className="w-24 h-2 bg-dark-500 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all"
                    style={{ width: `${(salaryValues[i] / maxSalary) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dark-500">
          <label className="relative inline-flex items-center cursor-pointer" aria-label="Bonuri de masa">
            <input
              type="checkbox"
              checked={form.bonuriMasa}
              onChange={e => setForm(f => ({ ...f, bonuriMasa: e.target.checked }))}
              className="sr-only peer"
              aria-label="Activare bonuri de masa"
            />
            <div className="w-9 h-5 bg-dark-500 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-light-60 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white" />
          </label>
          <span className="text-sm text-light-70">Bonuri de masa</span>
          {form.bonuriMasa && (
            <div className="relative ml-auto">
              <input
                type="number"
                value={form.sumaBonuriMasa}
                onChange={e => setForm(f => ({ ...f, sumaBonuriMasa: e.target.value }))}
                placeholder="Suma"
                className="w-28 h-9 px-3 pr-12 rounded-lg bg-dark-600 border border-dark-400 text-sm text-light-90 placeholder:text-light-40 focus:border-brand-primary focus:outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-light-40">RON</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {avgSalary > 0 && (
        <div className="bg-dark-700 border border-dark-400 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-brand-secondary" />
            <h2 className="text-sm font-semibold text-light-100">Sumar</h2>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-light-50">Salariu mediu net</p>
                  <p className="text-lg font-semibold text-light-90">{fmt(avgSalary)} RON</p>
                </div>
                {form.bonuriMasa && (
                  <div>
                    <p className="text-xs text-light-50">Bonuri masa</p>
                    <p className="text-lg font-semibold text-light-90">+{fmt(parseFloat(form.sumaBonuriMasa) || 0)} RON</p>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-light-50">Venit total eligibil</p>
              <p className="text-2xl font-bold text-brand-primary">{fmt(totalIncome)} RON</p>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-11 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25 flex items-center justify-center gap-2"
      >
        <Save size={18} />
        {saving ? 'Se salveaza...' : 'Salveaza datele financiare'}
      </button>
    </div>
  );
}
