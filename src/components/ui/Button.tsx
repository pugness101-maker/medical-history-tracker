import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  size?: 'sm' | 'md';
}

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--color-accent)] text-white hover:opacity-90 shadow-sm',
  secondary: 'border hover:bg-black/5 dark:hover:bg-white/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${variants[variant]} ${className}`}
      style={variant === 'secondary' ? { borderColor: 'var(--color-border)' } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
