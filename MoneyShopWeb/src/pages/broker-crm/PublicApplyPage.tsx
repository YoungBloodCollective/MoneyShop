import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicApplyApi } from '@/services/api/brokerCrmApi';
import { CheckCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const JUDETE = [
  'Alba','Arad','Arges','Bacau','Bihor','Bistrita-Nasaud','Botosani','Braila','Brasov','Bucuresti',
  'Buzau','Calarasi','Caras-Severin','Cluj','Constanta','Covasna','Dambovita','Dolj','Galati',
  'Giurgiu','Gorj','Harghita','Hunedoara','Ialomita','Iasi','Ilfov','Maramures','Mehedinti',
  'Mures','Neamt','Olt','Prahova','Salaj','Satu Mare','Sibiu','Suceava','Teleorman','Timis',
  'Tulcea','Valcea','Vaslui','Vrancea'
];

const TIP_CREDIT = ['Personal', 'Imobiliar', 'Refinantare', 'Prima Casa', 'Business'];

interface BrokerInfo {
  slug: string;
  name: string;
  photo?: string;
  bio?: string;
  firma?: string;
  judet?: string;
  phone?: string;
}

export default function PublicApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nume: '', prenume: '', telefon: '', email: '', judet: '', tipCredit: '',
    salariuNet: '', sumaDorita: ''
  });
  const [agreed, setAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    publicApplyApi.getBrokerProfile(slug)
      .then(setBroker)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    try {
      await publicApplyApi.apply(slug, {
        nume: form.nume,
        prenume: form.prenume || undefined,
        telefon: form.telefon,
        email: form.email || undefined,
        judet: form.judet || undefined,
        tipCredit: form.tipCredit || undefined,
        salariuNet: form.salariuNet ? Number(form.salariuNet) : undefined,
        sumaDorita: form.sumaDorita ? Number(form.sumaDorita) : undefined,
        utmSource: searchParams.get('utm_source') ?? undefined,
        utmMedium: searchParams.get('utm_medium') ?? undefined,
        utmCampaign: searchParams.get('utm_campaign') ?? undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare. Incearca din nou.');
    } finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gray-400 text-lg">Brokerul nu a fost gasit.</p>
        <a href="https://moneyshop.ro" className="text-brand-primary text-sm mt-2 block hover:underline">
          moneyshop.ro
        </a>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cerere trimisa!</h2>
        <p className="text-gray-500 text-sm">
          {broker?.name} te va contacta in cel mai scurt timp.
        </p>
        <p className="text-xs text-gray-400 mt-4">MoneyShop — platforma ta de credite</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          {broker?.photo ? (
            <img src={broker.photo} alt={broker.name}
              className="w-20 h-20 rounded-full object-cover object-top mx-auto mb-3 border-2 border-white shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-brand-primary">{broker?.name?.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">{broker?.name}</h1>
          {broker?.firma && <p className="text-sm text-gray-500">{broker.firma}</p>}
          {broker?.bio && <p className="text-sm text-gray-600 mt-2 max-w-xs mx-auto">{broker.bio}</p>}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />
            <span className="text-xs text-gray-500">MoneyShop</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-1 text-lg">Solicita consultanta</h2>
          <p className="text-sm text-gray-500 mb-5">Completeaza formularul si {broker?.name} te va contacta gratuit</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Nume *" value={form.nume} onChange={v => set('nume', v)} required />
              <F label="Prenume" value={form.prenume} onChange={v => set('prenume', v)} />
            </div>

            <F label="Telefon *" value={form.telefon} onChange={v => set('telefon', v)} required type="tel" placeholder="07XXXXXXXX" />
            <F label="Email" value={form.email} onChange={v => set('email', v)} type="email" placeholder="email@exemplu.ro" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Judet</label>
                <select value={form.judet} onChange={e => set('judet', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white">
                  <option value="">Selecteaza</option>
                  {JUDETE.map(j => <option key={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tip credit</label>
                <select value={form.tipCredit} onChange={e => set('tipCredit', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white">
                  <option value="">Selecteaza</option>
                  {TIP_CREDIT.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="Salariu net (RON)" value={form.salariuNet} onChange={v => set('salariuNet', v)} type="number" placeholder="3000" />
              <F label="Suma dorita (RON)" value={form.sumaDorita} onChange={v => set('sumaDorita', v)} type="number" placeholder="50000" />
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" required checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-indigo-600" />
                <span className="text-xs text-gray-600">Sunt de acord cu <a href="/legal" className="text-indigo-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">termenii și condițiile de utilizare</a>. Sunt de acord cu politica de prelucrare a datelor. Am peste 18 ani.*</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-indigo-600" />
                <span className="text-xs text-gray-600">Vreau să primesc informări prin email referitoare la noutăți despre dobânzi la credite și oferte bancare.</span>
              </label>
            </div>
            <button type="submit" disabled={submitting || !agreed}
              className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 mt-2">
              {submitting ? 'Se trimite...' : 'Solicita consultanta gratuita'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Datele tale sunt securizate. Nu primesti spam.
          </p>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, required, type = 'text', placeholder }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
    </div>
  );
}
