import type { Appointment, AppData } from '../types';
import type { AdultHealthProfile, CareProviderEntry, ProfileCareCategory } from '../types/profile';
import { v4 as uuidv4 } from 'uuid';
import { CARE_CATEGORY_LABELS, DUE_FREQUENCY_LABELS } from '../types/profile';
import {
  applyProviderNameFromAppointment,
  autoLinkAppointment,
  syncCareProvidersFromAppointments,
} from './appointmentLinking';
import { getCareEntry } from './profileDefaults';
import { addMonthsToDate, monthsForFrequency } from './dueDates';
import { formatDate, sortByDateAsc } from './format';

const CATEGORY_DEFAULT_MONTHS: Record<ProfileCareCategory, number | null> = {
  core_medical: 12,
  vaccines_labs: 12,
  womens_health: 12,
  sexual_health: 6,
  dental: 6,
  vision: 12,
  dermatology: 12,
  mental_health: 12,
};

export function getProviderEntryForAppointment(
  source: Appointment,
  profile: AdultHealthProfile,
): CareProviderEntry | null {
  if (source.providerId) {
    const byId = profile.careProviders.find((p) => p.id === source.providerId);
    if (byId) return byId;
  }
  if (source.healthCategory) {
    return getCareEntry(profile, source.healthCategory as ProfileCareCategory);
  }
  return null;
}

export function computeNextAppointmentDate(
  completedDate: string,
  source: Appointment,
  profile: AdultHealthProfile,
): string | null {
  const entry = getProviderEntryForAppointment(source, profile);
  let months: number | null = null;

  if (entry?.enabled) {
    months = monthsForFrequency(entry);
  } else if (source.healthCategory) {
    months = CATEGORY_DEFAULT_MONTHS[source.healthCategory as ProfileCareCategory] ?? 12;
  }

  if (months === null) return null;
  return addMonthsToDate(completedDate, months);
}

export function describePreventiveFrequency(
  source: Appointment,
  profile: AdultHealthProfile,
  _nextDate: string | null,
): string {
  const entry = getProviderEntryForAppointment(source, profile);
  const category = (source.healthCategory || entry?.category) as ProfileCareCategory | '';
  const categoryLabel = category ? CARE_CATEGORY_LABELS[category] : 'Preventive care';

  if (entry?.enabled) {
    if (entry.dueFrequency === 'custom') {
      return `${categoryLabel}: every ${entry.customFrequencyMonths} months`;
    }
    if (entry.dueFrequency === 'as_needed') {
      return `${categoryLabel}: as needed — pick a date`;
    }
    return `${categoryLabel}: ${DUE_FREQUENCY_LABELS[entry.dueFrequency].toLowerCase()}`;
  }

  if (category) {
    const months = CATEGORY_DEFAULT_MONTHS[category];
    if (months === 6) return `${categoryLabel}: every 6 months`;
    if (months === 12) return `${categoryLabel}: yearly`;
  }

  return categoryLabel;
}

export function buildFollowUpAppointment(
  source: Appointment,
  nextDate: string,
): Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    doctorName: source.doctorName,
    specialty: source.specialty,
    clinic: source.clinic,
    date: nextDate,
    time: '',
    reason: 'Follow-up / routine care',
    diagnosis: '',
    treatmentPlan: '',
    followUpNeeded: false,
    nextAppointmentDate: '',
    cost: '',
    notes: '',
    status: 'upcoming',
    providerId: source.providerId,
    healthCategory: source.healthCategory,
    relatedConditionIds: [...source.relatedConditionIds],
    relatedMedicationIds: [...source.relatedMedicationIds],
    relatedRecordIds: [],
  };
}

export function findUpcomingForSameProvider(
  appointments: Appointment[],
  source: Appointment,
  excludeIds: string[] = [],
): Appointment[] {
  const today = new Date().toISOString().split('T')[0];
  const excluded = new Set([source.id, ...excludeIds]);

  return appointments
    .filter((a) => {
      if (excluded.has(a.id) || a.status !== 'upcoming') return false;
      if (a.date < today) return false;

      if (source.providerId && a.providerId === source.providerId) return true;
      if (source.healthCategory && a.healthCategory === source.healthCategory) return true;
      if (
        source.doctorName.trim() &&
        a.doctorName.toLowerCase() === source.doctorName.toLowerCase()
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => sortByDateAsc(a.date, b.date));
}

export function formatUpcomingSummary(upcoming: Appointment[]): string {
  if (upcoming.length === 0) return '';
  const first = upcoming[0];
  return `${formatDate(first.date)}${first.time ? ` at ${first.time}` : ''} — ${first.reason || 'Visit'}`;
}

export function insertNextAppointment(
  data: AppData,
  source: Appointment,
  nextDate: string,
): AppData {
  const now = new Date().toISOString();
  const draft = buildFollowUpAppointment(source, nextDate);
  const id = uuidv4();
  let profile = data.adultHealthProfile;
  let linked = autoLinkAppointment({ ...draft, id, createdAt: now, updatedAt: now }, profile);
  profile = applyProviderNameFromAppointment(profile, linked);
  const appointments = [...data.appointments, linked];
  profile = syncCareProvidersFromAppointments(profile, appointments);
  return { ...data, appointments, adultHealthProfile: profile };
}
