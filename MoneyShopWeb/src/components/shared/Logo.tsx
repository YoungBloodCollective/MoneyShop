import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
};

export function Logo({ size = 'md', clickable = true }: LogoProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const img = (
    <img
      src="/images/logo/logo-trimmed.png"
      alt="MoneyShop"
      className={`${sizeMap[size]} object-contain`}
    />
  );

  if (!clickable) return img;

  return (
    <button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')} className="cursor-pointer">
      {img}
    </button>
  );
}
