import type { AppData } from '../types';

export interface ProviderSuggestion {
  name: string;
  specialty: string;
  clinic: string;
}

export function fillProviderDetails<T extends { doctorName: string; specialty: string; clinic: string }>(
  current: T,
  provider: ProviderSuggestion,
): T {
  return {
    ...current,
    doctorName: provider.name,
    specialty: current.specialty || provider.specialty,
    clinic: current.clinic || provider.clinic,
  };
}

const CREDENTIAL = /,?\s+(?:MD|DO|PA-C|PA|NP|RN|APRN|DNP|PMHNP|FNP|CNP|LPC|LCSW|LMFT|LMSW|LP|PsyD|PhD)\.?$/i;

function cleanProviderName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** A conservative identity key: exact name without title, credentials, case, or spacing. */
export function providerIdentityKey(value: string): string {
  let normalized = cleanProviderName(value).replace(/^Dr\.?\s+/i, '');
  while (CREDENTIAL.test(normalized)) normalized = normalized.replace(CREDENTIAL, '').trim();
  return normalized.toLocaleLowerCase();
}

function hasCredential(value: string): boolean {
  return CREDENTIAL.test(cleanProviderName(value));
}

/** Collect live suggestions from every persisted provider-bearing data source. */
export function buildProviderSuggestions(data: AppData): ProviderSuggestion[] {
  const suggestions = new Map<string, ProviderSuggestion>();

  const add = (rawName: string, specialty = '', clinic = '') => {
    const name = cleanProviderName(rawName);
    const key = providerIdentityKey(name);
    if (!key) return;

    const existing = suggestions.get(key);
    if (!existing) {
      suggestions.set(key, { name, specialty: specialty.trim(), clinic: clinic.trim() });
      return;
    }

    // Prefer the most informative spelling while retaining metadata learned elsewhere.
    if (!hasCredential(existing.name) && hasCredential(name)) existing.name = name;
    if (!existing.specialty && specialty.trim()) existing.specialty = specialty.trim();
    if (!existing.clinic && clinic.trim()) existing.clinic = clinic.trim();
  };

  for (const provider of data.adultHealthProfile.careProviders) {
    add(provider.providerName, provider.specialty, provider.location);
  }
  for (const appointment of data.appointments) {
    add(appointment.doctorName, appointment.specialty, appointment.clinic);
  }
  for (const record of data.records) add(record.provider);

  return [...suggestions.values()].sort((a, b) => a.name.localeCompare(b.name));
}
