import type {
  AdultHealthProfile,
  CareProviderEntry,
  DueFrequency,
  DueReminderKind,
  ProfileCareCategory,
  ProfileReminder,
  ProfileTabId,
} from '../types/profile';
import { CARE_CATEGORY_LABELS, PROFILE_TAB_LABELS } from '../types/profile';
import { CATEGORY_TO_TAB } from './profileDefaults';

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function monthsForFrequency(entry: CareProviderEntry): number | null {
  switch (entry.dueFrequency) {
    case 'yearly':
    case 'optional_yearly':
      return 12;
    case 'six_months':
      return 6;
    case 'three_months':
      return 3;
    case 'custom':
      return entry.customFrequencyMonths > 0 ? entry.customFrequencyMonths : 12;
    case 'as_needed':
      return null;
    default:
      return 12;
  }
}

export function computeNextDue(entry: CareProviderEntry): string | null {
  if (!entry.enabled) return null;
  if (entry.nextDueOverride) return entry.nextDueOverride;

  const last = parseDate(entry.lastVisit);
  if (!last) return null;

  const months = monthsForFrequency(entry);
  if (months === null) return null;

  return toDateStr(addMonths(last, months));
}

export function getDueStatus(
  nextDue: string | null,
  scheduledVisit?: string,
): DueReminderKind | 'ok' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduled = parseDate(scheduledVisit ?? '');
  if (scheduled && scheduled >= today) return 'upcoming';

  if (!nextDue) return 'missing';

  const due = parseDate(nextDue);
  if (!due) return 'missing';

  if (due < today) return 'overdue';

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (due >= monthStart && due <= monthEnd) return 'due_this_month';

  const in90Days = new Date(today);
  in90Days.setDate(in90Days.getDate() + 90);
  if (due <= in90Days) return 'upcoming';

  return 'ok';
}

function tabForCategory(category: ProfileCareCategory): ProfileTabId {
  return CATEGORY_TO_TAB[category] as ProfileTabId;
}

export function getProfileReminders(profile: AdultHealthProfile): ProfileReminder[] {
  const reminders: ProfileReminder[] = [];

  if (!profile.name.trim()) {
    reminders.push({
      id: 'missing-name',
      kind: 'missing',
      title: 'Profile name not set',
      subtitle: 'Add your name in Profile',
      category: 'profile',
      tabId: 'profile' as ProfileTabId,
    });
  }

  if (!profile.dateOfBirth) {
    reminders.push({
      id: 'missing-dob',
      kind: 'missing',
      title: 'Date of birth not set',
      subtitle: 'Add DOB in Profile',
      category: 'profile',
      tabId: 'profile' as ProfileTabId,
    });
  }

  if (!profile.emergencyContact.name.trim() || !profile.emergencyContact.phone.trim()) {
    reminders.push({
      id: 'missing-emergency',
      kind: 'missing',
      title: 'Emergency contact incomplete',
      subtitle: 'Add name and phone in Profile',
      category: 'profile',
      tabId: 'profile' as ProfileTabId,
    });
  }

  if (!profile.pharmacy.name.trim()) {
    reminders.push({
      id: 'missing-pharmacy',
      kind: 'missing',
      title: 'Pharmacy not set',
      subtitle: 'Add your preferred pharmacy',
      category: 'profile',
      tabId: 'profile' as ProfileTabId,
    });
  }

  if (!profile.insuranceMedical.carrier.trim()) {
    reminders.push({
      id: 'missing-med-insurance',
      kind: 'missing',
      title: 'Medical insurance not set',
      subtitle: 'Add medical plan details',
      category: 'insurance',
      tabId: 'insurance',
    });
  }

  for (const entry of profile.careProviders) {
    if (!entry.enabled) continue;

    const label = CARE_CATEGORY_LABELS[entry.category];
    const tabId = tabForCategory(entry.category);
    const nextDue = computeNextDue(entry);
    const status = getDueStatus(nextDue, entry.scheduledVisit);

    if (!entry.providerName.trim()) {
      reminders.push({
        id: `missing-provider-${entry.category}`,
        kind: 'missing',
        title: `${label}: provider not set`,
        subtitle: 'Add doctor or clinic name',
        category: entry.category,
        tabId,
      });
      continue;
    }

    if (entry.scheduledVisit) {
      const sched = parseDate(entry.scheduledVisit);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sched && sched >= today) {
        reminders.push({
          id: `scheduled-${entry.id}`,
          kind: 'upcoming',
          title: `${label}: scheduled visit`,
          subtitle: entry.providerName,
          date: entry.scheduledVisit,
          category: entry.category,
          tabId,
        });
      }
    }

    if (status === 'overdue') {
      reminders.push({
        id: `overdue-${entry.id}`,
        kind: 'overdue',
        title: `${label}: overdue`,
        subtitle: `${entry.providerName} · due ${nextDue}`,
        date: nextDue ?? undefined,
        category: entry.category,
        tabId,
      });
    } else if (status === 'due_this_month') {
      reminders.push({
        id: `due-month-${entry.id}`,
        kind: 'due_this_month',
        title: `${label}: due this month`,
        subtitle: entry.providerName,
        date: nextDue ?? undefined,
        category: entry.category,
        tabId,
      });
    } else if (status === 'upcoming' && nextDue && !entry.scheduledVisit) {
      reminders.push({
        id: `upcoming-${entry.id}`,
        kind: 'upcoming',
        title: `${label}: coming due`,
        subtitle: entry.providerName,
        date: nextDue,
        category: entry.category,
        tabId,
      });
    } else if (!entry.lastVisit && entry.dueFrequency !== 'as_needed') {
      reminders.push({
        id: `missing-lastvisit-${entry.id}`,
        kind: 'missing',
        title: `${label}: last visit unknown`,
        subtitle: 'Add last visit date to track due dates',
        category: entry.category,
        tabId,
      });
    }
  }

  const order: Record<DueReminderKind, number> = {
    overdue: 0,
    due_this_month: 1,
    upcoming: 2,
    missing: 3,
  };

  return reminders.sort((a, b) => order[a.kind] - order[b.kind]);
}

export function groupReminders(reminders: ProfileReminder[]) {
  return {
    overdue: reminders.filter((r) => r.kind === 'overdue'),
    dueThisMonth: reminders.filter((r) => r.kind === 'due_this_month'),
    upcoming: reminders.filter((r) => r.kind === 'upcoming'),
    missing: reminders.filter((r) => r.kind === 'missing'),
  };
}

export function frequencyOptionsForCategory(category: ProfileCareCategory): DueFrequency[] {
  switch (category) {
    case 'core_medical':
    case 'womens_health':
    case 'vision':
      return ['yearly', 'as_needed', 'custom'];
    case 'vaccines_labs':
      return ['yearly', 'as_needed', 'custom'];
    case 'sexual_health':
      return ['yearly', 'six_months', 'three_months', 'custom'];
    case 'dental':
      return ['six_months', 'yearly', 'custom'];
    case 'dermatology':
      return ['optional_yearly', 'yearly', 'as_needed', 'custom'];
    case 'mental_health':
      return ['custom', 'three_months', 'six_months', 'yearly', 'as_needed'];
    default:
      return ['yearly', 'six_months', 'three_months', 'as_needed', 'custom'];
  }
}

export { PROFILE_TAB_LABELS };
