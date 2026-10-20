import { useLocation } from 'react-router-dom';

export function useReturnPath(fallback = '/dashboard') {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const path = from?.pathname ? `${from.pathname}${from.search ?? ''}` : '';
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth') ? path : fallback;
}
