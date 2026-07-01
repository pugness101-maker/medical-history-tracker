import type { AppData } from '../types';
import { emptyAdultHealthProfile } from '../types/profile';
import { ensureDefaultCareProviders } from '../utils/profileDefaults';

export const emptyAppData = (): AppData => ({
  appointments: [],
  conditions: [],
  medications: [],
  records: [],
  healthNotes: [],
  adultHealthProfile: ensureDefaultCareProviders(emptyAdultHealthProfile()),
  settings: { theme: 'light' },
});

export function loadAppData(key: string): AppData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyAppData();
    const parsed = JSON.parse(raw) as AppData;
    return {
      appointments: (parsed.appointments ?? []).map((a) => ({
        ...a,
        attachedRecordIds: a.attachedRecordIds ?? [],
      })),
      conditions: parsed.conditions ?? [],
      medications: parsed.medications ?? [],
      records: (parsed.records ?? []).map((r) => ({
        ...r,
        uploadDate: r.uploadDate ?? r.createdAt?.split('T')[0] ?? '',
        extractedText: r.extractedText ?? '',
      })),
      healthNotes: parsed.healthNotes ?? [],
      adultHealthProfile: ensureDefaultCareProviders(
        parsed.adultHealthProfile ?? emptyAdultHealthProfile(),
      ),
      settings: parsed.settings ?? { theme: 'light' },
    };
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
  return {
    appointments: (parsed.appointments ?? []).map((a) => ({
      ...a,
      attachedRecordIds: a.attachedRecordIds ?? [],
    })),
    conditions: parsed.conditions,
    medications: parsed.medications,
    records: (parsed.records ?? []).map((r) => ({
      ...r,
      uploadDate: r.uploadDate ?? r.createdAt?.split('T')[0] ?? '',
      extractedText: r.extractedText ?? '',
    })),
    healthNotes: parsed.healthNotes ?? [],
    adultHealthProfile: ensureDefaultCareProviders(
      parsed.adultHealthProfile ?? emptyAdultHealthProfile(),
    ),
    settings: parsed.settings ?? { theme: 'light' },
  };
}
