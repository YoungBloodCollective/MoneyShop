import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Multumim!</h1>
        <p className="text-gray-600 mb-2">Cererea ta a fost inregistrata cu succes.</p>
        <p className="text-gray-500 text-sm mb-8">Un consultant MoneyShop te va contacta in cel mai scurt timp.</p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors"
        >
          Inapoi la pagina principala
        </button>
        <p className="text-xs text-gray-400 mt-8">MoneyShop® — Broker autorizat ANPC</p>
      </div>
    </div>
  );
}
