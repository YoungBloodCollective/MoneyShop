import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useCrmPath } from '@/lib/crmPath';
import { acordApi } from '@/services/api/acordApi';
import CrmAcordDetailPage from './CrmAcordDetailPage';
import { Spinner } from './crmShared';

/**
 * Agreements now live on the client page. Old links (emails, bookmarks) to /crm/acorduri/:id open
 * the client the agreement belongs to; if that cannot be found, the old agreement page is shown.
 */
export default function AcordToClientRedirect() {
  const crm = useCrmPath();
  const { acordId } = useParams<{ acordId: string }>();
  const [target, setTarget] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!acordId) return;
    let active = true;
    acordApi.adminDetails(acordId)
      .then(d => { if (active) setTarget(d.userId > 0 ? d.userId : null); })
      .catch(() => { if (active) setTarget(null); });
    return () => { active = false; };
  }, [acordId]);

  if (target === undefined) return <Spinner />;
  if (target === null) return <CrmAcordDetailPage />;
  return <Navigate to={crm(`/crm/clienti/${target}`)} replace />;
}
