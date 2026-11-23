import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Phone, Mail, MapPin, AlertTriangle, MessageCircle, MessageSquare, Save, X, CalendarPlus, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type LeadItem, type LeadStatus } from '@/services/api/adminApi';
import { AssignBrokerControl } from '@/components/crm/AssignBrokerControl';
import { whatsappLink } from '@/components/crm/acord/acordLabels';
import { LeadAcordActions } from '@/components/crm/LeadAcordActions';
import { PageHeader, SkeletonCards, EmptyState, SegmentChips } from './crmShared';
import { money, dateShort, initials, normalizePhone, FIELD_FOCUS, FOCUS_RING } from './crmHelpers';
import { AppointmentFormModal, type AppointmentPrefill } from '@/components/crm/appointments/AppointmentFormModal';

const SOURCE_LABELS: Record<string, string> = {
  api: 'Formular',
  chat_state_machine: 'Chat',
  landing: 'Landing',
};

const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source;

const fmt = (v?: number) => (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });

/** A lead's details for a new booking ("Nume Prenume": family name first). */
function leadPrefill(lead: LeadItem): AppointmentPrefill {
  const [nume = '', ...rest] = lead.numePrenume.trim().split(/\s+/);
  return {
    nume,
    prenume: rest.join(' '),
    telefon: lead.telefon ?? '',
    email: lead.email ?? '',
    notes: `Programat din lead #${lead.id}`,
  };
}

const LEAD_STATUSES: { key: LeadStatus; label: string; pill: string }[] = [
  { key: 'Nou', label: 'Nou', pill: 'bg-sky-50 text-sky-700' },
  { key: 'Contactat', label: 'Contactat', pill: 'bg-amber-50 text-amber-700' },
  { key: 'Necalificat', label: 'Necalificat', pill: 'bg-slate-100 text-slate-600' },
  { key: 'Convertit', label: 'Convertit', pill: 'bg-emerald-50 text-emerald-700' },
];
const STATUS_PILL = Object.fromEntries(LEAD_STATUSES.map(s => [s.key, s.pill])) as Record<string, string>;
const LEAD_SEGMENTS = [{ key: 'toate', label: 'Toate' }, ...LEAD_STATUSES.map(s => ({ key: s.key, label: s.label }))];

/**
 * How long a new lead has been waiting for a call: green under 5 minutes, amber up to 30, red after.
 * Leads older than two days only show their age, without the alarm colour.
 */
function LeadAge({ createdAt, now }: { createdAt: string; now: number }) {
  if (!now) return null;
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  const text = minutes < 60 ? `${minutes} min` : minutes < 48 * 60 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 1440)} zile`;
  const tone = minutes < 5 ? 'bg-emerald-50 text-emerald-700'
    : minutes < 30 ? 'bg-amber-50 text-amber-700'
    : minutes < 48 * 60 ? 'bg-rose-50 text-rose-700'
    : 'bg-slate-100 text-slate-500';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`} title="De când așteaptă un apel">
      <Clock className="h-3 w-3" aria-hidden="true" /> necontactat de {text}
    </span>
  );
}

