import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, Download, Eye, FileText, Folder, FolderPlus, Landmark, Loader2, Trash2, Upload } from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { acordApi } from '@/services/api/acordApi';
import { apiErrorMessage } from '@/services/api/brokersApi';
import { downloadBlob } from '@/lib/downloadBlob';
import type { ClientDocumentInfo, CrmClientDetail } from '@/types/crm.types';
import type { DocumentPreviewSource } from '@/components/crm/DocumentPreviewModal';
import { BANK_NAMES, fileLabel } from '@/components/crm/acord/acordLabels';
import { dateShort, docTypeLabel, FOCUS_RING } from '@/pages/crm/crmHelpers';

interface FolderItem {
  key: string;
  title: string;
  sub: string;
  fileName?: string;
  mimeType?: string;
  load?: () => Promise<Blob>;
  /** Set for the broker's own uploads, which they can delete. */
  documentId?: number;
}

interface FolderDef {
  key: string;
  title: string;
  folder: string;
  bankName?: string;
  items: FolderItem[];
}

const ACORD_TYPES = ['id_front', 'id_back', 'selfie', 'proof_of_address', 'signature', 'signed_agreement', 'mango_agreement'];
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,application/pdf,image/*';

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const bankKey = (name: string) => name.trim().toLowerCase();

/** The bank code in an agreement file type: bank_ing_consimtamant → ing; procredit_consent → procredit. */
function bankCodeOf(fileType: string): string | null {
  if (fileType === 'procredit_consent' || fileType === 'bank_consent_procredit') return 'procredit';
  if (fileType.startsWith('bank_')) return fileType.split('_')[1] ?? null;
  return null;
}

function upload(doc: ClientDocumentInfo): FolderItem {
  return {
    key: `u${doc.id}`,
    title: doc.fileName,
    sub: `${dateShort(doc.createdAt)} · ${size(doc.fileSize)} · încărcat de broker`,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    load: () => crmApi.documentBlob(doc.id),
    documentId: doc.id,
  };
}

/**
 * "Dosarul clientului": every document of the client in one place, grouped into folders —
 * Acord, Venituri, Biroul de Credit, one folder per bank, Altele. The broker uploads into any folder.
 */
