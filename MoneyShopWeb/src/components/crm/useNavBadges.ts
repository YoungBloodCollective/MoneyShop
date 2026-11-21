import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api/apiClient';
import { assignmentsApi } from '@/services/api/assignmentsApi';
import { CANCELLED_STATUS, addDays, type Appointment } from './appointments/appointmentModel';
import type { WorkspaceVariant } from './CrmLayout';

const REFRESH_MS = 60_000;

/**
 * Counters next to menu items, refreshed every minute: calls still to make today (Programări) and,
 * for the Super Admin, requests waiting to be assigned (De atribuit). A failed refresh keeps the
 * last numbers instead of showing zero.
 */
export function useNavBadges(variant: WorkspaceVariant): Record<string, number> {
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const base = variant === 'admin' ? '/admin' : '/crm';

    const load = async () => {
      if (document.visibilityState === 'hidden') return;
      const next: Record<string, number> = {};
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const now = Date.now();
      try {
        const res = await apiClient.get('/appointments', { params: { from: start.toISOString(), to: addDays(start, 1).toISOString() } });
        next[`${base}/programari`] = (res.data as Appointment[]).filter(a =>
          a.scheduledAt && a.status !== CANCELLED_STATUS
          && new Date(a.scheduledAt).getTime() + (a.durationMinutes ?? 15) * 60_000 > now).length;
      } catch { /* keep the previous number */ }
      if (variant === 'admin') {
        try {
          next['/admin/de-atribuit'] = (await assignmentsApi.inbox()).length;
        } catch { /* keep the previous number */ }
      }
      if (active) setBadges(prev => ({ ...prev, ...next }));
    };

    queueMicrotask(() => { if (active) void load(); });
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [variant]);

  return badges;
}
