import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SimulatorPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/simulator/advanced', { replace: true });
  }, [navigate]);

  return null;
}
