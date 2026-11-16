import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { statusColor, statusLabel } from '@/pages/crm/crmHelpers';

interface Props {
  code: string;
  targets: string[];
  onSelect: (status: string) => void;
}

const MENU_WIDTH = 208;

export function MoveToMenu({ code, targets, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const height = targets.length * 36 + 40;
      const top = rect.bottom + 4 + height > window.innerHeight ? Math.max(8, rect.top - 4 - height) : rect.bottom + 4;
      const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
      setPos({ top, left });
    }
    place();
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, targets.length, close]);

  useEffect(() => {
    if (!open) { focusedRef.current = false; return; }
    if (pos && !focusedRef.current) {
      focusedRef.current = true;
      menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
  }, [open, pos]);

  if (targets.length === 0) return null;

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === 'Tab') close(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        draggable={false}
        onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Mută dosarul #${code} în…`}
        title="Mută în…"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Mută dosarul #${code} în`}
          onKeyDown={onMenuKeyDown}
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, width: MENU_WIDTH, visibility: pos ? 'visible' : 'hidden' }}
          className="z-[70] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Mută în…</div>
          {targets.map(t => (
            <button
              key={t}
              type="button"
              role="menuitem"
              onClick={() => { close(true); onSelect(t); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus-visible:outline-none"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColor(t) }} />
              {statusLabel(t)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
