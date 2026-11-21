import { apiClient } from './apiClient';

export interface BookingSlot { startUtc: string; label: string }
export interface BookingDay { date: string; label: string; slots: BookingSlot[] }
export interface BookingSlots { durationMinutes: number; days: BookingDay[] }

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'past';

export interface BookingView {
  appointmentId: number;
  firstName: string;
  scheduledAtUtc: string;
  durationMinutes: number;
  status: BookingStatus;
  brokerName?: string | null;
}

/** Public call booking: free times on the site and the private link from the confirmation email. */
export const bookingApi = {
  slots: (brokerSlug?: string | null) =>
    apiClient.get('/public/booking/slots', { params: brokerSlug ? { brokerSlug } : undefined }).then(r => r.data as BookingSlots),
  get: (token: string) =>
    apiClient.get(`/public/booking/${encodeURIComponent(token)}`).then(r => r.data as BookingView),
  confirm: (token: string) =>
    apiClient.post(`/public/booking/${encodeURIComponent(token)}/confirm`).then(r => r.data as BookingView),
  cancel: (token: string) =>
    apiClient.post(`/public/booking/${encodeURIComponent(token)}/cancel`).then(r => r.data as BookingView),
  reschedule: (token: string, scheduledAt: string) =>
    apiClient.post(`/public/booking/${encodeURIComponent(token)}/reschedule`, { scheduledAt }).then(r => r.data as BookingView),
};

/** "marți, 25 noiembrie, 11:00–11:15" in the visitor's local time. */
export function formatBooking(startUtc: string, durationMinutes: number): string {
  const start = new Date(startUtc);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const day = start.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
  const t = (d: Date) => d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${t(start)}–${t(end)}`;
}
