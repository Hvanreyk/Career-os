import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gold-400 text-navy-950 font-semibold hover:bg-gold-300 shadow-[0_0_24px_rgba(212,175,55,0.3)] hover:shadow-[0_0_36px_rgba(212,175,55,0.45)] active:scale-[0.98]',
  secondary:
    'border border-white/18 text-white hover:border-gold-400/40 hover:text-gold-300 hover:bg-white/4 active:scale-[0.98]',
  ghost: 'text-slate-400 hover:text-white active:scale-[0.98]',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-sm rounded-xl',
  lg: 'px-8 py-4 text-base rounded-xl',
};

export function Button({
  href,
  onClick,
  variant = 'primary',
  children,
  className = '',
  size = 'md',
}: Props) {
  const classes = `inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
