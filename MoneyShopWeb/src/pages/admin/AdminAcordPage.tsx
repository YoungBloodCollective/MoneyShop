import { useEffect, useState, useCallback } from 'react';
import {
  Search, ArrowLeft, Phone, Mail, Calendar, ShieldCheck, ShieldAlert,
  FileText, Download, Loader2, PenLine, AlertTriangle, Trash2, Megaphone,
  Check, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { acordApi, type AcordListItem, type AcordDetails, type AcordFileInfo } from '@/services/api/acordApi';

const FILE_LABELS: Record<string, string> = {
  id_front: 'Buletin - fata',
  id_back: 'Buletin - verso',
  selfie: 'Selfie',
  proof_of_address: 'Dovada de adresa',
  signature: 'Semnatura',
};

const TIP_ACT_LABELS: Record<string, string> = {
  buletin: 'Buletin',
  buletin_electronic: 'Buletin Electronic',
  carte_identitate: 'Carte de identitate',
};

const STATUS_LABELS: Record<string, string> = {
  started: 'Inceput',
  documents: 'Documente incarcate',
  completed: 'Finalizat',
  rejected: 'Respins',
};

const STATUS_STYLES: Record<string, string> = {
  started: 'bg-dark-500 text-light-60',
  documents: 'bg-warning-500/15 text-warning-400',
  completed: 'bg-success-500/15 text-success-400',
  rejected: 'bg-error-500/15 text-error-400',
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-dark-500 text-light-60'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function FilePreview({ file }: { file: AcordFileInfo }) {
  const isImage = file.mimeType.startsWith('image/');
  const shouldLoad = !file.isDeleted && isImage;

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(shouldLoad);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!shouldLoad) return;

    let objectUrl: string | null = null;

    acordApi.adminFileBlob(file.fileId)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.fileId, shouldLoad]);

  const handleDownload = async () => {
    try {
      const blob = await acordApi.adminFileBlob(file.fileId);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Nu s-a putut descarca fisierul');
    }
  };

  if (file.isDeleted) {
    return (
      <div className="bg-dark-700 rounded-2xl p-4">
        <p className="text-sm font-medium text-light-70 mb-2">{FILE_LABELS[file.fileType] ?? file.fileType}</p>
        <div className="flex items-center gap-2 text-light-40 text-sm">
          <Trash2 size={16} />
          <span>Sters automat la expirarea perioadei de pastrare</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-light-80">{FILE_LABELS[file.fileType] ?? file.fileType}</p>
        <button onClick={handleDownload} className="text-light-50 hover:text-light-90" title="Descarca">
          <Download size={16} />
        </button>
      </div>

      {isImage ? (
        <div className="rounded-xl overflow-hidden bg-dark-800 min-h-[120px] flex items-center justify-center">
          {loading && <Loader2 size={22} className="text-light-40 animate-spin" />}
          {failed && <span className="text-sm text-error-400">Nu s-a putut incarca</span>}
          {url && <img src={url} alt={FILE_LABELS[file.fileType] ?? file.fileType} className="w-full object-contain max-h-72" />}
        </div>
      ) : (
        <button onClick={handleDownload} className="flex items-center gap-2 text-sm text-brand-primary">
          <FileText size={16} /> {file.fileName}
        </button>
      )}

      <p className="text-xs text-light-40 mt-2">
        Expira: {formatDate(file.expiresAt)}
      </p>
    </div>
  );
}

