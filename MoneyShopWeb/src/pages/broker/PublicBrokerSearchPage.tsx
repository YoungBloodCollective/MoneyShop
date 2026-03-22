import { useState, useEffect } from 'react';
import { Search, Users, BadgeCheck } from 'lucide-react';

import toast from 'react-hot-toast';
import { brokerApi, type BrokerInfo } from '@/services/api/brokerApi';

export default function PublicBrokerSearchPage() {
  const [brokers, setBrokers] = useState<BrokerInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrokers();
  }, []);

  const loadBrokers = async (q?: string) => {
    setLoading(true);
    try {
      const res = await brokerApi.searchBrokers(q, 50);
      setBrokers(res.brokers || []);
    } catch {
      toast.error('Eroare la incarcarea brokerilor');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBrokers(search);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Users size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verifica un broker</h1>
          <p className="text-sm text-gray-500">Cauta in directorul oficial al intermediarilor de credit</p>
        </div>
      </div>
          <form onSubmit={handleSearch} className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cauta broker dupa nume, firma sau CUI..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            />
          </form>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : brokers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <Users size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {search ? 'Niciun broker gasit pentru cautarea ta.' : 'Nu exista brokeri in director.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 px-1">{brokers.length} brokeri gasiti</p>
              {brokers.map(b => (
                <div
                  key={b.brokerId}
                  className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {b.fullName?.charAt(0)?.toUpperCase() || 'B'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900">{b.fullName}</p>
                          {b.status === 'active' && (
                            <BadgeCheck size={14} className="text-blue-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.firmName && `${b.firmName}`}
                          {b.firmCui && ` · CUI: ${b.firmCui}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        b.status === 'active'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {b.status === 'active' ? 'Activ' : b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Toti brokerii listati sunt autorizati de ASF (Autoritatea de Supraveghere Financiara) si
          inregistrati in directorul oficial al intermediarilor de credit.
        </p>
      </div>
    </div>
  );
}
