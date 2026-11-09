import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, CalendarDays, CheckCircle2, XCircle,
  FileText, FolderKanban, Wallet, ShieldCheck, TrendingUp, Send,} from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { crediusApi } from '@/services/api/crediusApi';
import type { CrmClientDetail } from '@/types/crm.types';
import { Spinner, StatusPill, money, dateShort, initials, creditTypeLabel } from './crmShared';

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

export default function CrmClientDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<CrmClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    crmApi.getClient(Number(userId))
      .then(d => { if (active) setClient(d); })
      .catch(() => { if (active) setNotFound(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const refreshClient = () => crmApi.getClient(Number(userId)).then(setClient).catch(() => undefined);

  if (loading) return <Spinner />;
  if (notFound || !client) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/crm/clienti')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Înapoi la clienți
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Clientul nu a fost găsit.</div>
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{client.fullName}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {client.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{client.phone}{client.phoneVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}</span>}
              {client.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{client.email}{client.emailVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}</span>}
              {client.birthDate && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateShort(client.birthDate)}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: files + documents */}
        <div className="space-y-4 lg:col-span-2">
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

          <Card title={`Documente (${client.documents.length})`} icon={FileText}>
            {client.documents.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Niciun document încărcat</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {client.documents.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileText className="h-4 w-4" /></div>
                      <div>
                        <div className="font-medium text-slate-700">{d.fileName ?? d.docType}</div>
                        <div className="text-xs text-slate-400">{d.docType} · {dateShort(d.createdAt)}</div>
                      </div>
                    </div>
                    {d.fileSize != null && <span className="text-xs text-slate-400">{(d.fileSize / 1024).toFixed(0)} KB</span>}
                  </div>
                ))}
              </div>
            )}
          </Card>
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
                  <StatusPill status={client.kyc.status} />
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

          <AnafCard client={client} userId={Number(userId)} onChange={refreshClient} />

          <Card title="Rezumat" icon={Wallet}>
            <InfoRow label="Total dosare" value={client.files.length} />
            <InfoRow label="Debursat" value={money(client.files.filter(x => x.status === 'DISBURSAT').reduce((s, x) => s + (x.sumaAprobata ?? 0), 0))} />
          </Card>
        </div>
      </div>
    </div>
  );
}
