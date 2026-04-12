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
    updated: 'Aprilie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Prezentul document stabileste termenii si conditiile de utilizare a platformei www.MoneyShop.ro si a aplicatiilor mobile MoneyShop. Platforma este operata de <strong>MONEYSHOP FINTECH SRL</strong> (CUI: 53986951, ONRC: J2026010941009). Serviciile de intermediere a creditelor sunt furnizate de <strong>POPIX BROKERAGE CONSULTING SRL</strong> (CUI: 50477260, ONRC: J2024018340008).</p>
        <h4 className="text-base font-semibold text-gray-900">1. Dispozitii generale</h4>
        <p>Prezentul document constituie un contract la distanta, in sensul OUG nr. 34/2014, Codului Civil si legislatiei UE privind serviciile digitale. Utilizarea Platformei implica acceptarea integrala a acestor termeni.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Statutul juridic</h4>
        <p>Platforma MoneyShop NU este institutie de credit, NU este IFN, NU acorda credite, NU aproba credite, NU garanteaza finantare si NU stabileste conditii finale. Intermedierea este realizata exclusiv de brokerul autorizat. Decizia finala apartine institutiilor financiare.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Natura serviciilor</h4>
        <p>Platforma ofera: simulari orientative, informatii financiare, analiza eligibilitate si facilitare intermediere. Toate informatiile sunt informative, neobligatorii si fara valoare contractuala.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Obligatiile utilizatorului</h4>
        <p>Utilizatorul trebuie sa furnizeze date corecte, sa utilizeze legal Platforma, sa nu furnizeze date false si sa nu incerce acces neautorizat. Incalcarea poate duce la suspendare.</p>
        <h4 className="text-base font-semibold text-gray-900">5. Limitarea raspunderii</h4>
        <p>Platforma nu raspunde pentru deciziile creditorilor, refuzuri de credit, modificari de conditii, erori ale tertilor sau pierderi indirecte. Utilizarea se face pe propria raspundere.</p>
        <h4 className="text-base font-semibold text-gray-900">6. Protectia consumatorului</h4>
        <p>Platforma respecta OG nr. 21/1992, Legea nr. 363/2007 si OUG nr. 34/2014. Informatiile sunt transparente si corecte.</p>
        <h4 className="text-base font-semibold text-gray-900">7. Proprietate intelectuala</h4>
        <p>MoneyShop este marca inregistrata apartinand POPIX BROKERAGE CONSULTING SRL. Continutul este protejat de lege. Este interzisa copierea, distribuirea sau utilizarea fara acord.</p>
        <h4 className="text-base font-semibold text-gray-900">8. Legea aplicabila</h4>
        <p>Se aplica legislatia Romaniei si legislatia UE. Litigiile sunt solutionate de instantele din Romania.</p>
      </div>
    ),
  },
  {
    id: 'privacy',
    title: 'Politica de confidentialitate (GDPR)',
    updated: 'Aprilie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Prezenta Politica de Confidentialitate informeaza utilizatorii platformei www.MoneyShop.ro cu privire la modul in care sunt colectate, utilizate si protejate datele cu caracter personal, in conformitate cu Regulamentul (UE) 2016/679 (GDPR), Legea nr. 190/2018 si legislatia privind intermedierea creditelor.</p>
        <h4 className="text-base font-semibold text-gray-900">1. Operatorii datelor</h4>
        <p><strong>Operator platforma:</strong> MONEYSHOP FINTECH SRL (CUI: 53986951). <strong>Broker de credite (operator distinct):</strong> POPIX BROKERAGE CONSULTING SRL (CUI: 50477260).</p>
        <h4 className="text-base font-semibold text-gray-900">2. Categorii de date</h4>
        <p>Date de identificare (nume, CNP unde e necesar), date de contact, date financiare, date ANAF, date Biroul de Credit, date tehnice (IP, device, loguri).</p>
        <h4 className="text-base font-semibold text-gray-900">3. Scopurile prelucrarii</h4>
        <p>Analiza eligibilitatii financiare (MoneyShop), generarea rapoartelor interne, intermedierea creditelor (prin Popix), prevenirea fraudei si obligatii legale.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Structura Dual Consent</h4>
        <p><strong>Nivel 1 (fara transmitere):</strong> Datele ANAF si Biroul de Credit sunt procesate tehnic prin platforma, utilizate exclusiv pentru analiza eligibilitatii. NU sunt vandute, distribuite sau folosite in marketing.</p>
        <p><strong>Nivel 2 (cu transmitere):</strong> Transmiterea catre broker/institutii se face DOAR cu consimtamant separat, este optionala si nu afecteaza utilizarea platformei.</p>
        <h4 className="text-base font-semibold text-gray-900">5. Drepturile utilizatorului</h4>
        <p>Utilizatorul poate: accesa datele, rectifica, sterge, restrictiona, opune si retrage consimtamantul. Contact: <a href="mailto:gdpr@moneyshop.ro" className="text-blue-600 hover:underline">gdpr@moneyshop.ro</a>, <a href="mailto:dpo@moneyshop.ro" className="text-blue-600 hover:underline">dpo@moneyshop.ro</a></p>
        <h4 className="text-base font-semibold text-gray-900">6. Durata stocarii</h4>
        <p>Date analiza: conform scop. Date consimtamant: minimum 5 ani. Date KYC: maximum 30 zile.</p>
        <h4 className="text-base font-semibold text-gray-900">7. Securitatea datelor</h4>
        <p>Criptare AES-256, control acces, audit complet, log juridic securizat. Infrastructura Microsoft Azure.</p>
      </div>
    ),
  },
  {
    id: 'mandate',
    title: 'Politica de mandatare',
    updated: 'Aprilie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Prezenta Politica de Mandatare stabileste conditiile in care utilizatorii acorda un mandat expres, limitat si temporar societatii <strong>POPIX BROKERAGE CONSULTING SRL</strong> (Mandatarul). Platforma este operata de MONEYSHOP FINTECH SRL. Documentul are natura juridica a unui contract de mandat, in sensul art. 2009 si urmatoarele din Codul Civil.</p>
        <h4 className="text-base font-semibold text-gray-900">1. Obiectul mandatului</h4>
        <p>Mandatul are un obiect strict limitat: interogarea veniturilor prin ANAF, interogarea situatiei la Biroul de Credit, analiza eligibilitatii financiare, realizarea analizei MoneyShop si transmiterea datelor catre brokeri sau institutii financiare doar la solicitarea utilizatorului.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Durata mandatului</h4>
        <p>Mandatul este valabil <strong>maximum 30 zile calendaristice</strong>. Dupa expirare mandatul inceteaza automat, nu se mai pot face interogari si este necesar un nou mandat. Mandatul este revocabil oricand, cu efect pentru viitor.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Limitarea scopului</h4>
        <p>Datele sunt utilizate exclusiv pentru analiza eligibilitate, evaluare bonitate si intermediere credit. Este interzisa vanzarea datelor, utilizarea in marketing, profilarea comerciala sau transmiterea catre terti neautorizati.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Costuri</h4>
        <p>Interogarile ANAF si Biroul de Credit pot implica costuri, afisate transparent si acceptate expres de utilizator.</p>
      </div>
    ),
  },
  {
    id: 'compliance',
    title: 'Pachet oficial de conformitate',
    updated: 'Aprilie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p><strong>Operator platforma:</strong> MONEYSHOP FINTECH SRL (CUI: 53986951). <strong>Broker de credite autorizat:</strong> POPIX BROKERAGE CONSULTING SRL (CUI: 50477260). Contact: 031 434 0940, office@moneyshop.ro</p>
        <h4 className="text-base font-semibold text-gray-900">Declaratie oficiala</h4>
        <p>MoneyShop NU este institutie de credit, NU este IFN, NU este participant in sistemul Biroului de Credit S.A., NU este afiliat ANAF sau Biroului de Credit S.A., NU vinde sau comercializeaza rapoarte. MoneyShop actioneaza exclusiv ca operator de platforma tehnologica si intermediar digital.</p>
        <h4 className="text-base font-semibold text-gray-900">Fluxul operational</h4>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Utilizatorul solicita analiza eligibilitatii de credit</li>
          <li>Utilizatorul acorda mandat expres catre broker (Popix), limitat la max. 30 zile</li>
          <li>Brokerul interogheaza ANAF (venituri) si Biroul de Credit (istoric)</li>
          <li>Datele sunt utilizate exclusiv pentru analiza eligibilitatii</li>
          <li>Transmiterea catre alte institutii are loc doar cu consimtamant distinct</li>
        </ol>
        <h4 className="text-base font-semibold text-gray-900">Securitate si retentie</h4>
        <p>Date KYC: stocate securizat, sterse automat dupa 30 zile. Date consimtamant: pastrate conform obligatiilor legale. Infrastructura: Microsoft Azure, criptare AES-256, acces controlat, audit complet.</p>
      </div>
    ),
  },
  {
    id: 'data-transfer',
    title: 'Politica de transmitere a datelor catre brokeri',
    updated: 'Aprilie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Prezenta Politica stabileste conditiile in care utilizatorii pot solicita, in mod voluntar, expres si individual, transmiterea analizei financiare si a documentelor obtinute (ANAF / Biroul de Credit) catre brokeri de credite autorizati.</p>
        <h4 className="text-base font-semibold text-gray-900">1. Principiul fundamental</h4>
        <p>Transmiterea datelor catre brokeri <strong>nu este automatica, nu este implicita si nu este obligatorie</strong>. Are loc exclusiv la initiativa utilizatorului. Platforma nu decide si nu transmite date fara acordul expres.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Brokeri eligibili</h4>
        <p>Datele pot fi transmise doar catre brokeri de credite autorizati, inscrisi in lista publica ANPC, validati in Platforma (KYC broker) si cu date de contact confirmate.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Consimtamant distinct</h4>
        <p>Transmiterea datelor este conditionata de bifarea unei optiuni distincte, confirmare explicita si existenta unui mandat valid (max. 30 zile). In lipsa consimtamantului, datele nu sunt transmise.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Interdictii</h4>
        <p>Platforma nu vinde rapoarte, nu comercializeaza date, nu transmite date fara acord, nu creeaza baze de date paralele si nu este afiliata brokerilor afisati.</p>
      </div>
    ),
  },
  {
    id: 'cookies',
    title: 'Politica de cookie-uri',
    updated: 'Aprilie 2026',
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>Prezenta Politica de Cookie-uri informeaza utilizatorii cu privire la utilizarea cookie-urilor si a tehnologiilor similare, in conformitate cu GDPR, Directiva 2002/58/CE (ePrivacy) si Legea nr. 506/2004.</p>
        <h4 className="text-base font-semibold text-gray-900">1. Cookie-uri strict necesare</h4>
        <p>Esentiale pentru functionarea Platformei. Permit navigarea pe site, accesarea zonelor securizate, functionarea formularelor si autentificarii. Nu pot fi dezactivate.</p>
        <h4 className="text-base font-semibold text-gray-900">2. Cookie-uri de analiza</h4>
        <p>Colecteaza informatii anonime privind modul de utilizare a Platformei. Scop: imbunatatirea functionalitatilor si analiza statistica. Necesita consimtamantul utilizatorului.</p>
        <h4 className="text-base font-semibold text-gray-900">3. Cookie-uri si date personale</h4>
        <p>Cookie-urile utilizate nu sunt utilizate pentru identificare directa, nu sunt utilizate pentru profilare financiara si nu sunt corelate cu datele ANAF sau Biroul de Credit.</p>
        <h4 className="text-base font-semibold text-gray-900">4. Consimtamantul utilizatorului</h4>
        <p>La prima accesare, utilizatorul poate: accepta toate cookie-urile, refuza cookie-urile optionale sau personaliza preferintele. Consimtamantul este liber, specific si informat.</p>
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
          <a href="mailto:office@moneyshop.ro" className="text-blue-600 hover:underline font-medium">
            office@moneyshop.ro
          </a> | <a href="mailto:gdpr@moneyshop.ro" className="text-blue-600 hover:underline font-medium">
            gdpr@moneyshop.ro
          </a>
        </p>
      </div>
    </div>
  );
}
