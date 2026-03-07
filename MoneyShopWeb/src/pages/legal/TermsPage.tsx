import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile/legal')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi
      </button>

      <h1 className="text-2xl font-bold text-light-100">Termeni si conditii de utilizare</h1>
      <p className="text-xs text-light-50">Ultima actualizare: Ianuarie 2026</p>

      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 prose prose-invert prose-sm max-w-none">
        <div className="space-y-4 text-sm text-light-80 leading-relaxed">
          <p>Bine ati venit pe platforma MoneyShop.ro. Prin accesarea si utilizarea acestei platforme, acceptati in totalitate termenii si conditiile prezentate mai jos.</p>

          <h3 className="text-base font-semibold text-light-100">1. Descrierea serviciului</h3>
          <p>MoneyShop.ro este o platforma de intermediere financiara care pune la dispozitia utilizatorilor instrumente de simulare, comparare si aplicare pentru diverse produse de creditare oferite de institutii bancare si financiare partenere.</p>

          <h3 className="text-base font-semibold text-light-100">2. Inregistrarea contului</h3>
          <p>Pentru a utiliza serviciile platformei, utilizatorul trebuie sa creeze un cont furnizand informatii corecte si complete. Utilizatorul este responsabil pentru securitatea contului sau.</p>

          <h3 className="text-base font-semibold text-light-100">3. Obligatiile utilizatorului</h3>
          <p>Utilizatorul se obliga sa furnizeze informatii veridice, sa nu utilizeze platforma in scopuri ilegale si sa respecte legislatia in vigoare.</p>

          <h3 className="text-base font-semibold text-light-100">4. Limitarea raspunderii</h3>
          <p>MoneyShop.ro nu garanteaza aprobarea niciunei cereri de credit. Decizia finala apartine exclusiv institutiei financiare.</p>

          <h3 className="text-base font-semibold text-light-100">5. Modificarea termenilor</h3>
          <p>Ne rezervam dreptul de a modifica acesti termeni in orice moment. Utilizatorii vor fi notificati prin email sau prin platforma.</p>
        </div>
      </div>
    </div>
  );
}
