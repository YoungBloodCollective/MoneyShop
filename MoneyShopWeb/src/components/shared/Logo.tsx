import { DollarSign } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 20, text: 'text-lg' },
  md: { icon: 28, text: 'text-2xl' },
  lg: { icon: 36, text: 'text-3xl' },
};

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent p-1.5">
        <DollarSign size={s.icon} className="text-white" />
      </div>
      {showText && (
        <span className={`${s.text} font-bold text-light-100`}>
          Money<span className="text-brand-primary">Shop</span>
        </span>
      )}
    </div>
  );
}
