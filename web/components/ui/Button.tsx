import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  size?: Size;
  disabled?: boolean;
  /** Shows a spinner and blocks interaction without collapsing the button's width. */
  loading?: boolean;
  'aria-label'?: string;
}

const variantStyles: Record<Variant, string> = {
  primary: 'ml-btn-primary on-accent',
  secondary: 'ml-btn-secondary',
  ghost: 'ml-btn-text',
};

/* Deliberately restrained: the landing hero uses a 56px control, the app tops
   out at 44px so a form does not read as a billboard. */
const sizeStyles: Record<Size, string> = {
  sm: 'min-h-[36px] px-3.5 text-[12px]',
  md: 'min-h-[44px] px-5 text-[13px]',
  lg: 'min-h-[48px] px-6 text-[14px]',
};

const ghostSize: Record<Size, string> = {
  sm: 'min-h-[36px] text-[13px]',
  md: 'min-h-[44px] text-[14px]',
  lg: 'min-h-[44px] text-[15px]',
};

export function Button({
  href,
  onClick,
  type = 'button',
  variant = 'primary',
  children,
  className = '',
  size = 'md',
  disabled = false,
  loading = false,
  ...rest
}: Props) {
  const sizing = variant === 'ghost' ? ghostSize[size] : sizeStyles[size];
  const classes = `ml-btn ${variantStyles[variant]} ${sizing} ${className}`;
  const body = (
    <>
      {loading && <Spinner />}
      {children}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes} {...rest}>
        {body}
      </Link>
    );
  }

  // A disabled link is not focusable or announceable, so render the span form.
  if (href) {
    return (
      <span className={classes} aria-disabled="true" {...rest}>
        {body}
      </span>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {body}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}
