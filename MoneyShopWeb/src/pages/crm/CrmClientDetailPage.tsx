import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, CalendarDays, CheckCircle2, XCircle,
  FileText, FolderKanban, Wallet, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import type { CrmClientDetail } from '@/types/crm.types';
import { Spinner, StatusPill, money, dateShort, initials } from './crmShared';

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
                        {file.typeCredit ?? 'credit'} · {money(file.requestedAmount)}{file.requestedTermMonths ? ` · ${file.requestedTermMonths} luni` : ''} · {dateShort(file.createdAt)}
                      </div>
                    </div>
                    {file.sumaAprobata != null && (
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Aprobat</div>
                        <div className="font-semibold text-emerald-600">{money(file.sumaAprobata)}</div>
                      </div>
                    )}
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

          <Card title="Rezumat" icon={Wallet}>
            <InfoRow label="Total dosare" value={client.files.length} />
            <InfoRow label="Debursat" value={money(client.files.filter(x => x.status === 'DISBURSAT').reduce((s, x) => s + (x.sumaAprobata ?? 0), 0))} />
          </Card>
        </div>
      </div>
    </div>
  );
}
