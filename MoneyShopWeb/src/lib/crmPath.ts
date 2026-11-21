import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// The CRM pages are shared by two workspaces:
//   /crm/*   – the broker's own CRM (data scoped to the broker)
//   /admin/* – the Super Admin workspace (whole network, same pages, its own menu)
// Links inside those pages are written as '/crm/...'; crmPath() keeps the user in the
// workspace they are in, so a Super Admin opening a client never lands in the broker CRM.

export const ADMIN_BASE = '/admin';
export const CRM_BASE = '/crm';

export function isAdminWorkspace(pathname: string): boolean {
  return pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`);
}

export function toWorkspace(to: string, adminWorkspace: boolean): string {
  if (!adminWorkspace) return to;
  if (to === CRM_BASE || to.startsWith(`${CRM_BASE}/`) || to.startsWith(`${CRM_BASE}?`)) {
    return ADMIN_BASE + to.slice(CRM_BASE.length);
  }
  return to;
}

export function useCrmPath(): (to: string) => string {
  const { pathname } = useLocation();
  const admin = isAdminWorkspace(pathname);
  return useCallback((to: string) => toWorkspace(to, admin), [admin]);
}
