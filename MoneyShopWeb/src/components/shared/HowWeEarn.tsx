import { HandCoins } from 'lucide-react';

/**
 * "Cum câștigăm bani": the client pays nothing; the lending bank pays MoneyShop a commission when
 * the loan is granted, and that commission differs from bank to bank. Saying this plainly answers
 * the fear that a broker pushes a particular bank, and is part of what a credit intermediary must
 * disclose about payments from lenders. Text confirmed by the founders; to be reviewed by the lawyer.
 */
export default function HowWeEarn({ variant = 'light' }: { variant?: 'light' | 'plain' }) {
  return (
    <section
      aria-labelledby="cum-castigam-titlu"
      className={variant === 'light' ? 'border-t border-gray-100 bg-white py-10' : ''}
    >
      <div className={variant === 'light' ? 'mx-auto max-w-5xl px-4' : ''}>
        <div className="flex gap-4 rounded-2xl border border-green-100 bg-green-50/60 p-5">
          <HandCoins className="mt-0.5 h-6 w-6 shrink-0 text-green-600" aria-hidden="true" />
          <div>
            <h2 id="cum-castigam-titlu" className="text-base font-bold text-gray-900">Cum câștigăm bani</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
              <li><strong>Pentru tine e gratuit.</strong> Nu plătești nimic: nici onorariu, nici comision de dosar, nici avans.</li>
              <li>Suntem plătiți de <strong>banca</strong> care îți acordă creditul, și doar dacă creditul se acordă.</li>
              <li>
                Comisionul diferă de la o bancă la alta. Înainte să alegi oferta, brokerul îți spune cât primim de la fiecare
                bancă propusă, ca să poți compara ofertele doar după costul pentru tine.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
