import type { Appointment } from '../types';
import type { CareProviderEntry } from '../types/profile';
import { getEffectiveVisitDates } from './appointmentLinking';
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

export function getPreventiveStatusFromDates(
  entry: CareProviderEntry,
  lastVisit: string,
  scheduledVisit: string,
): PreventiveStatus {
  if (!entry.enabled) return 'optional';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduled = parseDate(scheduledVisit);
  if (scheduled && scheduled >= today) return 'scheduled';

  const effectiveEntry = { ...entry, lastVisit, scheduledVisit };
  const nextDue = entry.nextDueOverride || computeNextDue(effectiveEntry);

  if (!nextDue) {
    if (entry.dueFrequency === 'optional_yearly' || entry.dueFrequency === 'as_needed') {
      return 'optional';
    }
    return lastVisit ? 'complete' : 'optional';
  }

  const due = parseDate(nextDue);
  if (!due) return 'optional';

  if (due < today) return 'overdue';

  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  if (due <= in30) return 'due_soon';

  return 'complete';
}

export function getPreventiveStatus(
  entry: CareProviderEntry,
  lastVisit?: string,
  scheduledVisit?: string,
): PreventiveStatus {
  return getPreventiveStatusFromDates(
    entry,
    lastVisit ?? entry.lastVisit,
    scheduledVisit ?? entry.scheduledVisit,
  );
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
  lastVisit: string;
  scheduledVisit: string;
  nextDue: string | null;
  status: PreventiveStatus;
  fromLinkedAppointments: boolean;
}

export function getPreventiveItems(
  careProviders: CareProviderEntry[],
  labels: Record<string, string>,
  appointments: Appointment[] = [],
): PreventiveItem[] {
  return careProviders
    .filter((e) => e.enabled)
    .map((entry) => {
      const effective = getEffectiveVisitDates(entry, appointments);
      const effectiveEntry = {
        ...entry,
        lastVisit: effective.lastVisit,
        scheduledVisit: effective.scheduledVisit,
      };
      const nextDue = entry.nextDueOverride || computeNextDue(effectiveEntry);

      return {
        entry,
        label: labels[entry.category] ?? entry.specialty,
        lastVisit: effective.lastVisit,
        scheduledVisit: effective.scheduledVisit,
        nextDue,
        status: getPreventiveStatusFromDates(entry, effective.lastVisit, effective.scheduledVisit),
        fromLinkedAppointments: effective.fromAppointments,
      };
    });
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
      (p.status === 'scheduled' && isDueThisMonth(p.scheduledVisit)),
  );
}
