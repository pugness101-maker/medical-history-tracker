import type { Appointment, AppData, Condition, MedicalRecord, Medication } from '../types';
import type { AdultHealthProfile, CareProviderEntry, ProfileCareCategory } from '../types/profile';
import { getCareEntry } from './profileDefaults';
import { sortByDateAsc, sortByDateDesc } from './format';
import { healthCategoryFromSpecialty } from './specialties';

/** @deprecated use relatedRecordIds */
type LegacyAppointment = Appointment & { attachedRecordIds?: string[] };

export function normalizeAppointment(a: LegacyAppointment): Appointment {
  return {
    ...a,
    providerId: a.providerId ?? '',
    healthCategory: a.healthCategory ?? ('' as ProfileCareCategory | ''),
    relatedConditionIds: a.relatedConditionIds ?? [],
    relatedMedicationIds: a.relatedMedicationIds ?? [],
    relatedRecordIds: a.relatedRecordIds ?? a.attachedRecordIds ?? [],
  };
}

const CATEGORY_RULES: { category: ProfileCareCategory; keywords: string[] }[] = [
  {
    category: 'mental_health',
    keywords: [
      'angela nordin', 'timelycare', 'timely care', 'counseling', 'counselor', 'therapist',
      'psychiat', 'psycholog', 'mental health', 'lpc', 'lcsw', 'lmft', 'behavioral health',
    ],
  },
  {
    category: 'sexual_health',
    keywords: ['std', 'sti', 'rbj health', 'sexual health', 'sexually transmitted', 'hiv test'],
  },
  {
    category: 'dental',
    keywords: ['dental', 'bee cave dental', 'dentist', 'orthodont', 'oral health'],
  },
  {
    category: 'womens_health',
    keywords: ["ob-gyn", 'obgyn', 'gynecolog', 'iud', "women's health", 'womens health', 'obstetric', 'pap smear'],
  },
  {
    category: 'vision',
    keywords: ['vision', 'eye exam', 'optometr', 'ophthalmolog', 'eyecare', 'eye care'],
  },
  {
    category: 'dermatology',
    keywords: ['dermatolog', 'skin care', ' acne', 'acne', 'mole check'],
  },
  {
    category: 'vaccines_labs',
    keywords: ['vaccine', 'immunization', 'bloodwork', 'blood work', 'lab result', 'labcorp', 'quest diag', 'cbc', 'a1c', 'flu shot'],
  },
  {
    category: 'core_medical',
    keywords: [
      'pcp', 'family medicine', 'primary care', 'vimal george', 'internal medicine',
      'general practice', 'annual physical', 'physical exam', 'cardiology', 'urgent care',
    ],
  },
];

function appointmentSearchText(a: Appointment): string {
  return [
    a.doctorName, a.specialty, a.clinic, a.reason, a.diagnosis,
    a.treatmentPlan, a.notes, a.symptoms,
  ].join(' ').toLowerCase();
}

function nameSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
  const nb = b.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const aParts = na.split(/\s+/);
  const bParts = nb.split(/\s+/);
  const overlap = aParts.filter((p) => bParts.some((q) => q.includes(p) || p.includes(q))).length;
  return overlap / Math.max(aParts.length, bParts.length);
}

export function inferHealthCategory(appointment: Appointment): ProfileCareCategory | '' {
  const fromSpecialty = healthCategoryFromSpecialty(appointment.specialty);
  if (fromSpecialty) return fromSpecialty;

  const text = appointmentSearchText(appointment);
  let best: ProfileCareCategory | '' = '';
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) score += kw.split(' ').length > 1 ? 3 : 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }

  return bestScore > 0 ? best : '';
}

export function inferProviderId(
  appointment: Appointment,
  profile: AdultHealthProfile,
  category?: ProfileCareCategory | '',
): string {
  const cat = category ?? appointment.healthCategory ?? inferHealthCategory(appointment);
  if (!cat) return '';

  const entry = getCareEntry(profile, cat);

  if (entry.providerName && nameSimilarity(appointment.doctorName, entry.providerName) >= 0.5) {
    return entry.id;
  }

  for (const provider of profile.careProviders) {
    if (provider.providerName && nameSimilarity(appointment.doctorName, provider.providerName) >= 0.6) {
      return provider.id;
    }
  }

  return entry.id;
}

export function autoLinkAppointment(
  appointment: Appointment,
  profile: AdultHealthProfile,
): Appointment {
  const normalized = normalizeAppointment(appointment);
  const healthCategory = inferHealthCategory(normalized) || normalized.healthCategory || '';
  const providerId = inferProviderId(normalized, profile, healthCategory);

  return {
    ...normalized,
    healthCategory: healthCategory || normalized.healthCategory,
    providerId: providerId || normalized.providerId,
  };
}

export function autoLinkAllAppointments(data: AppData): AppData {
  let profile = data.adultHealthProfile;
  const appointments = data.appointments.map((a) => {
    const linked = autoLinkAppointment(a, profile);
    profile = applyProviderNameFromAppointment(profile, linked);
    return linked;
  });

  profile = syncCareProvidersFromAppointments(profile, appointments);

  return { ...data, appointments, adultHealthProfile: profile };
}

