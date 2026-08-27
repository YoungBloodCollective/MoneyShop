import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useBrokerAuthStore } from '@/store/brokerAuthStore';
import toast from 'react-hot-toast';

const JUDETE = [
  'Alba','Arad','Arges','Bacau','Bihor','Bistrita-Nasaud','Botosani','Braila','Brasov','Bucuresti',
  'Buzau','Calarasi','Caras-Severin','Cluj','Constanta','Covasna','Dambovita','Dolj','Galati',
  'Giurgiu','Gorj','Harghita','Hunedoara','Ialomita','Iasi','Ilfov','Maramures','Mehedinti',
  'Mures','Neamt','Olt','Prahova','Salaj','Satu Mare','Sibiu','Suceava','Teleorman','Timis',
  'Tulcea','Valcea','Vaslui','Vrancea'
];

export default function BrokerRegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useBrokerAuthStore();
  const [form, setForm] = useState({
    nume: '', prenume: '', email: '', password: '', telefon: '',
    firma: '', judet: ''
  });
  const [showPass, setShowPass] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Parola trebuie sa aiba minim 6 caractere.');
      return;
    }
    try {
      await register({
        nume: form.nume,
        prenume: form.prenume || undefined,
        email: form.email,
        password: form.password,
        telefon: form.telefon,
        firma: form.firma || undefined,
        judet: form.judet || undefined,
      });
      toast.success('Cont creat! 30 zile trial gratuit.');
      navigate('/broker/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Eroare la inregistrare.';
      toast.error(msg);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Deschide cont broker</h1>
          <p className="text-gray-500 mt-1 text-sm">30 zile trial gratuit — fara card necesar</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nume *</label>
                <input required value={form.nume} onChange={e => set('nume', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Ionescu" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prenume</label>
                <input value={form.prenume} onChange={e => set('prenume', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Ion" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="email@exemplu.ro" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon *</label>
              <input type="tel" required value={form.telefon} onChange={e => set('telefon', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="07XXXXXXXX" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Parola *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary pr-10"
                  placeholder="Minim 6 caractere" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Firma (optional)</label>
                <input value={form.firma} onChange={e => set('firma', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="SC Broker SRL" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Judet</label>
                <select value={form.judet} onChange={e => set('judet', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white">
                  <option value="">Selecteaza</option>
                  {JUDETE.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isLoading}
                className="w-full py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60">
                {isLoading ? 'Se creeaza contul...' : 'Creeaza cont gratuit'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Ai deja cont?{' '}
            <Link to="/broker/login" className="text-brand-primary font-medium hover:underline">Autentificare</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