export function ClientFolderCard({ client, onPreview, preparingBankDocs = false }: { client: CrmClientDetail; onPreview: (s: DocumentPreviewSource) => void; preparingBankDocs?: boolean }) {
  const userId = client.userId;
  const [uploads, setUploads] = useState<ClientDocumentInfo[]>([]);
  const [extraBanks, setExtraBanks] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busyFolder, setBusyFolder] = useState<string | null>(null);
  const [addingBank, setAddingBank] = useState(false);
  const [newBank, setNewBank] = useState('');
  const [catalogBanks, setCatalogBanks] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    crmApi.getBanks().then(b => { if (active) setCatalogBanks(b.map(x => x.name)); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const fileInput = useRef<HTMLInputElement>(null);
  const target = useRef<FolderDef | null>(null);

  useEffect(() => {
    let active = true;
    crmApi.listDocuments(userId)
      .then(d => { if (active) setUploads(d); })
      .catch(() => { if (active) toast.error('Nu am putut încărca documentele din dosar.'); });
    return () => { active = false; };
  }, [userId]);

  const folders = useMemo<FolderDef[]>(() => {
    const acordFiles = client.acord?.files ?? [];
    const acordItem = (f: (typeof acordFiles)[number]): FolderItem => ({
      key: f.fileId,
      title: fileLabel(f.fileType),
      sub: `${dateShort(f.createdAt)} · ${size(f.fileSize)}`,
      fileName: f.fileName,
      mimeType: f.mimeType,
      load: () => acordApi.adminFileBlob(f.fileId),
    });
    const of = (folder: string) => uploads.filter(u => u.folder === folder).map(upload);

    const acord: FolderDef = {
      key: 'ACORD', title: 'Acord și act de identitate', folder: 'ACORD',
      items: [...acordFiles.filter(f => ACORD_TYPES.includes(f.fileType)).map(acordItem), ...of('ACORD')],
    };

    const venituri: FolderDef = {
      key: 'VENITURI', title: 'Venituri', folder: 'VENITURI',
      items: [
        ...acordFiles.filter(f => f.fileType === 'anaf_income').map(acordItem),
        ...(client.anafFileName && !acordFiles.some(f => f.fileType === 'anaf_income')
          ? [{ key: 'anaf', title: 'Situație venituri ANAF', sub: `${client.anafFileName}${client.anafUploadedAt ? ` · ${dateShort(client.anafUploadedAt)}` : ''}`, fileName: client.anafFileName, mimeType: 'application/pdf', load: () => crmApi.getAnafBlob(userId) }]
          : []),
        ...of('VENITURI'),
      ],
    };

    const bc = client.bcReport;
    const bcFolder: FolderDef = {
      key: 'BC', title: 'Biroul de Credit', folder: 'BC',
      items: [
        ...(bc?.hasPdf
          ? [{ key: `bc${bc.id}`, title: 'Raport Biroul de Credit', sub: `din ${bc.reportDate ?? dateShort(bc.uploadedAt)}${bc.ficoScore != null ? ` · FICO ${bc.ficoScore}` : ''}`, fileName: bc.fileName || 'raport-bc.pdf', mimeType: 'application/pdf', load: () => crmApi.bcReportPdfBlob(userId, bc.id) }]
          : []),
        ...of('BC'),
      ],
    };

    // One folder per bank: banks with consents or signed bank documents, banks the broker uploaded to,
    // and banks the broker just added.
    const banks = new Map<string, FolderDef>();
    const bankFolder = (name: string) => {
      const k = bankKey(name);
      if (!banks.has(k)) banks.set(k, { key: `BANCA:${k}`, title: name, folder: 'BANCA', bankName: name, items: [] });
      return banks.get(k)!;
    };
    for (const c of client.acord?.bankConsents ?? []) bankFolder(BANK_NAMES[c.bankCode] ?? c.bankName);
    for (const f of acordFiles) {
      const code = bankCodeOf(f.fileType);
      if (code) bankFolder(BANK_NAMES[code] ?? code).items.push(acordItem(f));
    }
    for (const u of uploads.filter(x => x.folder === 'BANCA' && x.bankName)) bankFolder(u.bankName!).items.push(upload(u));
    for (const b of extraBanks) bankFolder(b);

    const altele: FolderDef = {
      key: 'ALTELE', title: 'Alte documente', folder: 'ALTELE',
      items: [
        ...acordFiles.filter(f => !ACORD_TYPES.includes(f.fileType) && f.fileType !== 'anaf_income' && !bankCodeOf(f.fileType)).map(acordItem),
        ...client.documents.map(d => ({ key: `m${d.id}`, title: docTypeLabel(d.docType), sub: `${d.fileName ? `${d.fileName} · ` : ''}${dateShort(d.createdAt)} · doar metadate` })),
        ...of('ALTELE'),
      ],
    };

    return [acord, venituri, bcFolder, ...[...banks.values()].sort((a, b) => a.title.localeCompare(b.title, 'ro')), altele];
  }, [client, uploads, extraBanks, userId]);

  const total = folders.reduce((s, f) => s + f.items.length, 0);

  const pickFiles = (folder: FolderDef) => {
    target.current = folder;
    fileInput.current?.click();
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const folder = target.current;
    if (!folder || files.length === 0) return;
    setBusyFolder(folder.key);
    let ok = 0;
    for (const file of files) {
      try {
        const doc = await crmApi.uploadDocument(userId, file, folder.folder, folder.bankName);
        setUploads(prev => [doc, ...prev]);
        ok++;
      } catch (err) {
        toast.error(apiErrorMessage(err, `Nu am putut încărca ${file.name}`));
      }
    }
    setBusyFolder(null);
    if (ok) toast.success(ok === 1 ? `Document adăugat în „${folder.title}”` : `${ok} documente adăugate în „${folder.title}”`);
  };

  const remove = async (item: FolderItem) => {
    if (!item.documentId || !window.confirm(`Ștergi „${item.title}” din dosar?`)) return;
    try {
      await crmApi.deleteDocument(item.documentId);
      setUploads(prev => prev.filter(u => u.id !== item.documentId));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Nu am putut șterge documentul'));
    }
  };

  const download = async (item: FolderItem) => {
    if (!item.load) return;
    try {
      downloadBlob(await item.load(), item.fileName ?? item.title);
    } catch {
      toast.error('Nu s-a putut descărca fișierul');
    }
  };

  const addBank = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBank.trim();
    if (!name) return;
    if (!folders.some(f => f.bankName && bankKey(f.bankName) === bankKey(name))) setExtraBanks(b => [...b, name]);
    setOpen(`BANCA:${bankKey(name)}`);
    setNewBank('');
    setAddingBank(false);
  };

  const btn = `inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 ${FOCUS_RING}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-brand-primary" />
          <h2 className="text-sm font-semibold text-slate-800">Dosarul clientului ({total})</h2>
        </div>
        {!addingBank && (
          <button type="button" onClick={() => setAddingBank(true)} className={btn}><FolderPlus className="h-3.5 w-3.5" /> Bancă</button>
        )}
      </div>

      {preparingBankDocs && (
        <div role="status" className="mb-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-primary" />
          <span>Se pregătesc documentele pentru bănci (ProCredit, Patria, ING, BT)… apar automat în câteva secunde.</span>
        </div>
      )}

      {addingBank && (
        <form onSubmit={addBank} className="mb-3 flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <input
            autoFocus
            list="ms-folder-banks"
            value={newBank}
            onChange={e => setNewBank(e.target.value)}
            placeholder="Ex.: Banca Transilvania"
            aria-label="Banca pentru care faci dosar"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
          />
          <datalist id="ms-folder-banks">{catalogBanks.map(b => <option key={b} value={b} />)}</datalist>
          <button type="submit" className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">Adaugă</button>
          <button type="button" onClick={() => setAddingBank(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">Renunță</button>
        </form>
      )}

      <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={onFiles} />

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {folders.map(f => {
          const isOpen = open === f.key;
          const Icon = f.folder === 'BANCA' ? Landmark : Folder;
          return (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : f.key)}
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 ${FOCUS_RING}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${f.items.length ? 'text-brand-primary' : 'text-slate-300'}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{f.title}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{f.items.length}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-slate-50 bg-slate-50/50 px-3.5 pb-3 pt-1">
                  {f.items.length === 0 && <p className="py-2 text-sm text-slate-400">Niciun document încă.</p>}
                  <ul className="divide-y divide-slate-100">
                    {f.items.map(item => (
                      <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-100"><FileText className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-700">{item.title}</div>
                            <div className="truncate text-xs text-slate-400">{item.sub}</div>
                          </div>
                        </div>
                        {item.load && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button type="button" onClick={() => onPreview({ title: item.title, fileName: item.fileName ?? item.title, mimeType: item.mimeType ?? 'application/octet-stream', load: item.load! })} className={btn}>
                              <Eye className="h-3.5 w-3.5" /> Vezi
                            </button>
                            <button type="button" onClick={() => download(item)} className={btn} aria-label={`Descarcă ${item.title}`}>
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            {item.documentId && (
                              <button type="button" onClick={() => remove(item)} className={`rounded-lg p-1.5 text-slate-300 hover:bg-white hover:text-rose-600 ${FOCUS_RING}`} aria-label={`Șterge ${item.title}`}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => pickFiles(f)}
                    disabled={busyFolder === f.key}
                    className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-600 hover:border-brand-primary hover:text-brand-primary disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    <Upload className="h-4 w-4" /> {busyFolder === f.key ? 'Se încarcă…' : `Încarcă în „${f.title}”`}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-400">PDF, poze (și din camera telefonului), Word sau Excel, până la 20 MB fiecare.</p>
    </div>
  );
}
