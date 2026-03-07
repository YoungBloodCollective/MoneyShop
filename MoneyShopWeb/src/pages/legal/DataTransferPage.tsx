import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DataTransferPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile/legal')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi
      </button>

      <h1 className="text-2xl font-bold text-light-100">Politica de transmitere a datelor catre brokeri</h1>

      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
        <div className="space-y-4 text-sm text-light-80 leading-relaxed">
          <p>Aceasta politica reglementeaza modul in care datele personale sunt transmise catre brokerii autorizati cu care MoneyShop.ro colaboreaza.</p>

          <h3 className="text-base font-semibold text-light-100">1. Categorii de date transmise</h3>
          <p>Se transmit: date de identificare, date financiare, documentele KYC si istoricul cererilor de credit, exclusiv cu consimtamantul utilizatorului.</p>

          <h3 className="text-base font-semibold text-light-100">2. Destinatari</h3>
          <p>Datele sunt transmise exclusiv catre brokeri autorizati ASF, inregistrati in directorul oficial al intermediarilor de credit.</p>

          <h3 className="text-base font-semibold text-light-100">3. Masuri de protectie</h3>
          <p>Toate transferurile se realizeaza prin canale securizate (TLS 1.3), cu acorduri de prelucrare a datelor (DPA) semnate cu fiecare broker partener.</p>

          <h3 className="text-base font-semibold text-light-100">4. Dreptul de revocare</h3>
          <p>Poti revoca oricand consimtamantul pentru transferul datelor din sectiunea Consimtaminte a profilului tau.</p>
        </div>
      </div>
    </div>
  );
}
