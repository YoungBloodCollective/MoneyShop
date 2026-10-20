import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BrokerContext, type BrokerStatus } from '@/context/brokerContextValue';
import { getBrokerSlug } from '@/lib/brokerHost';
import { brokersApi, type BrokerPublicProfile } from '@/services/api/brokersApi';

export function BrokerProvider({ children }: { children: React.ReactNode }) {
  const slug = useMemo(() => getBrokerSlug(), []);
  const [status, setStatus] = useState<BrokerStatus>(slug ? 'loading' : 'none');
  const [profile, setProfile] = useState<BrokerPublicProfile | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    brokersApi.getPublic(slug)
      .then(p => { if (!cancelled) { setProfile(p); setStatus('ready'); } })
      .catch(err => {
        if (cancelled) return;
        setStatus(axios.isAxiosError(err) && err.response?.status === 404 ? 'notfound' : 'error');
      });
    return () => { cancelled = true; };
  }, [slug]);

  return <BrokerContext.Provider value={{ slug, status, profile }}>{children}</BrokerContext.Provider>;
}
