import type { ReactNode } from 'react';

// The older admin pages (broker accounts, broker register, KYC, partners, applications) are
// styled for the dark app shell. Inside the light Super Admin workspace they keep that look in
// a dark panel until they are restyled, instead of sending the Super Admin to another shell.
export function LegacyAdminPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-dark-900 px-4 py-6 lg:px-8">
      {children}
    </div>
  );
}
