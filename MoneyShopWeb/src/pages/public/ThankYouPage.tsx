import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, IdCard, Mail, PhoneCall } from 'lucide-react';
import { formatBooking } from '@/services/api/bookingApi';

interface ThankYouState {
  scheduledAt?: string | null;
  confirmationSent?: boolean;
  /** Set when the request came from a broker's own site. */
  brokerFirstName?: string;
}

const NEXT_STEPS = [
  {
    icon: IdCard,
    title: 'Pregătește actele de bază',
    text: 'Buletinul și ultimii fluturași de salariu (sau extrasul de cont unde îți intră salariul). Nu trebuie trimise acum.',
  },
  {
    icon: FileText,
    title: 'Raportul de la Biroul de Credit',
    text: 'Dacă îl ai deja, ține-l la îndemână. Dacă nu, te ajutăm noi să-l obții după apel.',
  },
  {
    icon: PhoneCall,
    title: 'Discuția de 15 minute',
    text: 'Vorbim despre venit, creditele actuale și ce îți dorești. Este gratuită și nu te obligă la nimic.',
  },
];

// The Google Ads lead conversion is sent by the form that created the appointment
// (trackLeadConversion in LandingPage), not here: firing on page view counted every
// lead twice and counted again on every reload or direct visit to /multumim.
export default function ThankYouPage() {
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as ThankYouState;
  const who = state.brokerFirstName ? state.brokerFirstName : 'Un broker MoneyShop';

  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <CheckCircle size={40} className="text-green-500" aria-hidden="true" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-gray-900">Mulțumim!</h1>
          {state.scheduledAt ? (
            <>
              <p className="mb-2 text-gray-600">Ți-am rezervat apelul pentru</p>
              <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-lg font-semibold text-gray-900">{formatBooking(state.scheduledAt, 15)}</p>
              {state.confirmationSent && (
                <p className="mb-2 flex items-start justify-center gap-2 text-sm text-gray-600">
                  <Mail size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
                  Verifică emailul și confirmă programarea. Din același link o poți muta sau anula.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mb-2 text-gray-600">Cererea ta a fost înregistrată.</p>
              <p className="text-sm text-gray-500">{who} te va suna în cel mai scurt timp, în timpul programului (luni–vineri, 09:00–18:00).</p>
            </>
          )}
        </div>

        <section aria-labelledby="next-steps" className="mt-10 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h2 id="next-steps" className="mb-4 text-base font-semibold text-gray-900">Ce urmează</h2>
          <ol className="space-y-4">
            {NEXT_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-green-600 ring-1 ring-gray-200">{i + 1}</span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><Icon size={15} className="text-gray-500" aria-hidden="true" /> {step.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Înapoi la pagina principală
          </button>
          <p className="mt-8 text-xs text-gray-400">MoneyShop® — Broker de credite. MoneyShop nu acordă credite; intermediem gratuit cererea ta către bănci.</p>
        </div>
      </div>
    </div>
  );
}
