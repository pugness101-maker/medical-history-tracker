import type { ReactNode } from 'react';

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  badge,
  children,
  sectionId,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  sectionId?: string;
}) {
  return (
    <details id={sectionId} open={defaultOpen} className="card group">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none">
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className="w-4 h-4 shrink-0 opacity-40 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>}
          </div>
        </div>
        <div onClick={(e) => e.preventDefault()}>{badge}</div>
      </summary>
      <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {children}
      </div>
    </details>
  );
}
