import type { AppData } from '../types';
import { emptyAdultHealthProfile } from '../types/profile';
import { normalizeAppointment } from '../utils/appointmentLinking';
import { ensureDefaultCareProviders } from '../utils/profileDefaults';
import { syncVaccinesFromAllRecords } from '../utils/vaccineRegistry';

export const emptyAppData = (): AppData => ({
  appointments: [],
  conditions: [],
  medications: [],
  records: [],
  vaccineProfiles: [],
  healthNotes: [],
  adultHealthProfile: ensureDefaultCareProviders(emptyAdultHealthProfile()),
  settings: { theme: 'light' },
});

function migrateRecords(records: AppData['records']): AppData['records'] {
  return (records ?? []).map((r) => ({
    ...r,
    uploadDate: r.uploadDate ?? r.createdAt?.split('T')[0] ?? '',
    extractedText: r.extractedText ?? '',
  }));
}

function migrateVaccines(parsed: AppData): AppData {
  const base: AppData = {
    ...parsed,
    records: migrateRecords(parsed.records),
    vaccineProfiles: parsed.vaccineProfiles ?? [],
    healthNotes: parsed.healthNotes ?? [],
    adultHealthProfile: ensureDefaultCareProviders(
      parsed.adultHealthProfile ?? emptyAdultHealthProfile(),
    ),
    settings: parsed.settings ?? { theme: 'light' },
  };
  return syncVaccinesFromAllRecords(base);
}

function migrateAppointments(appointments: AppData['appointments']): AppData['appointments'] {
  return (appointments ?? []).map((a) => normalizeAppointment(a as Parameters<typeof normalizeAppointment>[0]));
}

export function loadAppData(key: string): AppData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyAppData();
    const parsed = JSON.parse(raw) as AppData;
    return migrateVaccines({
      appointments: migrateAppointments(parsed.appointments),
      conditions: parsed.conditions ?? [],
      medications: parsed.medications ?? [],
      records: parsed.records ?? [],
      vaccineProfiles: parsed.vaccineProfiles ?? [],
      healthNotes: parsed.healthNotes ?? [],
      adultHealthProfile: parsed.adultHealthProfile ?? emptyAdultHealthProfile(),
      settings: parsed.settings ?? { theme: 'light' },
    });
  } catch {
    return emptyAppData();
  }
}

export function saveAppData(key: string, data: AppData): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function exportAppData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importAppData(json: string): AppData {
  const parsed = JSON.parse(json) as AppData;
  if (
    !parsed ||
    !Array.isArray(parsed.appointments) ||
    !Array.isArray(parsed.conditions) ||
    !Array.isArray(parsed.medications) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error('Invalid backup file format');
  }
  return migrateVaccines({
    appointments: migrateAppointments(parsed.appointments),
    conditions: parsed.conditions,
    medications: parsed.medications,
    records: parsed.records ?? [],
    vaccineProfiles: parsed.vaccineProfiles ?? [],
    healthNotes: parsed.healthNotes ?? [],
    adultHealthProfile: parsed.adultHealthProfile ?? emptyAdultHealthProfile(),
    settings: parsed.settings ?? { theme: 'light' },
  });
}
