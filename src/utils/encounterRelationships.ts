import { v4 as uuidv4 } from 'uuid';
import type { AppData, Appointment, MedicalRecord } from '../types';
import type { CareProviderEntry, ProfileCareCategory } from '../types/profile';
import { createDefaultCareEntry } from './profileDefaults';
import { canonicalSpecialty, healthCategoryFromSpecialty } from './specialties';
import { providerIdentityKey } from './providerSuggestions';

const ENCOUNTER_RECORD_TYPES = new Set<MedicalRecord['recordType']>(['visit_note']);

function hasReliableEncounterDate(record: MedicalRecord): boolean {
  if (record.encounterDateVerified) return true;
  if (!record.extractedText.trim()) return false;
  return /\b(?:visit date|date of service|DOS|encounter date|appointment date|session date|service date)\b/i.test(record.extractedText);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function providerForName(data: AppData, name: string): CareProviderEntry | undefined {
  const key = providerIdentityKey(name);
  return key ? data.adultHealthProfile.careProviders.find((p) => providerIdentityKey(p.providerName) === key) : undefined;
}

function categoryFor(specialty: string): ProfileCareCategory {
  return healthCategoryFromSpecialty(specialty) || 'core_medical';
}

export function findOrCreateProvider(
  data: AppData,
  name: string,
  specialty = '',
  clinic = '',
): { data: AppData; provider: CareProviderEntry | undefined } {
  if (!name.trim()) return { data, provider: undefined };
  const normalizedSpecialty = canonicalSpecialty(specialty);
  const existing = providerForName(data, name);
  if (existing) {
    const updated = {
      ...existing,
      providerName: name.trim().length > existing.providerName.trim().length ? name.trim() : existing.providerName,
      specialty: canonicalSpecialty(existing.specialty) || normalizedSpecialty,
      location: existing.location || clinic,
    };
    return {
      data: {
        ...data,
        adultHealthProfile: {
          ...data.adultHealthProfile,
          careProviders: data.adultHealthProfile.careProviders.map((p) => p.id === updated.id ? updated : p),
        },
      },
      provider: updated,
    };
  }

  const category = categoryFor(normalizedSpecialty);
  const blank = data.adultHealthProfile.careProviders.find((p) => p.category === category && !p.providerName.trim());
  const provider: CareProviderEntry = {
    ...(blank ?? createDefaultCareEntry(category)),
    id: blank?.id ?? uuidv4(),
    providerName: name.trim(),
    specialty: normalizedSpecialty || canonicalSpecialty(blank?.specialty ?? ''),
    location: clinic,
    enabled: true,
  };
  const careProviders = blank
    ? data.adultHealthProfile.careProviders.map((p) => p.id === blank.id ? provider : p)
    : [...data.adultHealthProfile.careProviders, provider];
  return { data: { ...data, adultHealthProfile: { ...data.adultHealthProfile, careProviders } }, provider };
}

export function findMatchingAppointment(
  appointments: Appointment[],
  providerName: string,
  date: string,
): Appointment | undefined {
  if (!providerName.trim() || !date) return undefined;
  const key = providerIdentityKey(providerName);
  return appointments.find((a) => a.date === date && providerIdentityKey(a.doctorName) === key);
}

function createEncounter(
  provider: CareProviderEntry,
  date: string,
  reason: string,
  specialty: string,
  clinic: string,
): Appointment {
  const now = new Date().toISOString();
  return {
    id: uuidv4(), doctorName: provider.providerName, specialty: specialty || provider.specialty,
    clinic: clinic || provider.location, date, time: '', reason, diagnosis: '', treatmentPlan: '',
    followUpNeeded: false, nextAppointmentDate: '', repeatAppointmentFrequency: '', cost: '', notes: '',
    status: date < today() ? 'completed' : 'upcoming', providerId: provider.id,
    healthCategory: provider.category, relatedConditionIds: [], relatedMedicationIds: [],
    relatedRecordIds: [], createdAt: now, updatedAt: now,
  };
}

/** Central migration/synchronizer. It only creates encounters with both provider and reliable date. */
export function syncEncounterRelationships(input: AppData): AppData {
  let data = input;

  // Establish provider IDs for existing appointments without changing their clinical content.
  let appointments = [...data.appointments];
  for (let index = 0; index < appointments.length; index += 1) {
    const appointment = appointments[index];
    const found = findOrCreateProvider(data, appointment.doctorName, appointment.specialty, appointment.clinic);
    data = found.data;
    if (found.provider) appointments[index] = { ...appointment, providerId: found.provider.id };
  }
  data = { ...data, appointments };

  // A Health provider's dated Last/Next visit is explicit encounter evidence.
  let careProviders = [...data.adultHealthProfile.careProviders];
  for (let index = 0; index < careProviders.length; index += 1) {
    const entry = careProviders[index];
    if (!entry.providerName.trim()) continue;
    for (const kind of ['lastVisit', 'scheduledVisit'] as const) {
      const date = entry[kind];
      const unlinked = kind === 'lastVisit' ? entry.lastVisitUnlinked : entry.scheduledVisitUnlinked;
      if (!date || unlinked) continue;
      const linkKey = kind === 'lastVisit' ? 'lastVisitAppointmentId' : 'scheduledVisitAppointmentId';
      const linkedId = entry[linkKey];
      let appointment = linkedId
        ? appointments.find((candidate) => candidate.id === linkedId)
        : findMatchingAppointment(appointments, entry.providerName, date);
      if (!appointment) {
        appointment = createEncounter(
          entry,
          date,
          kind === 'lastVisit' ? (entry.lastVisitReason ?? '').trim() : '',
          entry.specialty,
          entry.location,
        );
        appointments.push(appointment);
      }
      careProviders[index] = {
        ...careProviders[index],
        providerName: appointment.doctorName,
        specialty: appointment.specialty || careProviders[index].specialty,
        location: appointment.clinic || careProviders[index].location,
        [linkKey]: appointment.id,
      };
    }
  }
  data = { ...data, appointments, adultHealthProfile: { ...data.adultHealthProfile, careProviders } };

  // Visit notes with a provider and encounter date link to the same encounter.
  const records = data.records.map((record) => {
    if (
      record.appointmentUnlinked ||
      !ENCOUNTER_RECORD_TYPES.has(record.recordType) ||
      !hasReliableEncounterDate(record) ||
      !record.date ||
      !record.provider.trim()
    ) return record;
    const found = findOrCreateProvider(data, record.provider);
    data = found.data;
    if (!found.provider) return record;
    let appointment = record.appointmentId
      ? appointments.find((candidate) => candidate.id === record.appointmentId)
      : findMatchingAppointment(appointments, record.provider, record.date);
    if (!appointment) {
      appointment = createEncounter(found.provider, record.date, record.summary, found.provider.specialty, found.provider.location);
      appointments.push(appointment);
    }
    if (!appointment.relatedRecordIds.includes(record.id)) {
      const updated = { ...appointment, relatedRecordIds: [...appointment.relatedRecordIds, record.id] };
      appointments = appointments.map((a) => a.id === updated.id ? updated : a);
    }
    return { ...record, appointmentId: appointment.id, providerId: found.provider.id };
  });

  const synchronizedRecords = records.map((record) => {
    const appointment = record.appointmentId
      ? appointments.find((candidate) => candidate.id === record.appointmentId)
      : undefined;
    return appointment
      ? { ...record, provider: appointment.doctorName, date: appointment.date, providerId: appointment.providerId }
      : record;
  });
  const synchronizedProviders = data.adultHealthProfile.careProviders.map((provider) => {
    const last = appointments.find((a) => a.id === provider.lastVisitAppointmentId);
    const next = appointments.find((a) => a.id === provider.scheduledVisitAppointmentId);
    return {
      ...provider,
      lastVisit: last?.date ?? provider.lastVisit,
      scheduledVisit: next?.date ?? provider.scheduledVisit,
    };
  });

  return {
    ...data,
    appointments,
    records: synchronizedRecords,
    adultHealthProfile: { ...data.adultHealthProfile, careProviders: synchronizedProviders },
  };
}

export function unlinkAppointment(data: AppData, appointmentId: string): AppData {
  return {
    ...data,
    appointments: data.appointments.filter((a) => a.id !== appointmentId),
    records: data.records.map((r) => r.appointmentId === appointmentId
      ? { ...r, appointmentId: undefined, appointmentUnlinked: true }
      : r),
    adultHealthProfile: {
      ...data.adultHealthProfile,
      careProviders: data.adultHealthProfile.careProviders.map((p) => ({
        ...p,
        lastVisitAppointmentId: p.lastVisitAppointmentId === appointmentId ? undefined : p.lastVisitAppointmentId,
        scheduledVisitAppointmentId: p.scheduledVisitAppointmentId === appointmentId ? undefined : p.scheduledVisitAppointmentId,
        lastVisitUnlinked: p.lastVisitAppointmentId === appointmentId ? true : p.lastVisitUnlinked,
        scheduledVisitUnlinked: p.scheduledVisitAppointmentId === appointmentId ? true : p.scheduledVisitUnlinked,
      })),
    },
  };
}

export function linkRecordToAppointment(data: AppData, recordId: string, appointmentId?: string): AppData {
  const previousAppointmentId = data.records.find((record) => record.id === recordId)?.appointmentId;
  const appointments = data.appointments.map((appointment) => {
    const withoutRecord = appointment.relatedRecordIds.filter((id) => id !== recordId);
    return appointment.id === appointmentId
      ? { ...appointment, relatedRecordIds: [...withoutRecord, recordId] }
      : { ...appointment, relatedRecordIds: withoutRecord };
  });
  const records = data.records.map((record) => record.id === recordId
    ? {
        ...record,
        appointmentId,
        appointmentUnlinked: !appointmentId,
        providerId: appointmentId
          ? appointments.find((appointment) => appointment.id === appointmentId)?.providerId
          : record.providerId,
      }
    : record);
  if (!previousAppointmentId && !appointmentId) return data;
  return { ...data, appointments, records };
}

export function deleteRecordWithoutCascade(data: AppData, recordId: string): AppData {
  return {
    ...data,
    records: data.records.filter((record) => record.id !== recordId),
    appointments: data.appointments.map((appointment) => ({
      ...appointment,
      relatedRecordIds: appointment.relatedRecordIds.filter((id) => id !== recordId),
    })),
  };
}
