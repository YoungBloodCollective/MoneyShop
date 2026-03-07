import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, PiggyBank } from 'lucide-react';

const options = [
  { icon: Calculator, title: 'Credit nevoi personale', desc: 'Calculeaza rata pentru un credit de consum', type: 'NP' },
  { icon: TrendingUp, title: 'Credit ipotecar', desc: 'Simuleaza un credit pentru achizitia unei locuinte', type: 'IPOTECAR' },
  { icon: PiggyBank, title: 'Refinantare', desc: 'Vezi daca poti obtine o rata mai buna', type: 'REFINANTARE' },
];

export default function SimulatorPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-light-100">Simulator credit</h1>
        <p className="text-light-60 mt-1">Alege tipul de credit si afla in 2 minute cat poti imprumuta</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {options.map(opt => (
          <button
            key={opt.type}
            onClick={() => navigate('/simulator/form', { state: { loanType: opt.type } })}
            className="bg-dark-700 border border-dark-400 rounded-2xl p-6 text-left hover:border-brand-primary/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-primary/15 flex items-center justify-center text-brand-primary mb-4">
              <opt.icon size={24} />
            </div>
            <h3 className="text-lg font-semibold text-light-100 mb-1">{opt.title}</h3>
            <p className="text-sm text-light-60">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
