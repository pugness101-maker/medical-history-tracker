type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-medical-100 text-medical-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  muted: 'bg-slate-100 text-slate-600',
};

export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

export function statusBadgeVariant(
  status: string,
): BadgeVariant {
  switch (status) {
    case 'upcoming':
    case 'active':
      return 'info';
    case 'completed':
    case 'resolved':
      return 'success';
    case 'cancelled':
    case 'missed':
      return 'danger';
    case 'chronic':
      return 'warning';
    default:
      return 'muted';
  }
}
