import { useState } from "react";

interface ConsentGateProps {
  onAccept: () => void;
}

export default function ConsentGate({ onAccept }: ConsentGateProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Consimțământ Prelucrare Date
          </h1>
          <p className="text-gray-400 text-sm">
            Conform Regulamentului (UE) 2016/679 (GDPR)
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-900/50 rounded-xl p-4 sm:p-5 mb-6 max-h-[45vh] overflow-y-auto text-sm text-gray-300 space-y-3 leading-relaxed">
          <p>
            Prin continuarea procesului de verificare a identității (KYC), sunteți de acord
            cu prelucrarea următoarelor date personale:
          </p>

          <ul className="space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span><strong className="text-white">Fotografia documentului de identitate</strong> — pentru extragerea automată a datelor (OCR)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span><strong className="text-white">Date personale</strong> — nume, prenume, CNP, data nașterii, adresă, serie/număr act de identitate</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span><strong className="text-white">Fotografia facială (selfie)</strong> — pentru verificarea identității prin comparare biometrică</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span><strong className="text-white">Verificare liveness</strong> — mișcări faciale pentru a confirma prezența reală</span>
            </li>
          </ul>

          <p>
            <strong className="text-white">Scopul prelucrării:</strong> Verificarea identității dumneavoastră
            în conformitate cu cerințele legale de cunoaștere a clientului (KYC/AML).
          </p>

          <p>
            <strong className="text-white">Temeiul legal:</strong> Consimțământul dumneavoastră explicit,
            conform Art. 6(1)(a) și Art. 9(2)(a) din GDPR.
          </p>

          <p>
            <strong className="text-white">Perioada de stocare:</strong> Datele vor fi păstrate pe durata
            necesară îndeplinirii scopului pentru care au fost colectate, conform legislației în vigoare.
          </p>

          <p>
            <strong className="text-white">Drepturile dumneavoastră:</strong> Aveți dreptul de acces,
            rectificare, ștergere, restricționare a prelucrării și portabilitate a datelor. Puteți retrage
            consimțământul în orice moment, fără a afecta legalitatea prelucrării efectuate anterior.
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-6 group">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800 cursor-pointer shrink-0"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            Am citit și sunt de acord cu prelucrarea datelor mele personale în scopul
            verificării identității, conform informațiilor de mai sus.
          </span>
        </label>

        {/* Button */}
        <button
          onClick={onAccept}
          disabled={!accepted}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-all text-lg active:scale-[0.98] disabled:cursor-not-allowed"
        >
          Accept și continui
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          Datele sunt procesate în siguranță și nu sunt partajate cu terți neautorizați.
        </p>
      </div>
    </div>
  );
}
