import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { brokerApi, type BrokerInfo } from '@/services/api/brokerApi';
import { useAuth } from '@/hooks/useAuth';

export default function BrokerDirectoryPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [brokers, setBrokers] = useState<BrokerInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadBrokers(); }, []);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await brokerApi.uploadExcel(file);
      toast.success('Director incarcat cu succes!');
      loadBrokers();
    } catch {
      toast.error('Eroare la incarcarea fisierului');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-100 flex items-center gap-2">
          <Users size={24} className="text-brand-primary" /> Director brokeri
        </h1>
        {isAdmin && (
          <label className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            uploading ? 'bg-dark-600 text-light-50' : 'bg-brand-primary text-white hover:bg-brand-primary/90'
          }`}>
            <Upload size={16} />
            {uploading ? 'Se incarca...' : 'Incarca Excel'}
            <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta broker dupa nume, firma sau CUI..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
        />
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : brokers.length === 0 ? (
        <p className="text-center py-12 text-light-60">
          {search ? 'Niciun broker gasit' : 'Nu exista brokeri in director'}
        </p>
      ) : (
        <div className="space-y-3">
          {brokers.map(b => (
            <div key={b.brokerId} className="bg-dark-700 border border-dark-400 rounded-xl px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-90">{b.fullName}</p>
                  <p className="text-xs text-light-60 mt-0.5">
                    {b.firmName && `${b.firmName}`}
                    {b.firmCui && ` (CUI: ${b.firmCui})`}
                  </p>
                  {(b.publicEmail || b.publicPhone) && (
                    <p className="text-xs text-light-50 mt-0.5">
                      {b.publicEmail} {b.publicPhone && `| ${b.publicPhone}`}
                    </p>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  b.status === 'active' ? 'bg-success-500/15 text-success-400' : 'bg-light-50/15 text-light-60'
                }`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
