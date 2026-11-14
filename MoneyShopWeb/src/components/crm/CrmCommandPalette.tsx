import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, FolderKanban, LayoutDashboard, Landmark, Sparkles, Workflow, CornerDownLeft, FileSignature, CalendarClock, BarChart3, UserCircle,
} from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { useAuth } from '@/hooks/useAuth';
import type { CrmClientListItem, CrmFileListItem } from '@/types/crm.types';

interface Item {
  key: string;
  title: string;
  subtitle?: string;
  to: string;
  icon: typeof Users;
  group: string;
}

const PAGES: Item[] = [
  { key: 'p-dash', title: 'Dashboard', to: '/crm', icon: LayoutDashboard, group: 'Pagini' },
  { key: 'p-cli', title: 'Clienți', to: '/crm/clienti', icon: Users, group: 'Pagini' },
  { key: 'p-acord', title: 'Acorduri', to: '/crm/acorduri', icon: FileSignature, group: 'Pagini' },
  { key: 'p-dos', title: 'Dosare', to: '/crm/dosare', icon: FolderKanban, group: 'Pagini' },
  { key: 'p-of', title: 'Oferte bancare', to: '/crm/oferte', icon: Landmark, group: 'Pagini' },
  { key: 'p-lead', title: 'Lead-uri', to: '/crm/leaduri', icon: Sparkles, group: 'Pagini' },
  { key: 'p-prog', title: 'Programări', to: '/crm/programari', icon: CalendarClock, group: 'Pagini' },
  { key: 'p-auto', title: 'Automatizări', to: '/crm/automatizari', icon: Workflow, group: 'Pagini' },
  { key: 'p-rap', title: 'Rapoarte', to: '/crm/rapoarte', icon: BarChart3, group: 'Pagini' },
  { key: 'p-profil', title: 'Profilul meu', to: '/crm/profil', icon: UserCircle, group: 'Pagini' },
];

export function CrmCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { isBroker } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [clients, setClients] = useState<CrmClientListItem[] | null>(null);
  const [files, setFiles] = useState<CrmFileListItem[] | null>(null);

  // Load the searchable data the first time the palette opens.
  useEffect(() => {
    if (!open || clients) return;
    crmApi.getClients().then(setClients).catch(() => setClients([]));
    crmApi.getFiles().then(setFiles).catch(() => setFiles([]));
  }, [open, clients]);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setQ(''); setSel(0); }
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const t = q.trim().toLowerCase();
    const pages = PAGES.filter(p => (p.key !== 'p-profil' || isBroker) && (!t || p.title.toLowerCase().includes(t)));
    if (!t) return pages;
    const cl = (clients ?? [])
      .filter(c => c.fullName.toLowerCase().includes(t) || (c.phone ?? '').toLowerCase().includes(t) || (c.email ?? '').toLowerCase().includes(t))
      .slice(0, 6)
      .map<Item>(c => ({ key: `c-${c.userId}`, title: c.fullName, subtitle: c.phone ?? c.email, to: `/crm/clienti/${c.userId}`, icon: Users, group: 'Clienți' }));
    const fl = (files ?? [])
      .filter(f => f.code.toLowerCase().includes(t) || f.clientName.toLowerCase().includes(t))
      .slice(0, 6)
      .map<Item>(f => ({ key: `f-${f.id}`, title: `#${f.code}`, subtitle: f.clientName, to: `/crm/clienti/${f.userId}`, icon: FolderKanban, group: 'Dosare' }));
    return [...pages, ...cl, ...fl];
  }, [q, clients, files, isBroker]);

  if (!open) return null;

  const go = (item?: Item) => { if (!item) return; onClose(); navigate(item.to); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKeyDown}
            placeholder="Caută clienți, dosare, pagini..."
            className="w-full bg-transparent py-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Niciun rezultat pentru „{q}"</div>
          ) : (
            items.map((item, i) => {
              const Icon = item.icon;
              const header = item.group !== lastGroup ? (lastGroup = item.group) : null;
              return (
                <div key={item.key}>
                  {header && <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{header}</div>}
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(item)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === sel ? 'bg-brand-primary/10' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === sel ? 'bg-brand-primary/15 text-brand-primary' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{item.title}</div>
                      {item.subtitle && <div className="truncate text-xs text-slate-400">{item.subtitle}</div>}
                    </div>
                    {i === sel && <CornerDownLeft className="h-4 w-4 shrink-0 text-slate-300" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