export function applyProviderNameFromAppointment(
  profile: AdultHealthProfile,
  appointment: Appointment,
): AdultHealthProfile {
  if (!appointment.providerId || !appointment.doctorName.trim()) return profile;

  const careProviders = profile.careProviders.map((entry) => {
    if (entry.id !== appointment.providerId) return entry;
    if (entry.providerName.trim()) return entry;
    return {
      ...entry,
      providerName: appointment.doctorName.replace(/^Dr\.?\s*/i, '').trim() || appointment.doctorName,
      location: entry.location || appointment.clinic,
      specialty: entry.specialty || appointment.specialty,
    };
  });

  return { ...profile, careProviders, updatedAt: new Date().toISOString() };
}

export function getAppointmentsForProvider(
  entry: CareProviderEntry,
  appointments: Appointment[],
): Appointment[] {
  return appointments.filter(
    (a) => a.providerId === entry.id || a.healthCategory === entry.category,
  );
}

export function getLastCompletedAppointment(appointments: Appointment[]): Appointment | null {
  const completed = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => sortByDateDesc(a.date, b.date));
  return completed[0] ?? null;
}

export function getNextUpcomingAppointment(appointments: Appointment[]): Appointment | null {
  const upcoming = appointments
    .filter((a) => a.status === 'upcoming')
    .sort((a, b) => sortByDateAsc(a.date, b.date));
  return upcoming[0] ?? null;
}

export interface EffectiveVisitDates {
  lastVisit: string;
  scheduledVisit: string;
  fromAppointments: boolean;
}

export function getEffectiveVisitDates(
  entry: CareProviderEntry,
  appointments: Appointment[],
): EffectiveVisitDates {
  const linked = getAppointmentsForProvider(entry, appointments);
  const lastAppt = getLastCompletedAppointment(linked);
  const nextAppt = getNextUpcomingAppointment(linked);
  const fromAppointments = Boolean(lastAppt || nextAppt);

  return {
    lastVisit: lastAppt?.date ?? entry.lastVisit,
    scheduledVisit: nextAppt?.date ?? entry.scheduledVisit,
    fromAppointments,
  };
}

export function syncCareProvidersFromAppointments(
  profile: AdultHealthProfile,
  appointments: Appointment[],
): AdultHealthProfile {
  const careProviders = profile.careProviders.map((entry) => {
    const linked = getAppointmentsForProvider(entry, appointments);
    if (linked.length === 0) return entry;

    const { lastVisit, scheduledVisit } = getEffectiveVisitDates(entry, appointments);
    return {
      ...entry,
      lastVisit: lastVisit || entry.lastVisit,
      scheduledVisit: scheduledVisit || entry.scheduledVisit,
    };
  });

  return { ...profile, careProviders, updatedAt: new Date().toISOString() };
}

export interface ProviderLinkSummaryData {
  lastAppointment: Appointment | null;
  nextAppointment: Appointment | null;
  allAppointments: Appointment[];
  linkedRecords: MedicalRecord[];
  linkedMedications: Medication[];
  linkedConditions: Condition[];
}

export function getProviderLinkSummary(
  entry: CareProviderEntry,
  data: Pick<AppData, 'appointments' | 'records' | 'medications' | 'conditions'>,
): ProviderLinkSummaryData {
  const allAppointments = getAppointmentsForProvider(entry, data.appointments)
    .sort((a, b) => sortByDateDesc(a.date, b.date));

  const apptIds = new Set(allAppointments.map((a) => a.id));
  const recordIds = new Set<string>();
  const medIds = new Set<string>();
  const condIds = new Set<string>();

  for (const a of allAppointments) {
    for (const id of a.relatedRecordIds) recordIds.add(id);
    for (const id of a.relatedMedicationIds) medIds.add(id);
    for (const id of a.relatedConditionIds) condIds.add(id);
  }

  for (const c of data.conditions) {
    if (c.relatedAppointmentIds.some((id) => apptIds.has(id))) condIds.add(c.id);
  }

  return {
    lastAppointment: getLastCompletedAppointment(allAppointments),
    nextAppointment: getNextUpcomingAppointment(allAppointments),
    allAppointments,
    linkedRecords: data.records.filter((r) => recordIds.has(r.id)),
    linkedMedications: data.medications.filter((m) => medIds.has(m.id)),
    linkedConditions: data.conditions.filter((c) => condIds.has(c.id)),
  };
}

export function linkAppointmentToProvider(
  appointment: Appointment,
  profile: AdultHealthProfile,
  providerId: string,
  healthCategory: ProfileCareCategory,
  allAppointments: Appointment[],
): { appointment: Appointment; profile: AdultHealthProfile } {
  const updatedAppt: Appointment = {
    ...normalizeAppointment(appointment),
    providerId,
    healthCategory,
  };
  let updatedProfile = applyProviderNameFromAppointment(profile, updatedAppt);
  const appts = allAppointments.map((a) => (a.id === updatedAppt.id ? updatedAppt : a));
  updatedProfile = syncCareProvidersFromAppointments(updatedProfile, appts);
  return { appointment: updatedAppt, profile: updatedProfile };
}
