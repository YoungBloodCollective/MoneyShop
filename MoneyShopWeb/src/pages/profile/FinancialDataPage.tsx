import { useEffect, useState } from 'react';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userFinancialDataApi, type UserFinancialData } from '@/services/api/userFinancialDataApi';

export default function FinancialDataPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<UserFinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userFinancialDataApi.getMyData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v?: number) => v != null ? v.toLocaleString('ro-RO') + ' RON' : '-';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <h1 className="text-2xl font-bold text-light-100 flex items-center gap-2">
        <DollarSign size={24} className="text-brand-primary" /> Date financiare
      </h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 space-y-0">
          {[
            { label: 'Salariu net', value: fmt(data.salariuNet) },
            { label: 'Bonuri masa', value: data.bonuriMasa ? `Da - ${fmt(data.sumaBonuriMasa)}` : 'Nu' },
            { label: 'Venit total', value: fmt(data.venitTotal) },
            { label: 'Sold total datorii', value: fmt(data.soldTotal) },
            { label: 'Rata totala lunara', value: fmt(data.rataTotalaLunara) },
            { label: 'Nr. credite banci', value: data.nrCrediteBanci?.toString() || '-' },
            { label: 'Nr. IFN', value: data.nrIfn?.toString() || '-' },
            { label: 'Poprire', value: data.poprire ? 'Da' : 'Nu' },
            { label: 'Intarzieri', value: data.intarzieri ? `Da (${data.intarzieriNumar || 0})` : 'Nu' },
            { label: 'DTI', value: data.dti != null ? `${(data.dti * 100).toFixed(0)}%` : '-' },
            { label: 'Nivel scoring', value: data.scoringLevel || '-' },
            { label: 'Actualizat', value: data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString('ro-RO') : '-' },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-3 border-b border-dark-400 last:border-0">
              <span className="text-sm text-light-60">{item.label}</span>
              <span className="text-sm font-medium text-light-90">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-light-60">
          <p>Nu exista date financiare disponibile.</p>
          <p className="text-sm mt-1">Datele vor fi preluate automat dupa verificarea KYC.</p>
        </div>
      )}
    </div>
  );
}
