import { useState, useEffect } from 'react';
import { ArrowLeft, Receipt, Plus, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { oblioApi, type OblioCompany, type OblioClient, type OblioInvoiceRequest } from '@/services/api/oblioApi';

export default function InvoicingPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<OblioCompany[]>([]);
  const [selectedCif, setSelectedCif] = useState('');
  const [clients, setClients] = useState<OblioClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    clientCif: '',
    clientName: '',
    seriesName: 'FCT',
    productName: '',
    productPrice: '',
    quantity: '1',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    oblioApi.getCompanies()
      .then(c => {
        setCompanies(c);
        if (c.length > 0) {
          setSelectedCif(c[0].cif);
          loadClients(c[0].cif);
        }
      })
      .catch(() => toast.error('Eroare la incarcarea companiilor'))
      .finally(() => setLoading(false));
  }, []);

  const loadClients = async (cif: string) => {
    try {
      const c = await oblioApi.getClients(cif);
      setClients(c);
    } catch {
      // clients may not exist yet
    }
  };

  const update = (field: string, value: string) =>
    setInvoiceForm(prev => ({ ...prev, [field]: value }));

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.productName || !invoiceForm.productPrice) {
      toast.error('Completeaza produsul si pretul');
      return;
    }
    setSubmitting(true);
    try {
      const request: OblioInvoiceRequest = {
        client: {
          cif: invoiceForm.clientCif || undefined,
          name: invoiceForm.clientName || undefined,
        },
        issueDate: new Date().toISOString().split('T')[0],
        seriesName: invoiceForm.seriesName,
        products: [{
          name: invoiceForm.productName,
          price: parseFloat(invoiceForm.productPrice),
          quantity: parseInt(invoiceForm.quantity) || 1,
          vatPercentage: 19,
          measuringUnit: 'buc',
          currency: 'RON',
        }],
      };
      const result = await oblioApi.createInvoice(selectedCif, request);
      toast.success(`Factura ${result.data?.seriesName}${result.data?.number} creata!`);
      setShowForm(false);
    } catch {
      toast.error('Eroare la crearea facturii');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi la profil
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-100 flex items-center gap-2">
          <Receipt size={24} className="text-brand-primary" /> Facturare Oblio
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          <Plus size={16} /> Factura noua
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Company selector */}
          {companies.length > 0 && (
            <div className="bg-dark-700 border border-dark-400 rounded-xl px-5 py-4">
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-light-60" />
                <select
                  value={selectedCif}
                  onChange={e => { setSelectedCif(e.target.value); loadClients(e.target.value); }}
                  className="flex-1 bg-transparent text-light-90 text-sm focus:outline-none"
                >
                  {companies.map(c => (
                    <option key={c.cif} value={c.cif} className="bg-dark-700">{c.company} ({c.cif})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Invoice form */}
          {showForm && (
            <form onSubmit={createInvoice} className="bg-dark-700 border border-dark-400 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-light-100">Factura noua</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-light-60 mb-1">CIF client</label>
                  <input
                    type="text"
                    value={invoiceForm.clientCif}
                    onChange={e => update('clientCif', e.target.value)}
                    placeholder="RO12345678"
                    className="w-full h-10 px-3 rounded-lg bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-light-60 mb-1">Nume client</label>
                  <input
                    type="text"
                    value={invoiceForm.clientName}
                    onChange={e => update('clientName', e.target.value)}
                    placeholder="Firma SRL"
                    className="w-full h-10 px-3 rounded-lg bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-light-60 mb-1">Produs / Serviciu *</label>
                <input
                  type="text"
                  value={invoiceForm.productName}
                  onChange={e => update('productName', e.target.value)}
                  placeholder="Serviciu intermediere credit"
                  className="w-full h-10 px-3 rounded-lg bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-light-60 mb-1">Pret (RON) *</label>
                  <input
                    type="number"
                    value={invoiceForm.productPrice}
                    onChange={e => update('productPrice', e.target.value)}
                    placeholder="500"
                    className="w-full h-10 px-3 rounded-lg bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-light-60 mb-1">Cantitate</label>
                  <input
                    type="number"
                    value={invoiceForm.quantity}
                    onChange={e => update('quantity', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-dark-600 border border-dark-400 text-light-90 text-sm placeholder:text-light-50 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-full bg-brand-primary text-white font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Se creeaza...' : 'Creeaza factura'}
              </button>
            </form>
          )}

          {/* Clients */}
          {clients.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-light-100 mb-3">Clienti</h2>
              <div className="space-y-2">
                {clients.slice(0, 10).map(c => (
                  <div key={c.cif} className="bg-dark-700 border border-dark-400 rounded-xl px-5 py-3">
                    <p className="text-sm font-medium text-light-90">{c.name}</p>
                    <p className="text-xs text-light-60">CIF: {c.cif} {c.email && `| ${c.email}`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
