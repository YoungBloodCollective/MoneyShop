import { useState } from 'react';
import { ChevronDown, Shield } from 'lucide-react';

interface LegalSection {
  id: string;
  title: string;
  updated?: string;
  content: React.ReactNode;
}

const sections: LegalSection[] = [
  {
    id: 'terms',
    title: 'Termeni si conditii de utilizare',
    updated: 'Ianuarie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Bine ati venit pe platforma MoneyShop.ro. Prin accesarea si utilizarea acestei platforme, acceptati in totalitate termenii si conditiile prezentate mai jos.</p>
        <h4 className="text-base font-semibold text-gray-900">1. Descrierea serviciului</h4>
        <p>MoneyShop.ro este o platforma de intermediere financiara care pune la dispozitia utilizatorilor instrumente de simulare, comparare si aplicare pentru diverse produse de creditare oferite de institutii bancare si financiare partenere.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Inregistrarea contului</h4>
        <p>Pentru a utiliza serviciile platformei, utilizatorul trebuie sa creeze un cont furnizand informatii corecte si complete. Utilizatorul este responsabil pentru securitatea contului sau.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Obligatiile utilizatorului</h4>
        <p>Utilizatorul se obliga sa furnizeze informatii veridice, sa nu utilizeze platforma in scopuri ilegale si sa respecte legislatia in vigoare.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Limitarea raspunderii</h4>
        <p>MoneyShop.ro nu garanteaza aprobarea niciunei cereri de credit. Decizia finala apartine exclusiv institutiei financiare.</p>
        <h4 className="text-base font-semibold text-gray-900">5. Modificarea termenilor</h4>
        <p>Ne rezervam dreptul de a modifica acesti termeni in orice moment. Utilizatorii vor fi notificati prin email sau prin platforma.</p>
      </div>
    ),
  },
  {
    id: 'privacy',
    title: 'Politica de confidentialitate (GDPR)',
    updated: 'Ianuarie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Aceasta politica descrie modul in care MoneyShop.ro colecteaza, utilizeaza si protejeaza datele cu caracter personal ale utilizatorilor, in conformitate cu Regulamentul (UE) 2016/679 (GDPR).</p>
        <h4 className="text-base font-semibold text-gray-900">1. Date colectate</h4>
        <p>Colectam: nume, email, telefon, CNP (criptat), date financiare, documente de identitate (pentru KYC), adresa IP si date de navigare.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Scopul prelucrarii</h4>
        <p>Datele sunt prelucrate pentru: verificarea identitatii, evaluarea eligibilitatii, intermedierea creditelor, comunicari legale si imbunatatirea serviciilor.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Baza legala</h4>
        <p>Prelucrarea se bazeaza pe: consimtamantul utilizatorului, executarea contractului, obligatii legale si interese legitime.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Drepturile utilizatorului</h4>
        <p>Ai dreptul la: acces, rectificare, stergere, restrictionare, portabilitate si opozitie. Contacteaza-ne la dpo@moneyshop.ro.</p>
        <h4 className="text-base font-semibold text-gray-900">5. Securitatea datelor</h4>
        <p>Implementam masuri tehnice si organizatorice: criptare AES-256, acces bazat pe roluri, audit logs si backup-uri regulate.</p>
      </div>
    ),
  },
  {
    id: 'mandate',
    title: 'Mandat de intermediere',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Prin prezentul mandat, utilizatorul imputerniceste MoneyShop.ro sa actioneze in calitate de intermediar de credit, conform OUG 52/2016.</p>
        <h4 className="text-base font-semibold text-gray-900">1. Obiectul mandatului</h4>
        <p>Mandatul acopera: colectarea si transmiterea documentelor, negocierea cu institutiile financiare si prezentarea ofertelor de creditare.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Durata</h4>
        <p>Mandatul este valabil pe o perioada de 30 de zile de la acordare si poate fi revocat oricand.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Obligatiile intermediarului</h4>
        <p>MoneyShop.ro se obliga sa actioneze in interesul clientului, sa prezinte oferte transparente si sa protejeze datele personale.</p>
      </div>
    ),
  },
  {
    id: 'compliance',
    title: 'Pachet oficial de conformitate',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>MoneyShop.ro respecta toate cerintele legale privind intermedierea financiara si protectia consumatorilor.</p>
        <h4 className="text-base font-semibold text-gray-900">Cadrul legislativ</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>OUG 52/2016 privind contractele de credit</li>
          <li>Regulamentul (UE) 2016/679 (GDPR)</li>
          <li>Legea 190/1999 privind creditul ipotecar</li>
          <li>Legea 365/2002 privind comertul electronic</li>
        </ul>
        <h4 className="text-base font-semibold text-gray-900">Masuri de conformitate</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Verificare KYC obligatorie pentru toate aplicatiile</li>
          <li>Sistem de consimtaminte granulare</li>
          <li>Audit trail complet pentru toate operatiunile</li>
          <li>Criptare end-to-end pentru datele sensibile</li>
          <li>DPO desemnat si politici GDPR actualizate</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'data-transfer',
    title: 'Politica de transmitere a datelor catre brokeri',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Aceasta politica reglementeaza modul in care datele personale sunt transmise catre brokerii autorizati cu care MoneyShop.ro colaboreaza.</p>
        <h4 className="text-base font-semibold text-gray-900">1. Categorii de date transmise</h4>
        <p>Se transmit: date de identificare, date financiare, documentele KYC si istoricul cererilor de credit, exclusiv cu consimtamantul utilizatorului.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Destinatari</h4>
        <p>Datele sunt transmise exclusiv catre brokeri autorizati ASF, inregistrati in directorul oficial al intermediarilor de credit.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Masuri de protectie</h4>
        <p>Toate transferurile se realizeaza prin canale securizate (TLS 1.3), cu acorduri de prelucrare a datelor (DPA) semnate cu fiecare broker partener.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Dreptul de revocare</h4>
        <p>Poti revoca oricand consimtamantul pentru transferul datelor din sectiunea Consimtaminte a profilului tau.</p>
      </div>
    ),
  },
];

export default function LegalAllPage() {
  const [expanded, setExpanded] = useState<string[]>(['terms']);

  const toggle = (id: string) =>
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Shield size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Informatii legale</h1>
          <p className="text-sm text-gray-500">Transparenta si conformitate</p>
        </div>
      </div>
      <div className="space-y-3">
        {sections.map(section => {
          const isOpen = expanded.includes(section.id);
          return (
            <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h2 className="font-semibold text-gray-900">{section.title}</h2>
                  {section.updated && (
                    <p className="text-xs text-gray-400 mt-0.5">Ultima actualizare: {section.updated}</p>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ml-4 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                  <div className="pt-4">{section.content}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Intrebari legate de documentele legale? Contacteaza-ne la{' '}
          <a href="mailto:legal@moneyshop.ro" className="text-blue-600 hover:underline font-medium">
            legal@moneyshop.ro
          </a>
        </p>
      </div>
    </div>
  );
}
