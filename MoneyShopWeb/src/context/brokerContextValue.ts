import { createContext, useContext } from 'react';
import type { BrokerPublicProfile } from '@/services/api/brokersApi';

export type BrokerStatus = 'none' | 'loading' | 'ready' | 'notfound' | 'error';

export interface BrokerContextValue {
  slug: string | null;
  status: BrokerStatus;
  profile: BrokerPublicProfile | null;
}

export const BrokerContext = createContext<BrokerContextValue>({ slug: null, status: 'none', profile: null });

export function useBroker() {
  return useContext(BrokerContext);
}

const DEFAULT_CONTACT = {
  name: 'MoneyShop',
  phone: '0770 548 447',
  phoneHref: 'tel:+40770548447',
  email: 'alex.moore@moneyshop.ro',
};

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : phone;
}

export function useBrokerContact() {
  const { profile } = useBroker();
  if (!profile) return { ...DEFAULT_CONTACT, isBrokerSite: false };

  return {
    name: profile.displayName,
    phone: profile.phone ? formatPhone(profile.phone) : DEFAULT_CONTACT.phone,
    phoneHref: profile.phone ? `tel:${profile.phone.replace(/\s/g, '')}` : DEFAULT_CONTACT.phoneHref,
    email: profile.email || DEFAULT_CONTACT.email,
    isBrokerSite: true,
  };
}
