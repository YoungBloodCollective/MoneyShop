import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile/legal')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi
      </button>

      <h1 className="text-2xl font-bold text-light-100">Politica de confidentialitate (GDPR)</h1>
      <p className="text-xs text-light-50">Ultima actualizare: Ianuarie 2026</p>

      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
        <div className="space-y-4 text-sm text-light-80 leading-relaxed">
          <p>Aceasta politica descrie modul in care MoneyShop.ro colecteaza, utilizeaza si protejeaza datele cu caracter personal ale utilizatorilor, in conformitate cu Regulamentul (UE) 2016/679 (GDPR).</p>

          <h3 className="text-base font-semibold text-light-100">1. Date colectate</h3>
          <p>Colectam: nume, email, telefon, CNP (criptat), date financiare, documente de identitate (pentru KYC), adresa IP si date de navigare.</p>

          <h3 className="text-base font-semibold text-light-100">2. Scopul prelucrarii</h3>
          <p>Datele sunt prelucrate pentru: verificarea identitatii, evaluarea eligibilitatii, intermedierea creditelor, comunicari legale si imbunatatirea serviciilor.</p>

          <h3 className="text-base font-semibold text-light-100">3. Baza legala</h3>
          <p>Prelucrarea se bazeaza pe: consimtamantul utilizatorului, executarea contractului, obligatii legale si interese legitime.</p>

          <h3 className="text-base font-semibold text-light-100">4. Drepturile utilizatorului</h3>
          <p>Ai dreptul la: acces, rectificare, stergere, restrictionare, portabilitate si opozitie. Contacteaza-ne la dpo@moneyshop.ro.</p>

          <h3 className="text-base font-semibold text-light-100">5. Securitatea datelor</h3>
          <p>Implementam masuri tehnice si organizatorice: criptare AES-256, acces bazat pe roluri, audit logs si backup-uri regulate.</p>
        </div>
      </div>
    </div>
  );
}
