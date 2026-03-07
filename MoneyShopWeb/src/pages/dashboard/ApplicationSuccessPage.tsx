import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';

export default function ApplicationSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-500/15 flex items-center justify-center">
        <CheckCircle size={40} className="text-success-500" />
      </div>

      <h1 className="text-2xl font-bold text-light-100 mb-3">Aplicatie depusa cu succes!</h1>
      <p className="text-light-60 mb-8">
        Cererea ta a fost inregistrata si va fi procesata in cel mai scurt timp.
        Vei primi o notificare cand statusul se actualizeaza.
      </p>

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
