import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, Users, Upload, Phone, Mail, ChevronDown, ChevronLeft, ChevronRight, BadgeCheck, MessageCircle } from 'lucide-react';
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
  const [showDirectory, setShowDirectory] = useState(false);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  useEffect(() => { loadBrokers(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadBrokers(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadBrokers = async (q?: string) => {
    setLoading(true);
    try {
      const res = await brokerApi.searchBrokers(q, 500);
      setBrokers(res.brokers || []);
    } catch {
      toast.error('Eroare la incarcarea brokerilor');
    } finally {
      setLoading(false);
    }
  };

  const paginatedBrokers = brokers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(brokers.length / PAGE_SIZE);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

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

  // The first active broker is the "assigned" broker for this user
  const myBroker = brokers.find(b => b.status === 'active');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <h1 className="text-2xl font-bold text-light-100 flex items-center gap-2">
        <Users size={24} className="text-brand-primary" /> Brokerul meu
      </h1>

      {/* My broker card */}
      {!loading && myBroker && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {myBroker.fullName?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-light-100">{myBroker.fullName}</h2>
                <BadgeCheck size={16} className="text-brand-primary" />
              </div>
              {myBroker.firmName && (
                <p className="text-sm text-light-60">{myBroker.firmName}</p>
              )}
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-success-500/15 text-success-400">
                Broker activ
              </span>
            </div>
          </div>

          {/* Contact actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {myBroker.publicPhone && (
              <a
                href={`tel:${myBroker.publicPhone}`}
                className="flex items-center justify-center gap-2 h-11 rounded-full bg-brand-primary text-white font-medium text-sm hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25"
              >
                <Phone size={16} /> Suna acum
              </a>
            )}
            {myBroker.publicEmail && (
              <a
                href={`mailto:${myBroker.publicEmail}`}
                className="flex items-center justify-center gap-2 h-11 rounded-full border border-dark-400 text-light-80 font-medium text-sm hover:border-brand-primary/30 hover:text-light-100 transition-all"
              >
                <Mail size={16} /> Trimite email
              </a>
            )}
            {!myBroker.publicPhone && !myBroker.publicEmail && (
              <button
                onClick={() => toast('Functie in curand disponibila', { icon: '💬' })}
                className="flex items-center justify-center gap-2 h-11 rounded-full bg-brand-primary text-white font-medium text-sm hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25 col-span-2"
              >
                <MessageCircle size={16} /> Contacteaza brokerul
              </button>
            )}
          </div>

          {/* Broker details */}
          <div className="mt-5 pt-5 border-t border-dark-400 space-y-2">
            {myBroker.firmCui && (
              <div className="flex justify-between text-xs">
                <span className="text-light-50">CUI Firma</span>
                <span className="text-light-80">{myBroker.firmCui}</span>
              </div>
            )}
            {myBroker.publicEmail && (
              <div className="flex justify-between text-xs">
                <span className="text-light-50">Email</span>
                <span className="text-light-80">{myBroker.publicEmail}</span>
              </div>
            )}
            {myBroker.publicPhone && (
              <div className="flex justify-between text-xs">
                <span className="text-light-50">Telefon</span>
                <span className="text-light-80">{myBroker.publicPhone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !myBroker && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
          <Users size={40} className="mx-auto text-light-50 mb-3 opacity-40" />
          <h2 className="text-lg font-semibold text-light-100 mb-1">Niciun broker asignat</h2>
          <p className="text-sm text-light-50 mb-4">Un broker va fi asignat automat cand depui prima aplicatie.</p>
          <button
            onClick={() => navigate('/dashboard/apply')}
            className="px-6 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-all"
          >
            Depune o aplicatie
          </button>
        </div>
      )}

      {/* Expandable broker directory */}
      <div>
        <button
          onClick={() => setShowDirectory(!showDirectory)}
          className="flex items-center gap-2 text-sm text-light-60 hover:text-light-80 transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform ${showDirectory ? 'rotate-180' : ''}`} />
          {showDirectory ? 'Ascunde directorul' : 'Vezi toti brokerii autorizati'}
        </button>

        {showDirectory && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-light-80">Director brokeri</p>
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
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : brokers.length === 0 ? (
              <p className="text-center py-8 text-light-60">
                {search ? 'Niciun broker gasit' : 'Nu exista brokeri in director'}
              </p>
            ) : (
              <>
                <p className="text-xs text-light-50">{brokers.length} brokeri gasiti</p>
                <div className="space-y-2">
                  {paginatedBrokers.map(b => (
                    <div key={b.brokerId} className="bg-dark-700 border border-dark-400 rounded-xl px-4 py-3 hover:border-brand-primary/20 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-light-90">{b.fullName}</p>
                          <p className="text-xs text-light-60 mt-0.5">
                            {b.firmName && `${b.firmName}`}
                            {b.firmCui && ` (CUI: ${b.firmCui})`}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          b.status === 'active' ? 'bg-success-500/15 text-success-400' : 'bg-light-50/15 text-light-60'
                        }`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dark-400 text-light-70 hover:text-light-90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft size={14} /> Inapoi
                    </button>
                    <span className="text-sm text-light-60">Pagina {page} din {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dark-400 text-light-70 hover:text-light-90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Inainte <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
