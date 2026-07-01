import type { CareProviderEntry } from '../types/profile';
import { computeNextDue } from './dueDates';

export type PreventiveStatus = 'overdue' | 'due_soon' | 'scheduled' | 'complete' | 'optional';

export const PREVENTIVE_STATUS_LABELS: Record<PreventiveStatus, string> = {
  overdue: 'Overdue',
  due_soon: 'Due Soon',
  scheduled: 'Scheduled',
  complete: 'Complete',
  optional: 'Optional',
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export function getPreventiveStatus(entry: CareProviderEntry): PreventiveStatus {
  if (!entry.enabled) return 'optional';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduled = parseDate(entry.scheduledVisit);
  if (scheduled && scheduled >= today) return 'scheduled';

  const nextDue = computeNextDue(entry);
  if (!nextDue) {
    if (entry.dueFrequency === 'optional_yearly' || entry.dueFrequency === 'as_needed') {
      return 'optional';
    }
    return entry.lastVisit ? 'complete' : 'optional';
  }

  const due = parseDate(nextDue);
  if (!due) return 'optional';

  if (due < today) return 'overdue';

  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  if (due <= in30) return 'due_soon';

  return 'complete';
}

export function preventiveBadgeClass(status: PreventiveStatus): string {
  const map: Record<PreventiveStatus, string> = {
    overdue: 'badge-overdue',
    due_soon: 'badge-due-soon',
    scheduled: 'badge-scheduled',
    complete: 'badge-complete',
    optional: 'badge-optional',
  };
  return map[status];
}

export interface PreventiveItem {
  entry: CareProviderEntry;
  label: string;
  nextDue: string | null;
  status: PreventiveStatus;
}

export function getPreventiveItems(
  careProviders: CareProviderEntry[],
  labels: Record<string, string>,
): PreventiveItem[] {
  return careProviders
    .filter((e) => e.enabled)
    .map((entry) => ({
      entry,
      label: labels[entry.category] ?? entry.specialty,
      nextDue: computeNextDue(entry),
      status: getPreventiveStatus(entry),
    }));
}

export function isDueThisMonth(nextDue: string | null): boolean {
  if (!nextDue) return false;
  const due = parseDate(nextDue);
  if (!due) return false;
  const now = new Date();
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
}

export function getDueThisMonth(items: PreventiveItem[]): PreventiveItem[] {
  return items.filter(
    (p) =>
      isDueThisMonth(p.nextDue) ||
      (p.status === 'scheduled' && isDueThisMonth(p.entry.scheduledVisit)),
  );
}
