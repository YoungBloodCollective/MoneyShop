import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MandatePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile/legal')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi
      </button>

      <h1 className="text-2xl font-bold text-light-100">Mandat de intermediere</h1>

      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
        <div className="space-y-4 text-sm text-light-80 leading-relaxed">
          <p>Prin prezentul mandat, utilizatorul imputerniceste MoneyShop.ro sa actioneze in calitate de intermediar de credit, conform OUG 52/2016.</p>

          <h3 className="text-base font-semibold text-light-100">1. Obiectul mandatului</h3>
          <p>Mandatul acopera: colectarea si transmiterea documentelor, negocierea cu institutiile financiare si prezentarea ofertelor de creditare.</p>

          <h3 className="text-base font-semibold text-light-100">2. Durata</h3>
          <p>Mandatul este valabil pe o perioada de 30 de zile de la acordare si poate fi revocat oricand.</p>

          <h3 className="text-base font-semibold text-light-100">3. Obligatiile intermediarului</h3>
          <p>MoneyShop.ro se obliga sa actioneze in interesul clientului, sa prezinte oferte transparente si sa protejeze datele personale.</p>
        </div>
      </div>
    </div>
  );
}
