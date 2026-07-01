import type { ReactNode } from 'react';

export function CollapsibleSection({
  title,
  subtitle,
  count,
  countVariant = 'default',
  open,
  onOpenChange,
  badge,
  children,
  sectionId,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  countVariant?: 'default' | 'alert';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge?: ReactNode;
  children: ReactNode;
  sectionId?: string;
}) {
  const countClass =
    countVariant === 'alert' && count && count > 0
      ? 'badge-due-soon'
      : 'bg-black/5 dark:bg-white/10 text-[var(--color-muted)]';

  return (
    <details
      id={sectionId}
      open={open}
      onToggle={(e) => onOpenChange(e.currentTarget.open)}
      className="card group w-full"
    >
      <summary className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-4 min-h-[56px] cursor-pointer select-none touch-manipulation list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <svg
            className="w-5 h-5 shrink-0 opacity-40 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
              {count !== undefined && (
                <span
                  className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full shrink-0 ${countClass}`}
                >
                  {count}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {badge && (
          <div className="shrink-0" onClick={(e) => e.preventDefault()}>
            {badge}
          </div>
        )}
      </summary>
      <div className="px-4 sm:px-5 pb-5 pt-0 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {children}
      </div>
    </details>
  );
}
