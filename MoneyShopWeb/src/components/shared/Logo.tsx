interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
};

export function Logo({ size = 'md' }: LogoProps) {
  return (
    <img
      src="/images/logo/logo-trimmed.png"
      alt="MoneyShop"
      className={`${sizeMap[size]} object-contain`}
    />
  );
}
