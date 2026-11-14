import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, CalendarDays, CheckCircle2, XCircle,
  FileText, FolderKanban, Wallet, ShieldCheck, TrendingUp, Send,
  MessageCircle, ExternalLink, PenLine, Download, Eye, Landmark, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { crediusApi } from '@/services/api/crediusApi';
import { acordApi } from '@/services/api/acordApi';
import { downloadBlob } from '@/lib/downloadBlob';
import type { CrmAcordSnapshot, CrmBcReportSnapshot, CrmClientDetail } from '@/types/crm.types';
import { BankConsentsSection } from '@/components/crm/acord/BankConsentsSection';
import { CnpField } from '@/components/crm/acord/CnpField';
import { TIP_ACT_LABELS, fileLabel, formatDateTime, whatsappLink } from '@/components/crm/acord/acordLabels';
import { CopyIntakeLinkButton } from '@/components/crm/CopyIntakeLinkButton';
import { DocumentPreviewModal, type DocumentPreviewSource } from '@/components/crm/DocumentPreviewModal';
import { Spinner, StatusPill, AcordPill, ErrorState } from './crmShared';
import { money, dateShort, initials, creditTypeLabel, docTypeLabel } from './crmHelpers';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-primary" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
      <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
    </div>
  );
}


function CrediusForwardButton({ applicationId }: { applicationId: number }) {
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!window.confirm('Confirmi că ai acordul clientului pentru a trimite datele către Credius?')) return;
    setSending(true);
    try {
      const r = await crediusApi.forward(applicationId);
      if (!r.configured) toast('Integrarea Credius nu este încă configurată.', { icon: 'ℹ️' });
      else if (r.success) toast.success('Trimis către Credius.');
      else toast.error(r.message || 'Credius a respins cererea.');
    } catch {
      toast.error('Nu am putut trimite către Credius.');
    } finally {
      setSending(false);
    }
  };
  return (
    <button
      onClick={send}
      disabled={sending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      <Send className="h-3.5 w-3.5" /> {sending ? 'Se trimite…' : 'Credius'}
    </button>
  );
}

function AnafCard({ client, userId, onChange }: { client: CrmClientDetail; userId: number; onChange: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await crmApi.uploadAnaf(userId, file);
      toast.success('Document ANAF încărcat.');
      onChange();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409
        ? 'Clientul nu are încă un acord — ANAF se atașează după acord.'
        : 'Nu am putut încărca documentul.');
    } finally {
      setBusy(false);
    }
  };

  const view = async () => {
    try {
      const blob = await crmApi.getAnafBlob(userId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Nu am putut deschide documentul.');
    }
  };

  return (
    <Card title="Venituri ANAF" icon={FileText}>
      {!client.canAttachAnaf ? (
        <p className="py-2 text-sm text-slate-400">Clientul nu are încă un acord — documentul ANAF se poate atașa după semnarea acordului.</p>
      ) : (
        <div className="space-y-3">
          {client.anafFileName ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-700">{client.anafFileName}</div>
                <div className="text-xs text-slate-400">{client.anafUploadedAt ? dateShort(client.anafUploadedAt) : ''}</div>
              </div>
              <button onClick={view} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Vezi</button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Niciun document ANAF încărcat.</p>
          )}
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" className="hidden" onChange={onPick} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
          >
            {busy ? 'Se încarcă…' : client.anafFileName ? 'Înlocuiește documentul' : 'Încarcă Situația ANAF (din SPV)'}
          </button>
        </div>
      )}
    </Card>
  );
}

function CheckState({ value }: { value?: boolean | null }) {
  if (value === true) return <span className="font-medium text-emerald-700">Trecută</span>;
  if (value === false) return <span className="font-medium text-amber-700">Nereușită</span>;
  return <span className="text-slate-500">Neefectuată</span>;
}

function ConsentValue({ yes, yesLabel, noLabel }: { yes?: boolean | null; yesLabel: string; noLabel: string }) {
  return <span className={yes ? 'font-medium text-emerald-700' : 'text-slate-600'}>{yes ? yesLabel : noLabel}</span>;
}

