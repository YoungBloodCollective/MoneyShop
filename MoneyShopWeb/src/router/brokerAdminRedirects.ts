// Brokers who open a Super Admin (/admin) address are sent to the matching page of their own CRM.
export const BROKER_ADMIN_REDIRECTS: Record<string, string> = {
  '/admin': '/crm',
  '/admin/acord': '/crm/acorduri',
  '/admin/acorduri': '/crm/acorduri',
  '/admin/appointments': '/crm/programari',
  '/admin/programari': '/crm/programari',
  '/admin/leads': '/crm/leaduri',
  '/admin/leaduri': '/crm/leaduri',
  '/admin/reports': '/crm/rapoarte',
  '/admin/rapoarte': '/crm/rapoarte',
  '/admin/clienti': '/crm/clienti',
  '/admin/dosare': '/crm/dosare',
  '/admin/profil': '/crm/profil',
  '/admin/applications': '/crm/dosare',
};
