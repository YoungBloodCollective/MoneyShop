import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrmPath } from '@/lib/crmPath';
import {
  Search, Users, FolderKanban, LayoutDashboard, Sparkles, CornerDownLeft, FileSignature, CalendarClock, BarChart3, UserCircle,
} from 'lucide-react';
import { crmApi } from '@/services/api/crmApi';
import { useAuth } from '@/hooks/useAuth';
import { useDialogBehavior } from './useDialogBehavior';
import { FOCUS_RING } from '@/pages/crm/crmHelpers';
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
  { key: 'p-lead', title: 'Lead-uri', to: '/crm/leaduri', icon: Sparkles, group: 'Pagini' },
  { key: 'p-prog', title: 'Programări', to: '/crm/programari', icon: CalendarClock, group: 'Pagini' },
  { key: 'p-rap', title: 'Rapoarte', to: '/crm/rapoarte', icon: BarChart3, group: 'Pagini' },
  { key: 'p-profil', title: 'Profilul meu', to: '/crm/profil', icon: UserCircle, group: 'Pagini' },
];

export function CrmCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const crm = useCrmPath();
  const { isBroker } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
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

  const closePalette = useCallback(() => onClose(), [onClose]);
  useDialogBehavior(open, panelRef, closePalette);

  const selIdx = Math.min(sel, Math.max(0, items.length - 1));
  const activeKey = items[selIdx]?.key;
  useEffect(() => {
    if (open && activeKey) document.getElementById(`crm-palette-opt-${activeKey}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeKey]);

  if (!open) return null;

  const go = (item?: Item) => { if (!item) return; onClose(); navigate(crm(item.to)); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) setSel(Math.min(selIdx + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) setSel(Math.max(selIdx - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[selIdx]); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Căutare"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            role="combobox"
            aria-label="Caută clienți, dosare, pagini"
            aria-expanded={items.length > 0}
            aria-controls="crm-palette-list"
            aria-autocomplete="list"
            aria-activedescendant={activeKey ? `crm-palette-opt-${activeKey}` : undefined}
            value={q}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKeyDown}
            placeholder="Caută clienți, dosare, pagini..."
            className={`w-full bg-transparent py-4 text-sm text-slate-800 placeholder:text-slate-400 ${FOCUS_RING} focus-visible:ring-inset`}
          />
          <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">ESC</kbd>
        </div>

        {items.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400" role="status">Niciun rezultat pentru „{q}"</div>
        )}
        <div id="crm-palette-list" role="listbox" aria-label="Rezultate" className={`max-h-80 overflow-y-auto p-2 ${items.length === 0 ? 'hidden' : ''}`}>
          {items.map((item, i) => {
            const Icon = item.icon;
            const header = i === 0 || items[i - 1].group !== item.group ? item.group : null;
            return (
              <Fragment key={item.key}>
                {header && <div role="presentation" className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{header}</div>}
                <div
                  id={`crm-palette-opt-${item.key}`}
                  role="option"
                  aria-selected={i === selIdx}
                  onMouseMove={() => setSel(i)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => go(item)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === selIdx ? 'bg-brand-primary/10' : 'hover:bg-slate-50'}`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === selIdx ? 'bg-brand-primary/15 text-brand-primary' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{item.title}</div>
                    {item.subtitle && <div className="truncate text-xs text-slate-400">{item.subtitle}</div>}
                  </div>
                  {i === selIdx && <CornerDownLeft className="h-4 w-4 shrink-0 text-slate-300" />}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
