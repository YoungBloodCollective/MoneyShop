/**
 * Leads that came from a booking store the name as "Nume Prenume" (family name first); for every
 * other source there is no known order, so only the first word is safe to greet with.
 */
export function leadGivenName(lead: { numePrenume: string; source: string }): string {
  const [first = '', ...rest] = lead.numePrenume.trim().split(/\s+/);
  return lead.source === 'appointment' && rest.length > 0 ? rest.join(' ') : first;
}