export default function AdminAcordPage() {
  const [items, setItems] = useState<AcordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<AcordDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await acordApi.adminList({ status: statusFilter || undefined });
      setItems(data);
    } catch {
      toast.error('Nu s-au putut incarca acordurile');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetails = async (acordId: string) => {
    setLoadingDetails(true);
    try {
      const details = await acordApi.adminDetails(acordId);
      setSelected(details);
      setReviewNote(details.reviewNote ?? '');
    } catch {
      toast.error('Nu s-au putut incarca detaliile');
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    try {
      await acordApi.adminUpdateStatus(selected.acordId, status, reviewNote || undefined);
      toast.success('Status actualizat');
      setSelected({ ...selected, status, reviewNote });
      setItems(prev => prev.map(i => i.acordId === selected.acordId ? { ...i, status } : i));
    } catch {
      toast.error('Nu s-a putut actualiza statusul');
    }
  };

  const filtered = items.filter(i => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      `${i.nume} ${i.prenume}`.toLowerCase().includes(s) ||
      i.telefon.includes(s) ||
      (i.email ?? '').toLowerCase().includes(s)
    );
  });

  // ── Detail view ──

  if (selected) {
    return (
      <div className="p-6 max-w-4xl">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-light-60 hover:text-light-90 mb-5"
        >
          <ArrowLeft size={18} /> Inapoi la lista
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-light-100">{selected.nume} {selected.prenume}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-light-60">
              <span className="flex items-center gap-1.5"><Phone size={14} /> {selected.telefon}</span>
              {selected.email && <span className="flex items-center gap-1.5"><Mail size={14} /> {selected.email}</span>}
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatDate(selected.createdAt)}</span>
            </div>
          </div>
          <StatusBadge status={selected.status} />
        </div>

        <div className="grid sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-dark-700 rounded-2xl p-4">
            <p className="text-xs text-light-50 mb-1">Tip act declarat</p>
            <p className="text-sm font-medium text-light-90">
              {selected.tipAct ? (TIP_ACT_LABELS[selected.tipAct] ?? selected.tipAct) : '—'}
            </p>
          </div>
          <div className="bg-dark-700 rounded-2xl p-4">
            <p className="text-xs text-light-50 mb-1">Semnatura</p>
            <p className="text-sm font-medium text-light-90 flex items-center gap-1.5">
              {selected.signedAt
                ? <><PenLine size={14} className="text-success-500" /> {formatDate(selected.signedAt)}</>
                : <span className="text-light-50">Nesemnat</span>}
            </p>
          </div>
          <div className="bg-dark-700 rounded-2xl p-4">
            <p className="text-xs text-light-50 mb-1">Verificare faciala</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              {selected.livenessPassed === true && <><ShieldCheck size={14} className="text-success-500" /> <span className="text-success-400">Trecuta</span></>}
              {selected.livenessPassed === false && <><ShieldAlert size={14} className="text-warning-400" /> <span className="text-warning-400">Nereusita</span></>}
              {selected.livenessPassed == null && (
                <span className="text-light-60">{selected.automaticChecksRan ? 'Neefectuata' : 'Indisponibila'}</span>
              )}
            </p>
          </div>
          <div className="bg-dark-700 rounded-2xl p-4">
            <p className="text-xs text-light-50 mb-1">Potrivire cu actul</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              {selected.faceMatchPassed === true && <span className="text-success-400">Da</span>}
              {selected.faceMatchPassed === false && <span className="text-warning-400">Nu</span>}
              {selected.faceMatchPassed == null && <span className="text-light-50">-</span>}
            </p>
          </div>
        </div>

        {(selected.livenessPassed === false || selected.faceMatchPassed === false) && (
          <div className="flex items-start gap-3 bg-warning-500/10 border border-warning-500/30 rounded-2xl p-4 mb-6">
            <AlertTriangle size={18} className="text-warning-400 shrink-0 mt-0.5" />
            <p className="text-sm text-warning-600">
              Verificarea faciala nu a trecut. Documentele au fost pastrate, dar identitatea
              nu a putut fi confirmata automat - verifica manual inainte de a folosi dosarul.
            </p>
          </div>
        )}

        <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-3">Documente</h2>
        {selected.files.length === 0 ? (
          <p className="text-sm text-light-50 mb-6">Niciun document incarcat.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {selected.files.map(f => <FilePreview key={f.fileId} file={f} />)}
          </div>
        )}

        {!selected.automaticChecksRan && (
          <div className="flex items-start gap-3 bg-info-400/10 border border-info-400/30 rounded-2xl p-4 mb-6">
            <AlertTriangle size={18} className="text-info-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-light-90 mb-1">
                Verificarea automata nu a rulat pentru acest dosar
              </p>
              <p className="text-sm text-light-70 leading-relaxed">
                Serviciul de citire a actului nu a fost disponibil, asa ca nu s-au extras
                date si nu s-a facut verificarea faciala. Documentele incarcate de client
                sunt complete si pot fi verificate manual mai sus.
              </p>
            </div>
          </div>
        )}

        <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-3">
          Date extrase din act
        </h2>

        {selected.ocr ? (
          <div className="bg-dark-700 rounded-2xl p-5 mb-6">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {([
                ['Nume', selected.ocr.lastName],
                ['Prenume', selected.ocr.firstName],
                ['CNP', selected.ocr.cnpMasked],
                ['Serie act', selected.ocr.idSeries],
                ['Numar act', selected.ocr.idNumber],
                ['Data nasterii', selected.ocr.birthDate],
                ['Sex', selected.ocr.sex],
                ['Loc nastere', selected.ocr.placeOfBirth],
                ['Cetatenie', selected.ocr.nationality],
                ['Emis de', selected.ocr.issuedBy],
                ['Data emiterii', selected.ocr.issueDate],
                ['Valabil pana la', selected.ocr.expiryDate],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm border-b border-dark-600 pb-2">
                  <span className="text-light-50 shrink-0">{label}</span>
                  <span className="text-light-90 text-right break-words">{value || '—'}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-4 text-sm mt-4">
              <span className="text-light-50 shrink-0">Adresa</span>
              <span className="text-light-90 text-right break-words">{selected.ocr.address || '—'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-dark-600">
              <span className="text-sm text-light-50">
                Tip act:{' '}
                <span className="text-light-90">
                  {selected.ocr.isNewFormat ? 'Carte de identitate electronica' : 'Buletin clasic'}
                </span>
              </span>
              {selected.ocr.confidenceScore != null && (
                <span className="text-sm text-light-50">
                  Incredere citire:{' '}
                  <span className="text-light-90">{Math.round(selected.ocr.confidenceScore * 100)}%</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {([
                ['CNP valid', selected.ocr.cnpChecksumValid],
                ['CNP ↔ data nasterii', selected.ocr.cnpBirthDateMatch],
                ['CNP ↔ sex', selected.ocr.cnpSexMatch],
                ['Act neexpirat', selected.ocr.documentNotExpired],
              ] as const).map(([label, ok]) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                    ok === true ? 'bg-success-500/15 text-success-600'
                      : ok === false ? 'bg-error-500/15 text-error-600'
                      : 'bg-dark-600 text-light-60'
                  }`}
                >
                  {ok === true ? <Check size={13} /> : ok === false ? <XCircle size={13} /> : null}
                  {label}
                </span>
              ))}
            </div>

            {selected.ocr.validationErrors.length > 0 && (
              <ul className="mt-4 space-y-1">
                {selected.ocr.validationErrors.map((e, i) => (
                  <li key={i} className="text-sm text-error-600 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-dark-700 rounded-2xl p-5 mb-6 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-light-50">CNP</span>
              <span className="text-light-90">
                {selected.cnpMasked ?? (selected.automaticChecksRan ? 'necitit' : 'neverificat')}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-light-50">Adresa</span>
              <span className="text-light-90 text-right">
                {selected.address ?? (selected.automaticChecksRan ? 'necitit' : 'neverificat')}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-light-50">Tip act</span>
              <span className="text-light-90">
                {selected.idIsNewFormat == null
                  ? (selected.automaticChecksRan ? 'necitit' : 'neverificat')
                  : selected.idIsNewFormat ? 'Carte de identitate electronica' : 'Buletin clasic'}
              </span>
            </div>
          </div>
        )}

        {selected.consentTextSnapshot && (
          <>
            <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-3">
              Acord semnat {selected.consentVersion && `(versiunea ${selected.consentVersion})`}
            </h2>
            <div className="bg-dark-700 rounded-2xl p-4 mb-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-light-50">Prelucrare date (intermediere)</span>
                <span className="text-success-600 font-medium">Acceptat</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-light-50">Comunicari comerciale</span>
                <span className={selected.marketingAccepted ? 'text-success-600 font-medium' : 'text-light-60'}>
                  {selected.marketingAccepted ? 'Acceptat' : 'Refuzat'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-light-50">Renuntare perioada OUG 52/2016</span>
                <span className={selected.oug52Waived ? 'text-success-600 font-medium' : 'text-light-60'}>
                  {selected.oug52Waived ? 'Da' : 'Nu'}
                </span>
              </div>
            </div>
            <div className="bg-dark-700 rounded-2xl p-4 mb-6">
              <p className="text-xs text-light-70 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {selected.consentTextSnapshot}
              </p>
              {selected.consentIp && (
                <p className="text-xs text-light-40 mt-3">Semnat de la IP {selected.consentIp}</p>
              )}
            </div>
          </>
        )}

        <h2 className="text-sm font-semibold text-light-60 uppercase tracking-wider mb-3">Actiuni</h2>
        <textarea
          value={reviewNote}
          onChange={e => setReviewNote(e.target.value)}
          placeholder="Notita interna..."
          rows={3}
          className="w-full px-4 py-3 rounded-2xl bg-dark-700 border border-dark-500 text-light-90 placeholder:text-light-40 focus:outline-none focus:border-brand-primary mb-3"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => updateStatus('completed')}
            className="px-5 py-2.5 rounded-full bg-success-500 text-white text-sm font-medium"
          >
            Marcheaza finalizat
          </button>
          <button
            onClick={() => updateStatus('rejected')}
            className="px-5 py-2.5 rounded-full bg-error-500 text-white text-sm font-medium"
          >
            Respinge
          </button>
        </div>
      </div>
    );
  }

  // ── List view ──

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-light-100">Acord clienti</h1>
          <p className="text-sm text-light-50 mt-1">
            Clienti care si-au incarcat actele prin linkul public.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-light-40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cauta dupa nume, telefon sau email..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-dark-700 border border-dark-500 text-light-90 placeholder:text-light-40 focus:outline-none focus:border-brand-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 rounded-2xl bg-dark-700 border border-dark-500 text-light-90 focus:outline-none focus:border-brand-primary"
        >
          <option value="">Toate statusurile</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-brand-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="text-light-40 mx-auto mb-3" />
          <p className="text-light-50">Niciun acord inregistrat inca.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <button
              key={item.acordId}
              onClick={() => openDetails(item.acordId)}
              disabled={loadingDetails}
              className="w-full flex items-center justify-between gap-4 bg-dark-700 hover:bg-dark-600 rounded-2xl px-5 py-4 text-left transition-colors disabled:opacity-60"
            >
              <div className="min-w-0">
                <p className="font-medium text-light-100 truncate">{item.nume} {item.prenume}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-light-50">
                  <span>{item.telefon}</span>
                  {item.email && <span className="truncate">{item.email}</span>}
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-light-50">{item.fileCount} fisiere</span>
                {item.isSigned && <PenLine size={14} className="text-success-500" />}
                {item.marketingAccepted && <Megaphone size={14} className="text-brand-primary" />}
                <StatusBadge status={item.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
