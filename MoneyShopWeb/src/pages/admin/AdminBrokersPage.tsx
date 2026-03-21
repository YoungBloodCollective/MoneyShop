import { useState, useEffect, useRef } from 'react';
import { Search, Users, Upload, FileSpreadsheet, Calendar, HardDrive, BadgeCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { brokerApi, type BrokerInfo, type BrokerDirectoryInfo } from '@/services/api/brokerApi';

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<BrokerInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [directory, setDirectory] = useState<BrokerDirectoryInfo | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [brokersRes, dirRes] = await Promise.all([
        brokerApi.searchBrokers(undefined, 500),
        brokerApi.getLatestDirectory(),
      ]);
      setBrokers(brokersRes.brokers || []);
      setDirectory(dirRes);
    } catch {
      toast.error('Eroare la incarcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    brokerApi.searchBrokers(search || undefined, 500)
      .then(res => setBrokers(res.brokers || []))
      .catch(() => toast.error('Eroare la cautare'))
      .finally(() => setLoading(false));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await brokerApi.uploadExcel(file, uploadNotes || undefined);
      toast.success('Director incarcat cu succes!');
      setUploadNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadAll();
    } catch {
      toast.error('Eroare la incarcarea fisierului');
    } finally {
      setUploading(false);
    }
  };

  const activeBrokers = brokers.filter(b => b.status === 'active');
  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statCards = [
    { label: 'Total brokeri', value: brokers.length, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/15' },
    { label: 'Brokeri activi', value: activeBrokers.length, icon: BadgeCheck, color: 'text-success-500', bg: 'bg-success-500/15' },
    { label: 'Ultima actualizare', value: directory ? new Date(directory.uploadedAt).toLocaleDateString('ro-RO') : '-', icon: Calendar, color: 'text-warning-500', bg: 'bg-warning-500/15', isText: true },
    { label: 'Fisier curent', value: directory ? fmtSize(directory.fileSize) : '-', icon: HardDrive, color: 'text-brand-secondary', bg: 'bg-brand-secondary/15', isText: true },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center">
          <Users size={22} className="text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-light-100">Director Brokeri</h1>
          <p className="text-light-60 text-sm">Gestioneaza lista de brokeri autorizati</p>
        </div>
      </div>
      {loading && !brokers.length ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(s => (
              <div key={s.label} className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <s.icon size={18} className={s.color} />
                  </div>
                </div>
                <p className="text-xs text-light-50 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-xl font-bold text-light-100">{s.isText ? s.value : s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={20} className="text-brand-primary" />
              <h2 className="text-lg font-semibold text-light-100">Incarca director nou</h2>
            </div>
            {directory && (
              <div className="bg-dark-600 rounded-xl p-4 mb-4">
                <p className="text-xs text-light-50 uppercase tracking-wider mb-2">Fisier curent</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-success-400" />
                    <span className="text-sm text-light-90 font-medium">{directory.fileName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-light-60">
                    <span>{fmtSize(directory.fileSize)}</span>
                    <span>{fmtDate(directory.uploadedAt)}</span>
                  </div>
                </div>
                {directory.notes && (
                  <p className="text-xs text-light-50 mt-2 italic">Note: {directory.notes}</p>
                )}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-light-60 mb-1 block">Note (optional)</label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  placeholder="ex: Actualizare Q1 2026, adaugat 5 brokeri noi..."
                  className="w-full h-10 px-3.5 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 text-sm focus:border-brand-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all ${
                  uploading
                    ? 'bg-dark-600 text-light-50 cursor-wait'
                    : 'bg-brand-primary text-white hover:bg-brand-primary/90 hover:shadow-lg hover:shadow-brand-primary/25'
                }`}>
                  <Upload size={16} />
                  {uploading ? 'Se incarca...' : 'Incarca Excel (.xlsx)'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <div className="flex items-center gap-1.5 text-xs text-light-50">
                  <AlertCircle size={12} />
                  <span>Max 10 MB. Fisierul va inlocui directorul curent.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-light-100">Brokeri ({brokers.length})</h2>
            </div>
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
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : brokers.length === 0 ? (
              <div className="bg-dark-700 border border-dark-400 rounded-2xl p-8 text-center">
                <Users size={40} className="mx-auto text-light-50 mb-3 opacity-40" />
                <p className="text-light-60">
                  {search ? 'Niciun broker gasit pentru cautarea ta.' : 'Nu exista brokeri. Incarca un fisier Excel pentru a popula directorul.'}
                </p>
              </div>
            ) : (
              <div className="bg-dark-700 border border-dark-400 rounded-2xl overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 border-b border-dark-400 text-xs text-light-50 uppercase tracking-wider">
                  <span className="col-span-4">Nume</span>
                  <span className="col-span-3">Firma</span>
                  <span className="col-span-2">CUI</span>
                  <span className="col-span-2">Contact</span>
                  <span className="col-span-1 text-right">Status</span>
                </div>
                <div className="divide-y divide-dark-400">
                  {brokers.map(b => (
                    <div key={b.brokerId} className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 px-5 py-3 hover:bg-dark-600/50 transition-colors">
                      <div className="sm:col-span-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary text-xs font-bold flex-shrink-0">
                          {b.fullName?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                        <span className="text-sm font-medium text-light-90 truncate">{b.fullName}</span>
                      </div>
                      <div className="sm:col-span-3 flex items-center">
                        <span className="text-sm text-light-60 truncate">{b.firmName || '-'}</span>
                      </div>
                      <div className="sm:col-span-2 flex items-center">
                        <span className="text-xs text-light-50 font-mono">{b.firmCui || '-'}</span>
                      </div>
                      <div className="sm:col-span-2 flex items-center">
                        <span className="text-xs text-light-50 truncate">{b.publicEmail || b.publicPhone || '-'}</span>
                      </div>
                      <div className="sm:col-span-1 flex items-center justify-end">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          b.status === 'active' ? 'bg-success-500/15 text-success-400' : 'bg-light-50/15 text-light-60'
                        }`}>
                          {b.status === 'active' ? 'Activ' : b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
