import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';
import { formatBooking } from '@/services/api/bookingApi';

interface ThankYouState { scheduledAt?: string | null; confirmationSent?: boolean }

// The Google Ads lead conversion is sent by the form that created the appointment
// (trackLeadConversion in LandingPage), not here: firing on page view counted every
// lead twice and counted again on every reload or direct visit to /multumim.
export default function ThankYouPage() {
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as ThankYouState;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Mulțumim!</h1>
        {state.scheduledAt ? (
          <>
            <p className="text-gray-600 mb-2">Ți-am rezervat apelul pentru</p>
            <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-lg font-semibold text-gray-900">{formatBooking(state.scheduledAt, 15)}</p>
            {state.confirmationSent && (
              <p className="mb-8 flex items-start justify-center gap-2 text-sm text-gray-600">
                <Mail size={16} className="mt-0.5 shrink-0 text-green-600" />
                Verifică emailul și confirmă programarea. Din același link o poți muta sau anula.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-2">Cererea ta a fost înregistrată cu succes.</p>
            <p className="text-gray-500 text-sm mb-8">Un consultant MoneyShop te va contacta în cel mai scurt timp.</p>
          </>
        )}
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors"
        >
          Înapoi la pagina principală
        </button>
        <p className="text-xs text-gray-400 mt-8">MoneyShop® — Broker autorizat ANPC</p>
      </div>
    </div>
  );
}
