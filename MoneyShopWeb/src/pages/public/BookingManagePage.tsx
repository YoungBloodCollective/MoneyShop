import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { CalendarCheck2, CalendarX2, CheckCircle, Loader2, Phone } from 'lucide-react';
import { bookingApi, formatBooking, type BookingView } from '@/services/api/bookingApi';
import { SlotPicker } from '@/components/booking/SlotPicker';

const errorMessage = (err: unknown, fallback: string) =>
  (axios.isAxiosError(err) && typeof err.response?.data?.message === 'string' ? err.response.data.message : null) ?? fallback;

/**
 * The private link from the booking email: the client confirms the call, moves it to another free
 * time, or cancels it. No account needed; the link itself is the key.
 */
export default function BookingManagePage() {
  const { token = '' } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);
  const [newSlot, setNewSlot] = useState<string | null>(null);
  const [slotsKey, setSlotsKey] = useState(0);

  useEffect(() => {
    let active = true;
    bookingApi.get(token)
      .then(b => { if (active) setBooking(b); })
      .catch(() => { if (active) setNotFound(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const run = async (action: () => Promise<BookingView>, fallback: string) => {
    setBusy(true);
    setError('');
    try {
      setBooking(await action());
      setMoving(false);
      setNewSlot(null);
    } catch (err) {
      setError(errorMessage(err, fallback));
      if (axios.isAxiosError(err) && err.response?.data?.code === 'slot_taken') {
        setNewSlot(null);
        setSlotsKey(k => k + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04]">
        <Link to="/" className="mb-6 block text-center text-xl font-bold"><span className="text-green-600">Money</span><span className="text-blue-900">Shop</span></Link>
        {children}
      </div>
      <p className="mt-6 text-center text-xs text-gray-400">MoneyShop® — Broker de credite autorizat ANPC</p>
    </div>
  );

  if (loading) return shell(<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>);
  if (notFound || !booking) {
    return shell(
      <div className="text-center">
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Linkul nu mai este valid</h1>
        <p className="text-sm text-gray-600">Poate a expirat sau a fost copiat incomplet. Poți face o programare nouă de pe site.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600">Mergi la moneyshop.ro</Link>
      </div>,
    );
  }

  const when = formatBooking(booking.scheduledAtUtc, booking.durationMinutes);
  const btn = 'w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50';

  return shell(
    <div>
      <h1 className="text-center text-xl font-bold text-gray-900">
        {booking.status === 'cancelled' ? 'Programare anulată' : booking.status === 'confirmed' ? 'Programare confirmată' : `Bună, ${booking.firstName}!`}
      </h1>
      <div className={`mt-4 rounded-xl px-4 py-3 text-center ${booking.status === 'cancelled' ? 'bg-gray-100 text-gray-500 line-through' : 'bg-green-50 text-gray-900'}`}>
        <p className="text-xs text-gray-500">Apel telefonic{booking.brokerName ? ` cu ${booking.brokerName}` : ''}</p>
        <p className="text-base font-semibold">{when}</p>
      </div>

      {booking.status === 'confirmed' && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-green-700"><CheckCircle size={16} /> Te sunăm la ora stabilită. Primești și un reminder.</p>
      )}
      {booking.status === 'cancelled' && <p className="mt-4 text-center text-sm text-gray-600">Dacă te răzgândești, poți face o programare nouă de pe site.</p>}
      {booking.status === 'past' && <p className="mt-4 text-center text-sm text-gray-600">Ora programării a trecut. Pentru o discuție nouă, programează-te de pe site.</p>}

      {(booking.status === 'pending' || booking.status === 'confirmed') && (
        <div className="mt-6 space-y-3">
          {booking.status === 'pending' && !moving && (
            <button onClick={() => run(() => bookingApi.confirm(token), 'Nu am putut confirma programarea.')} disabled={busy} className={`${btn} flex items-center justify-center gap-2 bg-green-500 text-white hover:bg-green-600`}>
              <CalendarCheck2 size={18} /> Confirmă programarea
            </button>
          )}

          {moving ? (
            <div className="space-y-3 rounded-xl border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-700">Alege o oră nouă</p>
              <SlotPicker key={slotsKey} value={newSlot} onChange={setNewSlot} />
              <button onClick={() => newSlot && run(() => bookingApi.reschedule(token, newSlot), 'Nu am putut muta programarea.')} disabled={busy || !newSlot} className={`${btn} bg-green-500 text-white hover:bg-green-600`}>
                Mută programarea
              </button>
              <button onClick={() => { setMoving(false); setNewSlot(null); setError(''); }} className={`${btn} border border-gray-200 text-gray-600 hover:bg-gray-50`}>Renunță</button>
            </div>
          ) : (
            <button onClick={() => { setMoving(true); setError(''); }} disabled={busy} className={`${btn} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              Reprogramează
            </button>
          )}

          {!moving && (
            <button
              onClick={() => { if (window.confirm('Sigur anulezi apelul?')) void run(() => bookingApi.cancel(token), 'Nu am putut anula programarea.'); }}
              disabled={busy}
              className={`${btn} flex items-center justify-center gap-2 text-red-600 hover:bg-red-50`}
            >
              <CalendarX2 size={18} /> Anulează
            </button>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400"><Phone size={12} /> Discuția este gratuită și nu te obligă la nimic.</p>
    </div>,
  );
}
