import { useEffect, useState } from 'react';
import { CalendarClock, FileSignature, FileText, FolderKanban, History, Loader2, StickyNote, Wallet } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';

interface TimelineItem {
  atUtc: string;
  kind: 'acord' | 'appointment' | 'note' | 'bc' | 'application' | 'status' | 'income' | string;
  title: string;
  detail?: string | null;
}

const ICONS: Record<string, typeof History> = {
  acord: FileSignature,
  appointment: CalendarClock,
  note: StickyNote,
  bc: FileText,
  application: FolderKanban,
  status: FolderKanban,
  income: Wallet,
};

const INITIAL = 8;

/** "Istoric": everything that happened with this client, newest first. */
export function ClientTimeline({ userId }: { userId: number }) {
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get(`/crm/clients/${userId}/timeline`)
      .then(r => { if (active) setItems(r.data as TimelineItem[]); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId]);

  const visible = items ? (showAll ? items : items.slice(0, INITIAL)) : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <History className="h-4 w-4 text-brand-primary" /> Istoric
      </h2>
      {failed ? (
        <p role="alert" className="text-sm text-rose-600">Nu am putut încărca istoricul.</p>
      ) : items === null ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-300" aria-label="Se încarcă" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">Nimic înregistrat încă.</p>
      ) : (
        <>
          <ol className="relative space-y-4 border-l border-slate-100 pl-5">
            {visible.map((item, i) => {
              const Icon = ICONS[item.kind] ?? History;
              return (
                <li key={`${item.atUtc}-${i}`} className="relative">
                  <span className="absolute -left-[29px] flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-slate-100">
                    <Icon className="h-3 w-3 text-slate-500" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  {item.detail && <p className="mt-0.5 text-xs text-slate-600">{item.detail}</p>}
                  <time className="text-[11px] text-slate-400" dateTime={item.atUtc}>
                    {new Date(item.atUtc).toLocaleString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </li>
              );
            })}
          </ol>
          {items.length > INITIAL && (
            <button
              type="button"
              onClick={() => setShowAll(s => !s)}
              className="mt-4 text-xs font-medium text-brand-primary hover:underline"
            >
              {showAll ? 'Arată mai puțin' : `Arată tot istoricul (${items.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
