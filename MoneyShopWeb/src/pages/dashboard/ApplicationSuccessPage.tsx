import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, Clock, FileText, Send, Building2 } from 'lucide-react';

const NEXT_STEPS = [
  { icon: Clock, label: 'Analiza broker', desc: 'Un broker va analiza cererea ta in urmatoarele 24-48 ore.' },
  { icon: FileText, label: 'Documente', desc: 'Este posibil sa iti cerem cateva documente suplimentare.' },
  { icon: Send, label: 'Oferte banci', desc: 'Vei primi ofertele de la bancile partenere.' },
  { icon: Building2, label: 'Aprobare', desc: 'Dupa acceptarea ofertei, banca va procesa cererea.' },
];

export default function ApplicationSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto py-12 space-y-8">
      {/* Success header */}
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-500/15 flex items-center justify-center">
          <CheckCircle size={40} className="text-success-500" />
        </div>
        <h1 className="text-2xl font-bold text-light-100 mb-3">Aplicatie depusa cu succes!</h1>
        <p className="text-light-60">
          Cererea ta a fost inregistrata si va fi procesata in cel mai scurt timp.
        </p>
      </div>

      {/* What happens next timeline */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-light-100 mb-4">Ce urmeaza?</h2>
        <div className="space-y-0">
          {NEXT_STEPS.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center w-6 flex-shrink-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  i === 0 ? 'bg-brand-primary text-white' : 'bg-dark-500 text-light-50'
                }`}>
                  <step.icon size={11} />
                </div>
                {i < NEXT_STEPS.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-[20px] bg-dark-500" />
                )}
              </div>
              <div className="pb-4">
                <p className={`text-sm font-medium ${i === 0 ? 'text-brand-primary' : 'text-light-70'}`}>{step.label}</p>
                <p className="text-xs text-light-50 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification hint */}
      <div className="bg-brand-primary/5 border border-brand-primary/15 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-primary/15 flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-brand-primary" />
        </div>
        <p className="text-xs text-light-60">Vei primi notificari cand statusul aplicatiei se schimba. Poti urmari progresul in sectiunea "Aplicatiile mele".</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => navigate('/dashboard/applications')}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-colors"
        >
          Vezi aplicatiile <ArrowRight size={18} />
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-dark-400 text-light-80 hover:border-dark-300 transition-colors"
        >
          <Home size={18} /> Acasa
        </button>
      </div>
    </div>
  );
}
