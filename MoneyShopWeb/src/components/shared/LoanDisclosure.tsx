import { DEFAULT_CONFIG } from '@/lib/eligibility/config';
import { calculateMonthlyPayment } from '@/lib/eligibility/formulas';

// Credit information required next to personal-loan ads (Google Ads "Personal loans" policy):
// min/max repayment period, maximum APR (DAE) and a representative example of the total cost,
// shown directly on the page (not behind a click or hover). MoneyShop intermediates; the figures
// describe partner banks' personal-loan offers and come from the same config the simulator uses.

const NP_MIN_TERM_MONTHS = 6; // same lower bound as the NP term slider in AdvancedCalculatorPage
const EXAMPLE_AMOUNT = 30000;

const lei = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

export default function LoanDisclosure() {
  const { aprMin, aprMax, maxTermMonths } = DEFAULT_CONFIG.np;
  const monthly = calculateMonthlyPayment(EXAMPLE_AMOUNT, aprMax, maxTermMonths);
  const total = Math.round(monthly * maxTermMonths * 100) / 100;

  return (
    <section id="informatii-credit" aria-labelledby="informatii-credit-titlu" className="bg-white border-t border-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <h2 id="informatii-credit-titlu" className="text-lg font-bold text-gray-900 mb-2">
          Informații despre creditele de nevoi personale
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          MoneyShop nu acordă credite. Intermediem cererea ta către băncile partenere; oferta finală, dobânda și comisioanele sunt stabilite de bancă, în funcție de profilul tău. Serviciul de intermediere este gratuit pentru tine.
        </p>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-gray-200 p-4">
            <dt className="text-xs text-gray-500">Perioada de rambursare</dt>
            <dd className="text-base font-semibold text-gray-900">între {NP_MIN_TERM_MONTHS} și {maxTermMonths} de luni</dd>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <dt className="text-xs text-gray-500">DAE (dobânda anuală efectivă)</dt>
            <dd className="text-base font-semibold text-gray-900">între {pct(aprMin)} și {pct(aprMax)}</dd>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <dt className="text-xs text-gray-500">DAE maximă</dt>
            <dd className="text-base font-semibold text-gray-900">{pct(aprMax)}</dd>
          </div>
        </dl>

        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900 mb-1">Exemplu reprezentativ</p>
          <p>
            Pentru un credit de nevoi personale de {lei(EXAMPLE_AMOUNT)} lei, pe {maxTermMonths} de luni, cu DAE de {pct(aprMax)}:
            rata lunară este de {lei(monthly)} lei, iar suma totală de plată este de {lei(total)} lei
            (costul total al creditului: {lei(total - EXAMPLE_AMOUNT)} lei). Calcul orientativ, cu rate lunare egale, la DAE maximă.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Exemplul are caracter informativ și nu reprezintă o ofertă de creditare. Condițiile exacte sunt cele din oferta băncii.
          </p>
        </div>
      </div>
    </section>
  );
}
