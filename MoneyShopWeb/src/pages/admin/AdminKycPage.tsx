import { useEffect, useState } from 'react';
import {
  Search, Eye, CheckCircle, XCircle, ArrowLeft,
  UserCheck, Clock, FileImage, ZoomIn,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { kycApi, type KycPending, type KycDetails } from '@/services/api/kycApi';

export default function AdminKycPage() {
  const [pendingList, setPendingList] = useState<KycPending[]>([]);
  const [selected, setSelected] = useState<KycDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await kycApi.getAllPending();
      setPendingList(data);
    } catch {
      toast.error('Eroare la incarcarea listei KYC');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (kycId: string) => {
    try {
      const details = await kycApi.getDetails(kycId);
      setSelected(details);
    } catch {
      toast.error('Eroare la incarcarea detaliilor');
    }
  };

  const updateStatus = async (status: 'verified' | 'rejected') => {
    if (!selected) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Introdu motivul respingerii');
      return;
    }
    setUpdating(true);
    try {
      await kycApi.updateStatus(selected.kycId, status, status === 'rejected' ? rejectionReason : undefined);
      toast.success(`KYC ${status === 'verified' ? 'aprobat' : 'respins'} cu succes`);
      setSelected(null);
      setRejectionReason('');
      loadPending();
    } catch {
      toast.error('Eroare la actualizarea statusului');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = pendingList.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.userName.toLowerCase().includes(s) ||
      item.userEmail.toLowerCase().includes(s) ||
      item.kycId.toLowerCase().includes(s)
    );
  });

  const fileTypeLabels: Record<string, string> = {
    selfie: 'Selfie',
    id_front: 'CI - Fata',
    id_back: 'CI - Spate',
    proof_of_address: 'Dovada adresa',
  };

  // Zoomed image overlay
  if (zoomedImage) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        onClick={() => setZoomedImage(null)}
      >
        <img
          src={zoomedImage}
          alt="Document"
          className="max-w-full max-h-full rounded-lg object-contain"
        />
      </div>
    );
  }

  // Detail view
  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelected(null); setRejectionReason(''); }}
          className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80 transition-colors"
        >
          <ArrowLeft size={16} /> Inapoi la lista
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-light-100">Verificare KYC</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            selected.status === 'verified' ? 'bg-success-500/15 text-success-400' :
            selected.status === 'rejected' ? 'bg-error-500/15 text-error-400' :
            'bg-warning-500/15 text-warning-400'
          }`}>
            {selected.status === 'verified' ? 'Verificat' :
             selected.status === 'rejected' ? 'Respins' : 'In asteptare'}
          </span>
        </div>

        {/* User info */}
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-light-50 uppercase tracking-wider mb-1">Utilizator</p>
              <p className="text-sm font-medium text-light-90">{selected.userName}</p>
            </div>
            <div>
              <p className="text-xs text-light-50 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-medium text-light-90">{selected.userEmail}</p>
            </div>
            <div>
              <p className="text-xs text-light-50 uppercase tracking-wider mb-1">Data cerere</p>
              <p className="text-sm font-medium text-light-90">{new Date(selected.createdAt).toLocaleDateString('ro-RO')}</p>
            </div>
            <div>
              <p className="text-xs text-light-50 uppercase tracking-wider mb-1">Expira</p>
              <p className="text-sm font-medium text-light-90">{new Date(selected.expiresAt).toLocaleDateString('ro-RO')}</p>
            </div>
          </div>
        </div>

        {/* Files */}
        {selected.files.length > 0 && (
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4">
              Documente ({selected.files.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selected.files.map(f => (
                <div key={f.fileId} className="bg-dark-600 rounded-xl p-4 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileImage size={14} className="text-light-60" />
                      <p className="text-sm font-medium text-light-90">{fileTypeLabels[f.fileType] || f.fileType}</p>
                    </div>
                    <span className="text-xs text-light-50">{f.fileName}</span>
                  </div>
                  {f.dataUri && (
                    <div className="relative cursor-zoom-in" onClick={() => setZoomedImage(f.dataUri!)}>
                      <img
                        src={f.dataUri}
                        alt={f.fileName}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg flex items-center justify-center transition-colors">
                        <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {selected.status === 'pending' && (
          <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-4">Actiuni</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => updateStatus('verified')}
                disabled={updating}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-success-500 text-white text-sm font-medium hover:bg-success-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Aproba
              </button>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Motiv respingere..."
                  className="flex-1 h-11 px-3 rounded-xl bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-error-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => updateStatus('rejected')}
                  disabled={updating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-error-500 text-white text-sm font-medium hover:bg-error-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={16} /> Respinge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-success-500/15 flex items-center justify-center">
          <UserCheck size={22} className="text-success-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-light-100">Verificari KYC</h1>
          <p className="text-light-60 text-sm">Gestioneaza cererile de verificare a identitatii</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta dupa nume sau email..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-warning-500" />
            <span className="text-xs text-light-60 uppercase tracking-wider">In asteptare</span>
          </div>
          <p className="text-2xl font-bold text-light-100">{loading ? '-' : pendingList.length}</p>
        </div>
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileImage size={18} className="text-brand-primary" />
            <span className="text-xs text-light-60 uppercase tracking-wider">Total fisiere</span>
          </div>
          <p className="text-2xl font-bold text-light-100">
            {loading ? '-' : pendingList.reduce((sum, item) => sum + item.fileCount, 0)}
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <UserCheck size={48} className="mx-auto text-light-50 mb-4" />
          <p className="text-light-60">
            {search ? 'Niciun rezultat gasit' : 'Nu exista cereri KYC in asteptare'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.kycId}
              className="flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 hover:border-brand-primary/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-light-90">{item.userName}</p>
                <p className="text-xs text-light-60 mt-0.5">
                  {item.userEmail} &middot; {item.fileCount} fisiere &middot; {new Date(item.createdAt).toLocaleDateString('ro-RO')}
                </p>
              </div>
              <button
                onClick={() => viewDetails(item.kycId)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-dark-600 text-sm text-light-80 hover:bg-dark-500 transition-colors"
              >
                <Eye size={14} /> Detalii
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
