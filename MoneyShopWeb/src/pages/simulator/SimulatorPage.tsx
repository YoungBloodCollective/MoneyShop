import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, PiggyBank, Sparkles } from 'lucide-react';

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
            className="group bg-dark-700 border border-dark-400 rounded-2xl p-6 text-left hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-primary/5 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-primary/15 flex items-center justify-center text-brand-primary mb-4 group-hover:bg-brand-primary/25 transition-colors">
              <opt.icon size={24} />
            </div>
            <h3 className="text-lg font-semibold text-light-100 mb-1">{opt.title}</h3>
            <p className="text-sm text-light-60">{opt.desc}</p>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/simulator/advanced')}
        className="w-full group bg-dark-700 border-2 border-dashed border-brand-primary/30 rounded-2xl p-6 text-left hover:border-brand-primary/60 hover:bg-brand-primary/5 transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={24} className="text-brand-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-light-100 mb-0.5">Calculator avansat</h3>
            <p className="text-sm text-light-60">Analiza personalizata cu datele tale reale — salariu, scor FICO si Raport BC</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-sm text-brand-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Incepe <span>&rarr;</span>
          </div>
        </div>
      </button>
    </div>
  );
}
