import { v4 as uuidv4 } from 'uuid';
import type { AdultHealthProfile, CareProviderEntry, DueFrequency, ProfileCareCategory } from '../types/profile';

const DEFAULT_FREQUENCIES: Record<ProfileCareCategory, DueFrequency> = {
  core_medical: 'yearly',
  vaccines_labs: 'yearly',
  womens_health: 'yearly',
  sexual_health: 'yearly',
  dental: 'six_months',
  vision: 'yearly',
  dermatology: 'optional_yearly',
  mental_health: 'custom',
};

const DEFAULT_SPECIALTIES: Record<ProfileCareCategory, string> = {
  core_medical: 'Primary Care / Family Medicine',
  vaccines_labs: 'Labs / Bloodwork',
  womens_health: "OB-GYN / Women's Health",
  sexual_health: 'Sexual Health / STI Clinic',
  dental: 'Dentistry',
  vision: 'Optometry / Eye Care',
  dermatology: 'Dermatology',
  mental_health: 'Mental Health / Counseling',
};

export function createDefaultCareEntry(category: ProfileCareCategory): CareProviderEntry {
  return {
    id: uuidv4(),
    category,
    providerName: '',
    specialty: DEFAULT_SPECIALTIES[category],
    location: '',
    phone: '',
    lastVisit: '',
    scheduledVisit: '',
    nextDueOverride: '',
    dueFrequency: DEFAULT_FREQUENCIES[category],
    customFrequencyMonths: category === 'mental_health' ? 12 : 12,
    notes: '',
    portalNotes: '',
    enabled: category !== 'dermatology',
  };
}

export function ensureDefaultCareProviders(profile: AdultHealthProfile): AdultHealthProfile {
  const categories: ProfileCareCategory[] = [
    'core_medical',
    'vaccines_labs',
    'womens_health',
    'sexual_health',
    'dental',
    'vision',
    'dermatology',
    'mental_health',
  ];

  const existing = new Map(profile.careProviders.map((c) => [c.category, c]));
  const careProviders = categories.map(
    (cat) => existing.get(cat) ?? createDefaultCareEntry(cat),
  );

  return { ...profile, careProviders };
}

export function getCareEntry(
  profile: AdultHealthProfile,
  category: ProfileCareCategory,
): CareProviderEntry {
  return (
    profile.careProviders.find((c) => c.category === category) ??
    createDefaultCareEntry(category)
  );
}

export function updateCareEntry(
  profile: AdultHealthProfile,
  entry: CareProviderEntry,
): AdultHealthProfile {
  const exists = profile.careProviders.some((c) => c.id === entry.id);
  const careProviders = exists
    ? profile.careProviders.map((c) => (c.id === entry.id ? entry : c))
    : [...profile.careProviders, entry];

  return {
    ...profile,
    careProviders,
    updatedAt: new Date().toISOString(),
  };
}

export function initializeProfile(profile?: AdultHealthProfile | null): AdultHealthProfile {
  const base = profile ?? emptyProfileWithDefaults();
  return ensureDefaultCareProviders(base);
}

function emptyProfileWithDefaults(): AdultHealthProfile {
  return ensureDefaultCareProviders({
    name: '',
    dateOfBirth: '',
    pharmacy: { name: '', phone: '', location: '' },
    emergencyContact: { name: '', phone: '', relationship: '' },
    insuranceMedical: {
      carrier: '',
      planName: '',
      memberIdHint: '',
      groupNumber: '',
      phone: '',
      portalUrl: '',
      portalNotes: '',
      notes: '',
    },
    insuranceDental: {
      carrier: '',
      planName: '',
      memberIdHint: '',
      groupNumber: '',
      phone: '',
      portalUrl: '',
      portalNotes: '',
      notes: '',
    },
    insuranceVision: {
      carrier: '',
      planName: '',
      memberIdHint: '',
      groupNumber: '',
      phone: '',
      portalUrl: '',
      portalNotes: '',
      notes: '',
    },
    careProviders: [],
    profileNotes: '',
    updatedAt: new Date().toISOString(),
  });
}

export const CATEGORY_TO_TAB: Record<ProfileCareCategory, string> = {
  core_medical: 'preventive',
  vaccines_labs: 'vaccines',
  womens_health: 'preventive',
  sexual_health: 'preventive',
  dental: 'preventive',
  vision: 'preventive',
  dermatology: 'preventive',
  mental_health: 'preventive',
};
