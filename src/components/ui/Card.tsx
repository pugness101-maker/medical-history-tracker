import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = '', onClick, hover }: CardProps) {
  return (
    <div
      className={`card overflow-hidden ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  subtitle,
}: {
  title: string;
  action?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-4 border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-sm font-medium text-[var(--color-accent)] hover:opacity-80 transition-opacity">
      {children}
    </Link>
  );
}

export function EmptyCardMessage({ children }: { children: ReactNode }) {
  return <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{children}</p>;
}
