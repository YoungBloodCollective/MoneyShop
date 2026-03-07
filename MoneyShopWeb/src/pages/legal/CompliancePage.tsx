import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CompliancePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile/legal')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi
      </button>

      <h1 className="text-2xl font-bold text-light-100">Pachet oficial de conformitate</h1>

      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
        <div className="space-y-4 text-sm text-light-80 leading-relaxed">
          <p>MoneyShop.ro respecta toate cerintele legale privind intermedierea financiara si protectia consumatorilor.</p>

          <h3 className="text-base font-semibold text-light-100">Cadrul legislativ</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>OUG 52/2016 privind contractele de credit</li>
            <li>Regulamentul (UE) 2016/679 (GDPR)</li>
            <li>Legea 190/1999 privind creditul ipotecar</li>
            <li>Legea 365/2002 privind comertul electronic</li>
          </ul>

          <h3 className="text-base font-semibold text-light-100">Masuri de conformitate</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Verificare KYC obligatorie pentru toate aplicatiile</li>
            <li>Sistem de consimtaminte granulare</li>
            <li>Audit trail complet pentru toate operatiunile</li>
            <li>Criptare end-to-end pentru datele sensibile</li>
            <li>DPO desemnat si politici GDPR actualizate</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
