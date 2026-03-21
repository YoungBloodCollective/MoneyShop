import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, ChevronDown, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { applicationsApi } from '@/services/api/applicationsApi';
import type { Application } from '@/types/application.types';
import { APPLICATION_STATUS_LABELS } from '@/utils/constants';

// Define the timeline flow — each application goes through these steps
const TIMELINE_STEPS = [
  { key: 'INREGISTRAT', label: 'Inregistrat', desc: 'Cererea ta a fost primita si inregistrata in sistem.' },
  { key: 'IN_ANALIZA', label: 'In analiza', desc: 'Un broker analizeaza dosarul tau si pregateste ofertele.' },
  { key: 'NEVOIE_DOCUMENTE', label: 'Nevoie documente', desc: 'Mai avem nevoie de cateva documente de la tine.' },
  { key: 'PREAPROBAT', label: 'Pre-aprobat', desc: 'Ai fost pre-aprobat! Pregatim oferta finala.' },
  { key: 'OFERTA_TRANSMISA', label: 'Oferta transmisa', desc: 'Ti-am trimis ofertele de la banci. Revizuieste-le.' },
  { key: 'ACCEPTAT_CLIENT', label: 'Acceptat', desc: 'Ai acceptat oferta. O transmitem la banca.' },
  { key: 'TRIMIS_LA_BANCA', label: 'Trimis la banca', desc: 'Dosarul tau este la banca pentru aprobare finala.' },
  { key: 'APROBAT_BANCA', label: 'Aprobat de banca', desc: 'Banca a aprobat cererea! Urmeaza disbursarea.' },
  { key: 'DISBURSAT', label: 'Disbursat', desc: 'Felicitari! Creditul a fost acordat cu succes.' },
];

const REJECTED_STEP = { key: 'RESPINS', label: 'Respins', desc: 'Din pacate, cererea nu a fost aprobata.' };

function getStatusColor(status: string) {
  if (status === 'APROBAT_BANCA' || status === 'DISBURSAT') return 'bg-success-500/15 text-success-400';
  if (status === 'RESPINS') return 'bg-error-500/15 text-error-400';
  return 'bg-warning-500/15 text-warning-400';
}

function getTimelineIndex(status: string) {
  return TIMELINE_STEPS.findIndex(s => s.key === status);
}

export default function ApplicationListPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    applicationsApi.getAll()
      .then(apps => setApplications(apps))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = applications.filter(a =>
    !search || (a.typeCredit || '').toLowerCase().includes(search.toLowerCase()) ||
    a.status.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-100">Aplicatiile mele</h1>
        <button
          onClick={() => navigate('/dashboard/apply')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25"
        >
          <Plus size={18} /> Aplicatie noua
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta aplicatii..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto text-light-50 mb-4" />
          <p className="text-light-60">{search ? 'Niciun rezultat gasit' : 'Nu ai aplicatii inca'}</p>
          <button
            onClick={() => navigate('/dashboard/apply')}
            className="mt-4 px-6 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-all hover:shadow-lg hover:shadow-brand-primary/25"
          >
            Depune prima aplicatie
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => {
            const isExpanded = expandedId === app.id;
            const isRejected = app.status === 'RESPINS';
            const currentIdx = getTimelineIndex(app.status);

            return (
              <div key={app.id} className="bg-dark-700 border border-dark-400 rounded-xl overflow-hidden hover:border-brand-primary/20 transition-all duration-200">
                {/* Header row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  className="flex items-center justify-between w-full px-5 py-4 text-left"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-light-90">{app.typeCredit || 'Credit'}</p>
                    <p className="text-xs text-light-60 mt-0.5">
                      {new Date(app.createdAt).toLocaleDateString('ro-RO')} &middot; #{app.id}
                      {app.requestedAmount ? ` \u00B7 ${app.requestedAmount.toLocaleString('ro-RO')} RON` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                      {APPLICATION_STATUS_LABELS[app.status] || app.status}
                    </span>
                    <ChevronDown size={16} className={`text-light-50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded timeline */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-dark-400/50">
                    <p className="text-xs text-light-50 uppercase tracking-wider mb-4">Parcurs aplicatie</p>

                    <div className="space-y-0">
                      {TIMELINE_STEPS.map((step, i) => {
                        const isPast = !isRejected && i <= currentIdx;
                        const isCurrent = !isRejected && i === currentIdx;
                        const isFuture = !isRejected && i > currentIdx;

                        return (
                          <div key={step.key} className="flex gap-3">
                            {/* Timeline line + dot */}
                            <div className="flex flex-col items-center w-6 flex-shrink-0">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isCurrent ? 'bg-brand-primary text-white' :
                                isPast ? 'bg-success-500 text-white' :
                                'bg-dark-500 text-light-50'
                              }`}>
                                {isPast && !isCurrent ? <CheckCircle size={12} /> :
                                 isCurrent ? <Clock size={12} /> :
                                 <span className="w-2 h-2 rounded-full bg-dark-300" />}
                              </div>
                              {i < TIMELINE_STEPS.length - 1 && (
                                <div className={`w-0.5 flex-1 min-h-[24px] ${
                                  isPast ? 'bg-success-500' : 'bg-dark-500'
                                }`} />
                              )}
                            </div>

                            {/* Step content */}
                            <div className={`pb-4 ${isFuture ? 'opacity-40' : ''}`}>
                              <p className={`text-sm font-medium ${
                                isCurrent ? 'text-brand-primary' :
                                isPast ? 'text-light-90' :
                                'text-light-50'
                              }`}>{step.label}</p>
                              {(isCurrent || isPast) && (
                                <p className="text-xs text-light-50 mt-0.5">{step.desc}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Rejected step */}
                      {isRejected && (
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center w-6 flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-error-500 text-white">
                              <AlertCircle size={12} />
                            </div>
                          </div>
                          <div className="pb-2">
                            <p className="text-sm font-medium text-error-400">{REJECTED_STEP.label}</p>
                            <p className="text-xs text-light-50 mt-0.5">{REJECTED_STEP.desc}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Disbursement info if approved */}
                    {(app.status === 'DISBURSAT' || app.status === 'APROBAT_BANCA') && app.sumaAprobata && (
                      <div className="mt-3 bg-success-500/10 border border-success-500/20 rounded-xl p-4">
                        <p className="text-sm font-medium text-success-400 mb-2">Detalii aprobare</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-light-50">Suma aprobata</span>
                            <p className="font-medium text-light-90">{app.sumaAprobata.toLocaleString('ro-RO')} RON</p>
                          </div>
                          {app.comision !== undefined && (
                            <div>
                              <span className="text-light-50">Comision</span>
                              <p className="font-medium text-light-90">{app.comision.toLocaleString('ro-RO')} RON</p>
                            </div>
                          )}
                          {app.dataDisbursare && (
                            <div>
                              <span className="text-light-50">Data disbursare</span>
                              <p className="font-medium text-light-90">{new Date(app.dataDisbursare).toLocaleDateString('ro-RO')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action button for rejected */}
                    {isRejected && (
                      <button
                        onClick={() => navigate('/dashboard/apply')}
                        className="mt-3 flex items-center gap-2 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                      >
                        Depune o noua aplicatie <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
