import { useEffect, useMemo, useState } from 'react';
import { Search, Phone, Mail, MapPin, AlertTriangle, MessageCircle, MessageSquare, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type LeadItem } from '@/services/api/adminApi';
import { whatsappLink } from '@/components/crm/acord/acordLabels';
import { PageHeader, SkeletonCards, EmptyState } from './crmShared';
import { money, dateShort, initials } from './crmHelpers';

const SOURCE_LABELS: Record<string, string> = {
  api: 'Formular',
  chat_state_machine: 'Chat',
  landing: 'Landing',
};

const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source;

const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

function LeadDrawer({
  lead, onClose, onSaved,
}: {
  lead: LeadItem; onClose: () => void; onSaved: (id: number, notes: string) => void;
}) {
  const [notes, setNotes] = useState(lead.adminNotes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateLeadNotes(lead.id, notes);
      toast.success('Notițe salvate');
      onSaved(lead.id, notes);
    } catch {
      toast.error('Eroare la salvarea notițelor');
    } finally {
      setSaving(false);
    }
  };

  const rows: [string, string][] = [
    ['Oraș', lead.oras || '-'],
    ['Venit net lunar', `${fmt(lead.venitNetLunar)} RON`],
    ['Bonuri de masă', lead.bonuriMasaAprox ? `${fmt(lead.bonuriMasaAprox)} RON` : '-'],
    ['Credite active', lead.crediteActive ? 'Da' : 'Nu'],
    ['Sold total aprox.', lead.soldTotalAprox ? `${fmt(lead.soldTotalAprox)} RON` : '-'],
    ['Tip creditor', lead.tipCreditor || '-'],
    ['Întârzieri', lead.intarzieri ? `Da (${lead.intarzieriZileMax ?? '?'} zile)` : 'Nu'],
    ['Poprire/Executor', lead.poprireSauExecutorUltimii5Ani ? (lead.situatiePoprireInchisa ? 'Da (închisă)' : 'Da (activă)') : 'Nu'],
    ['Data înregistrării', new Date(lead.createdAt).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-label={lead.numePrenume}
        onMouseDown={e => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{lead.numePrenume}</h2>
            <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">{sourceLabel(lead.source)}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Închide"><X size={20} /></button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="space-y-2 text-sm">
            {lead.telefon && (
              <div className="flex flex-wrap items-center gap-2">
                <a href={`tel:${lead.telefon}`} className="flex items-center gap-1.5 text-slate-700 hover:text-brand-primary"><Phone size={14} /> {lead.telefon}</a>
                <a
                  href={whatsappLink(lead.telefon, `Bună, ${lead.numePrenume.split(' ')[0]}!`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              </div>
            )}
            {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-slate-700 hover:text-brand-primary"><Mail size={14} /> {lead.email}</a>}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Date lead</h3>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><MessageSquare size={13} /> Notițe</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={1000}
              rows={6}
              placeholder="Scrie notițe despre client după apelul telefonic..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">{notes.length}/1000 caractere</span>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Save size={15} /> {saving ? 'Se salvează...' : 'Salvează notițe'}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    adminApi.getLeads()
      .then(d => { if (active) setLeads(d); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return leads;
    return leads.filter(l =>
      l.numePrenume.toLowerCase().includes(t) ||
      (l.telefon ?? '').includes(t) ||
      (l.email ?? '').toLowerCase().includes(t) ||
      (l.oras ?? '').toLowerCase().includes(t));
  }, [leads, q]);

  const selected = leads.find(l => l.id === selectedId) ?? null;

  if (loading) return (<div className="space-y-6"><PageHeader title="Lead-uri" /><SkeletonCards count={6} /></div>);

  return (
    <div className="space-y-6">
      <PageHeader title="Lead-uri" subtitle={`${leads.length} potențiali clienți`} />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Caută după nume, telefon, oraș..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
        />
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">Nu s-au putut încărca datele. Încearcă din nou.</p>}

      {filtered.length === 0 && !error ? (
        <EmptyState message="Niciun lead încă." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(l => (
            <div
              key={l.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(l.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(l.id); } }}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:border-brand-primary focus:outline-none"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary">
                  {initials(l.numePrenume)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-800">{l.numePrenume}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">{sourceLabel(l.source)}</span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                    {l.telefon && (
                      <div className="flex items-center gap-2">
                        <a href={`tel:${l.telefon}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-brand-primary"><Phone className="h-3 w-3" />{l.telefon}</a>
                        <a href={whatsappLink(l.telefon, `Bună, ${l.numePrenume.split(' ')[0]}!`)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} aria-label="WhatsApp" className="text-emerald-600 hover:text-emerald-700"><MessageCircle className="h-3.5 w-3.5" /></a>
                      </div>
                    )}
                    {l.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{l.email}</div>}
                    {l.oras && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{l.oras}</div>}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                <div><div className="text-slate-400">Venit net</div><div className="font-medium text-slate-700">{money(l.venitNetLunar)}</div></div>
                <div><div className="text-slate-400">Sold aprox.</div><div className="font-medium text-slate-700">{money(l.soldTotalAprox)}</div></div>
              </div>
              {(l.intarzieri || l.poprireSauExecutorUltimii5Ani) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.intarzieri && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"><AlertTriangle className="h-3 w-3" />Întârzieri</span>}
                  {l.poprireSauExecutorUltimii5Ani && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"><AlertTriangle className="h-3 w-3" />Poprire</span>}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>{dateShort(l.createdAt)}</span>
                {l.adminNotes && <MessageSquare className="h-3 w-3 text-brand-primary" />}
              </div>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelectedId(null)}
          onSaved={(id, notes) => setLeads(prev => prev.map(l => l.id === id ? { ...l, adminNotes: notes } : l))}
        />
      )}
    </div>
  );
}