function OcrCheckPill({ label, ok }: { label: string; ok?: boolean | null }) {
  const cls = ok === true ? 'bg-emerald-50 text-emerald-700' : ok === false ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${cls}`}>
      {ok === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : ok === false ? <XCircle className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}

function AcordCard({ acord }: { acord: CrmAcordSnapshot }) {
  const ocr = acord.ocr;
  const signed = !!acord.signedAt;
  return (
    <Card title="Acord și semnături" icon={PenLine}>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <AcordPill status={acord.status} />
        {signed ? <span>semnat la {formatDateTime(acord.signedAt ?? undefined)}</span> : <span>început la {formatDateTime(acord.createdAt)}</span>}
      </div>
      <div className="divide-y divide-slate-50">
        {signed && (
          <>
            <InfoRow label="Prelucrare date" value={<span className="font-medium text-emerald-700">Acceptat</span>} />
            <InfoRow label="Comunicări comerciale" value={<ConsentValue yes={acord.marketingAccepted} yesLabel="Acceptat" noLabel="Refuzat" />} />
            <InfoRow label="Renunțare OUG 52/2016" value={<ConsentValue yes={acord.oug52Waived} yesLabel="Da" noLabel="Nu" />} />
          </>
        )}
        <InfoRow label="Tip act" value={acord.tipAct ? (TIP_ACT_LABELS[acord.tipAct] ?? acord.tipAct) : '—'} />
        <InfoRow label="Verificare facială" value={<CheckState value={acord.livenessPassed} />} />
        <InfoRow label="Potrivire cu actul" value={<CheckState value={acord.faceMatchPassed} />} />
        <InfoRow label="CNP" value={acord.cnpMasked || acord.cnpAvailable ? <CnpField acordId={acord.acordId} masked={acord.cnpMasked} available={acord.cnpAvailable} /> : '—'} />
        <InfoRow label="Adresă" value={<span className="text-right">{acord.address ?? ocr?.address ?? '—'}</span>} />
        {ocr && (
          <>
            <InfoRow label="Serie / număr act" value={[ocr.idSeries, ocr.idNumber].filter(Boolean).join(' ') || '—'} />
            <InfoRow label="Data nașterii" value={ocr.birthDate || '—'} />
            <InfoRow label="Valabil până la" value={ocr.expiryDate || '—'} />
            <InfoRow label="Încredere citire" value={ocr.confidenceScore != null ? `${Math.round(ocr.confidenceScore * 100)}%` : '—'} />
          </>
        )}
      </div>
      {ocr && (
        <div className="mt-3 flex flex-wrap gap-2">
          <OcrCheckPill label="CNP valid" ok={ocr.cnpChecksumValid} />
          <OcrCheckPill label="CNP ↔ data nașterii" ok={ocr.cnpBirthDateMatch} />
          <OcrCheckPill label="CNP ↔ sex" ok={ocr.cnpSexMatch} />
          <OcrCheckPill label="Act neexpirat" ok={ocr.documentNotExpired} />
        </div>
      )}
      {ocr && ocr.validationErrors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {ocr.validationErrors.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
        <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Notiță internă</span>
          <Link to={`/crm/acorduri/${acord.acordId}`} className="font-medium text-brand-primary hover:underline">Editează în acord</Link>
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{acord.reviewNote || <span className="text-slate-400">Nicio notiță</span>}</p>
      </div>
    </Card>
  );
}

function NoAcordCard() {
  return (
    <Card title="Acord și semnături" icon={PenLine}>
      <div className="flex flex-col items-start gap-3 py-2">
        <p className="text-sm text-slate-500">Clientul nu are încă un acord. Trimite-i linkul tău.</p>
        <CopyIntakeLinkButton />
      </div>
    </Card>
  );
}

function DocumentsCard({ client, onPreview }: { client: CrmClientDetail; onPreview: (source: DocumentPreviewSource) => void }) {
  const acordFiles = client.acord?.files ?? [];
  const total = acordFiles.length + client.documents.length;

  const download = async (fileId: string, fileName: string) => {
    try {
      downloadBlob(await acordApi.adminFileBlob(fileId), fileName);
    } catch {
      toast.error('Nu s-a putut descărca fișierul');
    }
  };

  return (
    <Card title={`Documente (${total})`} icon={FileText}>
      {total === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">Niciun document încărcat</p>
      ) : (
        <div className="space-y-4">
          {acordFiles.length > 0 && (
            <div className="divide-y divide-slate-50">
              {acordFiles.map(f => (
                <div key={f.fileId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileText className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-700">{fileLabel(f.fileType)}</div>
                      <div className="text-xs text-slate-400">{dateShort(f.createdAt)} · {(f.fileSize / 1024).toFixed(0)} KB</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => onPreview({ title: fileLabel(f.fileType), fileName: f.fileName, mimeType: f.mimeType, load: () => acordApi.adminFileBlob(f.fileId) })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" /> Vezi
                    </button>
                    <button
                      onClick={() => download(f.fileId, f.fileName)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" /> Descarcă
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {client.documents.length > 0 && (
            <div>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-slate-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documente dosar (metadate)</h3>
                <span className="text-xs text-slate-400">Doar metadate — fișierul nu este stocat</span>
              </div>
              <div className="divide-y divide-slate-50">
                {client.documents.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><FileText className="h-4 w-4" /></div>
                      <div>
                        <div className="font-medium text-slate-700">{docTypeLabel(d.docType)}</div>
                        <div className="text-xs text-slate-400">{d.fileName ? `${d.fileName} · ` : ''}{dateShort(d.createdAt)}</div>
                      </div>
                    </div>
                    {d.fileSize != null && <span className="text-xs text-slate-400">{(d.fileSize / 1024).toFixed(0)} KB</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function BcReportCard({ report, userId, onPreview }: { report?: CrmBcReportSnapshot | null; userId: number; onPreview: (source: DocumentPreviewSource) => void }) {
  const [showAccounts, setShowAccounts] = useState(false);

  if (!report) {
    return (
      <Card title="Raport Biroul de Credit" icon={Landmark}>
        <p className="py-2 text-sm text-slate-400">Clientul nu a încărcat raportul BC. Îl poate încărca din contul lui (Profil → Raport BC).</p>
      </Card>
    );
  }

  const pdfName = report.fileName || 'raport-bc.pdf';
  const loadPdf = () => crmApi.bcReportPdfBlob(userId);
  const download = async () => {
    try {
      downloadBlob(await loadPdf(), pdfName);
    } catch {
      toast.error('Nu am putut descărca raportul.');
    }
  };

  return (
    <Card title="Raport Biroul de Credit" icon={Landmark}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">Scor FICO</div>
          <div className="text-4xl font-bold leading-none text-slate-900">{report.ficoScore ?? '—'}</div>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>Raport din {report.reportDate ?? '—'}</div>
          <div>încărcat {dateShort(report.uploadedAt)}</div>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        <InfoRow label="Conturi active / total" value={`${report.activeAccounts} / ${report.totalAccounts}`} />
        <InfoRow label="Conturi cu restanțe" value={report.accountsWithArrears} />
        <InfoRow label="Obligații lunare" value={money(report.existingMonthlyObligations)} />
        <InfoRow label="Sumă datorată" value={money(report.totalAmountOwed)} />
        <InfoRow label="Restanțe totale" value={money(report.totalArrears)} />
        <InfoRow label="Întârziere maximă" value={report.maxCurrentDelay ?? '—'} />
        <InfoRow label="Interogări" value={report.inquiriesCount} />
        <InfoRow label="DPD 30 / 60 / 90+" value={`${report.dpd30Count ?? 0} / ${report.dpd60Count ?? 0} / ${report.dpd90PlusCount ?? 0}`} />
        <InfoRow label="IFN active" value={report.nonbankActiveNow ?? '—'} />
      </div>
      {report.accounts.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAccounts(v => !v)}
            aria-expanded={showAccounts}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showAccounts ? 'rotate-180' : ''}`} />
            {showAccounts ? 'Ascunde conturile' : `Vezi conturile (${report.accounts.length})`}
          </button>
          {showAccounts && (
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Creditor</th>
                    <th scope="col" className="px-3 py-2 font-medium">Tip</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Sold</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Restanță</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Zile</th>
                    <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {report.accounts.map((a, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{a.creditor ?? '—'}</td>
                      <td className="px-3 py-2">{a.accountType ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{a.currentBalance.toLocaleString('ro-RO')} {a.currency ?? ''}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right ${a.arrearsAmount > 0 ? 'font-medium text-rose-700' : ''}`}>{a.arrearsAmount.toLocaleString('ro-RO')}</td>
                      <td className={`px-3 py-2 text-right ${a.daysOverdue > 0 ? 'font-medium text-rose-700' : ''}`}>{a.daysOverdue}</td>
                      <td className="px-3 py-2">{a.status ?? (a.isActive ? 'Activ' : 'Închis')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {report.parseWarnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {report.parseWarnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}
      {report.hasPdf && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onPreview({ title: 'Raport Biroul de Credit', fileName: pdfName, mimeType: 'application/pdf', load: loadPdf })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> Vezi PDF
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" /> Descarcă
          </button>
        </div>
      )}
    </Card>
  );
}

export default function CrmClientDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<CrmClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<DocumentPreviewSource | null>(null);

  useEffect(() => {
    let active = true;
    crmApi.getClient(Number(userId))
      .then(d => { if (active) { setClient(d); setNotFound(false); setFailed(false); } })
      .catch(err => {
        if (!active) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) setNotFound(true);
        else setFailed(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, attempt]);

  const retry = () => { setLoading(true); setAttempt(a => a + 1); };

  const refreshClient = () => crmApi.getClient(Number(userId)).then(setClient).catch(() => undefined);

  if (loading) return <Spinner />;
  if (notFound || failed || !client) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/crm/clienti')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Înapoi la clienți
        </button>
        {notFound
          ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Clientul nu a fost găsit</div>
          : <ErrorState message="Nu am putut încărca clientul" onRetry={retry} />}
      </div>
    );
  }

  const f = client.financial;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/crm/clienti')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Înapoi la clienți
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-xl font-bold text-brand-primary">
            {initials(client.fullName)}
          </div>
          <div className="min-w-[14rem] flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{client.fullName}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {client.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{client.phone}{client.phoneVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}</span>}
              {client.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{client.email}{client.emailVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}</span>}
              {client.acordStatus && (
                <span className="flex items-center gap-2">
                  <AcordPill status={client.acordStatus} />
                  {client.acordSignedAt && <span>semnat la {dateShort(client.acordSignedAt)}</span>}
                </span>
              )}
              {client.birthDate && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateShort(client.birthDate)}</span>}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Phone className="h-4 w-4" /> Sună
              </a>
            )}
            {client.phone && (
              <a
                href={whatsappLink(client.phone, `Bună, ${client.fullName.split(' ')[0]}!`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {client.acord && (
              <Link to={`/crm/acorduri/${client.acord.acordId}`} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90">
                <ExternalLink className="h-4 w-4" /> Deschide acordul
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: files + documents */}
        <div className="space-y-4 lg:col-span-2">
          {client.acord ? <AcordCard acord={client.acord} /> : <NoAcordCard />}
          {client.acord && (
            <div className="[&>div]:mb-0">
              <BankConsentsSection
                acord={{
                  acordId: client.acord.acordId,
                  status: client.acord.status,
                  signedAt: client.acord.signedAt ?? undefined,
                  telefon: client.phone ?? '',
                  prenume: client.fullName.split(' ')[0],
                }}
                onSigned={() => { void refreshClient(); }}
              />
            </div>
          )}
          <Card title="Dosare" icon={FolderKanban}>
            {client.files.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Niciun dosar</p>
            ) : (
              <div className="space-y-2">
                {client.files.map(file => (
                  <div key={file.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">#{file.code}</span>
                        <StatusPill status={file.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {creditTypeLabel(file.typeCredit)} · {money(file.requestedAmount)}{file.requestedTermMonths ? ` · ${file.requestedTermMonths} luni` : ''} · {dateShort(file.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {file.sumaAprobata != null && (
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Aprobat</div>
                          <div className="font-semibold text-emerald-600">{money(file.sumaAprobata)}</div>
                        </div>
                      )}
                      <CrediusForwardButton applicationId={file.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <DocumentsCard client={client} onPreview={setPreview} />
        </div>

        {/* Right: financial + KYC */}
        <div className="space-y-4">
          <Card title="Profil financiar" icon={TrendingUp}>
            {f ? (
              <div className="divide-y divide-slate-50">
                <InfoRow label="Salariu net" value={money(f.salariuNet)} />
                <InfoRow label="Vechime" value={f.vechimeLuni != null ? `${f.vechimeLuni} luni` : '—'} />
                <InfoRow label="Credite active" value={f.nrCrediteBanci ?? '—'} />
                <InfoRow label="Sold total" value={money(f.soldTotal)} />
                <InfoRow label="DTI" value={f.dti != null ? `${f.dti}%` : '—'} />
                <InfoRow label="Scoring" value={f.scoring ?? '—'} />
                {f.recommendedLevel && <InfoRow label="Nivel recomandat" value={f.recommendedLevel} />}
              </div>
            ) : <p className="py-2 text-sm text-slate-400">Fără date financiare</p>}
          </Card>

          <Card title="Verificare identitate (KYC)" icon={ShieldCheck}>
            {client.kyc ? (
              <div className="space-y-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <AcordPill status={client.kyc.status} />
                </div>
                <Check ok={client.kyc.hasIdFront} label="CI față" />
                <Check ok={client.kyc.hasIdBack} label="CI verso" />
                <Check ok={client.kyc.hasSelfie} label="Selfie" />
                <Check ok={client.kyc.hasProofOfAddress} label="Dovadă adresă" />
                <Check ok={client.kyc.livenessPassed === true} label="Liveness" />
                <Check ok={client.kyc.faceMatchPassed === true} label="Face match" />
              </div>
            ) : <p className="py-2 text-sm text-slate-400">Fără acord/KYC</p>}
          </Card>

          <BcReportCard report={client.bcReport} userId={Number(userId)} onPreview={setPreview} />

          <AnafCard client={client} userId={Number(userId)} onChange={refreshClient} />

          <Card title="Rezumat" icon={Wallet}>
            <InfoRow label="Total dosare" value={client.files.length} />
            <InfoRow label="Debursat" value={money(client.files.filter(x => x.status === 'DISBURSAT').reduce((s, x) => s + (x.sumaAprobata ?? 0), 0))} />
          </Card>
        </div>
      </div>
      {preview && <DocumentPreviewModal key={preview.title} source={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
