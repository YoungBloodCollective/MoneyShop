import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

/** Shown for any address that does not exist, instead of silently sending people to the home page. */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <Compass size={40} className="text-blue-600" aria-hidden="true" />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Pagina nu există</h1>
        <p className="mb-8 text-gray-600">
          Linkul poate fi greșit sau pagina a fost mutată. Te ajutăm de pe pagina principală.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
            Mergi la moneyshop.ro
          </Link>
          <Link to="/auth/login" className="rounded-full border border-gray-200 px-8 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50">
            Intră în cont
          </Link>
        </div>
      </div>
    </div>
  );
}
