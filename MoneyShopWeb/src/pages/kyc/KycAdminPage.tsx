import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { kycApi, type KycPending, type KycDetails } from '@/services/api/kycApi';

export default function KycAdminPage() {
  const navigate = useNavigate();
  const [pendingList, setPendingList] = useState<KycPending[]>([]);
  const [selected, setSelected] = useState<KycDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const data = await kycApi.getAllPending();
      setPendingList(data);
    } catch {
      toast.error('Eroare la incarcarea listei');
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
    if (status === 'rejected' && !rejectionReason) {
      toast.error('Introdu motivul respingerii');
      return;
    }
    try {
      await kycApi.updateStatus(selected.kycId, status, status === 'rejected' ? rejectionReason : undefined);
      toast.success(`KYC ${status === 'verified' ? 'aprobat' : 'respins'}`);
      setSelected(null);
      setRejectionReason('');
      loadPending();
    } catch {
      toast.error('Eroare la actualizare');
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi
      </button>

      <h1 className="text-2xl font-bold text-light-100">Administrare KYC</h1>

      {selected ? (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-6 space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-light-60 hover:text-light-80">
            &larr; Inapoi la lista
          </button>
          <h2 className="text-lg font-semibold text-light-100">{selected.userName} ({selected.userEmail})</h2>
          <p className="text-sm text-light-60">Status: {selected.status} | Creat: {new Date(selected.createdAt).toLocaleDateString('ro-RO')}</p>

          {selected.files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-light-70">Fisiere ({selected.files.length})</h3>
              {selected.files.map(f => (
                <div key={f.fileId} className="bg-dark-600 rounded-xl p-4">
                  <p className="text-sm text-light-90">{f.fileName} ({f.fileType})</p>
                  {f.dataUri && (
                    <img src={f.dataUri} alt={f.fileName} className="mt-2 max-w-xs rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-dark-400">
            <button
              onClick={() => updateStatus('verified')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-success-500 text-white text-sm font-medium hover:bg-success-600 transition-colors"
            >
              <CheckCircle size={16} /> Aproba
            </button>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Motiv respingere"
                className="flex-1 h-10 px-3 rounded-lg bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-error-500 focus:outline-none"
              />
              <button
                onClick={() => updateStatus('rejected')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-error-500 text-white text-sm font-medium hover:bg-error-600 transition-colors"
              >
                <XCircle size={16} /> Respinge
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingList.length === 0 ? (
            <p className="text-center py-12 text-light-60">Nu exista cereri KYC in asteptare.</p>
          ) : (
            <div className="space-y-3">
              {pendingList.map(item => (
                <div key={item.kycId} className="flex items-center justify-between bg-dark-700 border border-dark-400 rounded-xl px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-light-90">{item.userName}</p>
                    <p className="text-xs text-light-60">{item.userEmail} &middot; {item.fileCount} fisiere</p>
                  </div>
                  <button
                    onClick={() => viewDetails(item.kycId)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-dark-600 text-sm text-light-80 hover:bg-dark-500 transition-colors"
                  >
                    <Eye size={14} /> Detalii
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