function LeadDrawer({
  lead, onClose, onSaved, onAssigned, onBook, onStatus, onAcordIssued,
}: {
  lead: LeadItem; onClose: () => void; onSaved: (id: number, notes: string) => void;
  onAcordIssued: (lead: LeadItem) => void;
  onAssigned: (id: number, brokerProfileId: number | null) => void;
  onBook: (lead: LeadItem) => void;
  onStatus: (lead: LeadItem, status: LeadStatus) => void;
}) {
  const [notes, setNotes] = useState(lead.adminNotes ?? '');
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<Element | null>(document.activeElement);
  const dirty = notes !== (lead.adminNotes ?? '');
  const requestClose = () => {
    if (dirty && !window.confirm('Ai notițe nesalvate. Închizi fără să salvezi?')) return;
    onClose();
  };
  const closeRef = useRef(requestClose);
  useEffect(() => { closeRef.current = requestClose; });

  useEffect(() => {
    const trigger = triggerRef.current;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onMouseDown={requestClose}>
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={lead.numePrenume}
        onMouseDown={e => e.stopPropagation()}
        className={`flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl ${FOCUS_RING}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{lead.numePrenume}</h2>
            <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">{sourceLabel(lead.source)}</span>
          </div>
          <button onClick={requestClose} className="text-slate-400 hover:text-slate-700" aria-label="Închide"><X size={20} /></button>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Status lead">
              {LEAD_STATUSES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={lead.status === s.key}
                  onClick={() => { if (lead.status !== s.key) onStatus(lead, s.key); }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${FOCUS_RING} ${
                    lead.status === s.key ? `${s.pill} border-transparent` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Acord</p>
            <LeadAcordActions lead={lead} onIssued={onAcordIssued} />
          </div>
          <AssignBrokerControl
            entityType="lead"
            id={String(lead.id)}
            currentBrokerId={lead.brokerProfileId}
            onAssigned={brokerId => onAssigned(lead.id, brokerId)}
          />
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
            <button
              type="button"
              onClick={() => onBook(lead)}
              className={`mt-1 inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 ${FOCUS_RING}`}
            >
              <CalendarPlus size={14} /> Programează apel
            </button>
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
              aria-label="Notițe despre client"
              className={`w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`}
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
  const [reloadKey, setReloadKey] = useState(0);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [booking, setBooking] = useState<LeadItem | null>(null);
  const [segment, setSegment] = useState('toate');
  // Clock for the "waiting for a call" timers; ticks every 30 seconds.
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    queueMicrotask(tick);
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const setStatus = async (lead: LeadItem, status: LeadStatus) => {
    const previous = lead.status;
    setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status } : l)));
    try {
      const res = await adminApi.updateLeadStatus(lead.id, status);
      setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status: res.status, contactedAt: res.contactedAt } : l)));
      toast.success(`Lead marcat „${status}”`);
    } catch {
      setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status: previous } : l)));
      toast.error('Nu am putut schimba statusul.');
    }
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(false);
      adminApi.getLeads()
        .then(d => { if (active) setLeads(d); })
        .catch(() => { if (active) setError(true); })
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [reloadKey]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { toate: leads.length };
    for (const s of LEAD_STATUSES) c[s.key] = leads.filter(l => (l.status ?? 'Nou') === s.key).length;
    return c;
  }, [leads]);

  // New leads first (newest on top: they are the ones to call now), then the rest by date.
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const phone = normalizePhone(t);
    return leads
      .filter(l => segment === 'toate' || (l.status ?? 'Nou') === segment)
      .filter(l => !t ||
        l.numePrenume.toLowerCase().includes(t) ||
        (phone.length >= 3 && normalizePhone(l.telefon).includes(phone)) ||
        (l.email ?? '').toLowerCase().includes(t) ||
        (l.oras ?? '').toLowerCase().includes(t))
      .sort((a, b) => {
        const an = (a.status ?? 'Nou') === 'Nou' ? 0 : 1;
        const bn = (b.status ?? 'Nou') === 'Nou' ? 0 : 1;
        return an - bn || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [leads, q, segment]);

  const selected = leads.find(l => l.id === selectedId) ?? null;

  const markContacted = (lead: LeadItem) => {
    if ((lead.status ?? 'Nou') !== 'Nou') return;
    setLeads(prev => prev.map(l => (l.id === lead.id && l.status === 'Nou' ? { ...l, status: 'Contactat', contactedAt: l.contactedAt ?? new Date().toISOString() } : l)));
  };

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
          aria-label="Caută după nume, telefon, oraș"
          className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 ${FIELD_FOCUS}`}
        />
      </div>
      <SegmentChips segments={LEAD_SEGMENTS} active={segment} onChange={setSegment} counts={counts} />
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>Nu s-au putut încărca datele. Încearcă din nou.</span>
          <button onClick={() => setReloadKey(k => k + 1)} className="font-medium underline underline-offset-2">Reîncearcă</button>
        </div>
      )}
      {filtered.length === 0 && !error ? (
        <EmptyState message={leads.length === 0 ? 'Niciun lead încă.' : 'Niciun lead nu corespunde filtrelor.'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(l => (
            <div key={l.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow focus-within:border-brand-primary hover:shadow-md">
              <button onClick={() => setSelectedId(l.id)} className={`block w-full rounded-t-2xl p-4 text-left ${FOCUS_RING}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary">
                    {initials(l.numePrenume)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-slate-800">{l.numePrenume}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[l.status ?? 'Nou'] ?? 'bg-slate-100 text-slate-600'}`}>{l.status ?? 'Nou'}</span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
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
                  {(l.status ?? 'Nou') === 'Nou' ? <LeadAge createdAt={l.createdAt} now={now} /> : <span>{dateShort(l.createdAt)} · {sourceLabel(l.source)}</span>}
                  {l.adminNotes && <MessageSquare className="h-3 w-3 text-brand-primary" />}
                </div>
              </button>
              {l.telefon && (
                <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                  <a href={`tel:${l.telefon}`} className="flex items-center gap-1.5 hover:text-brand-primary"><Phone className="h-3 w-3" />{l.telefon}</a>
                  <a href={whatsappLink(l.telefon, `Bună, ${l.numePrenume.split(' ')[0]}!`)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
                </div>
              )}
              <div className="border-t border-slate-100 px-4 py-2.5">
                <LeadAcordActions lead={l} compact onIssued={markContacted} />
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
          onAssigned={(id, brokerProfileId) => setLeads(prev => prev.map(l => l.id === id ? { ...l, brokerProfileId } : l))}
          onBook={lead => { setSelectedId(null); setBooking(lead); }}
          onStatus={setStatus}
          onAcordIssued={markContacted}
        />
      )}
      {booking && (
        <AppointmentFormModal
          prefill={leadPrefill(booking)}
          brokers={[]}
          chooseBroker={false}
          onClose={() => setBooking(null)}
          onSaved={() => { setBooking(null); toast.success('Apel programat. Îl găsești în Programări.'); }}
        />
      )}
    </div>
  );
}
