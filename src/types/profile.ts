export type ProfileCareCategory =
  | 'core_medical'
  | 'vaccines_labs'
  | 'womens_health'
  | 'sexual_health'
  | 'dental'
  | 'vision'
  | 'dermatology'
  | 'mental_health';

export type DueFrequency =
  | 'yearly'
  | 'six_months'
  | 'three_months'
  | 'as_needed'
  | 'optional_yearly'
  | 'custom';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface PharmacyInfo {
  name: string;
  phone: string;
  location: string;
}

export interface InsurancePlan {
  carrier: string;
  planName: string;
  memberIdHint: string;
  groupNumber: string;
  phone: string;
  portalUrl: string;
  portalNotes: string;
  notes: string;
}

export interface CareProviderEntry {
  id: string;
  category: ProfileCareCategory;
  providerName: string;
  specialty: string;
  location: string;
  phone: string;
  lastVisit: string;
  scheduledVisit: string;
  nextDueOverride: string;
  dueFrequency: DueFrequency;
  customFrequencyMonths: number;
  notes: string;
  portalNotes: string;
  enabled: boolean;
}

export interface AdultHealthProfile {
  name: string;
  dateOfBirth: string;
  pharmacy: PharmacyInfo;
  emergencyContact: EmergencyContact;
  insuranceMedical: InsurancePlan;
  insuranceDental: InsurancePlan;
  insuranceVision: InsurancePlan;
  careProviders: CareProviderEntry[];
  profileNotes: string;
  updatedAt: string;
}

export type DueReminderKind = 'overdue' | 'due_this_month' | 'upcoming' | 'missing';

export interface ProfileReminder {
  id: string;
  kind: DueReminderKind;
  title: string;
  subtitle: string;
  date?: string;
  category: ProfileCareCategory | 'profile' | 'insurance';
  tabId: ProfileTabId;
}

export type ProfileTabId =
  | 'profile'
  | 'insurance'
  | 'core_medical'
  | 'vaccines_labs'
  | 'womens_health'
  | 'sexual_health'
  | 'dental'
  | 'vision'
  | 'dermatology'
  | 'mental_health'
  | 'documents';

export const PROFILE_TAB_LABELS: Record<ProfileTabId, string> = {
  profile: 'Profile',
  insurance: 'Insurance',
  core_medical: 'Core Medical Care',
  vaccines_labs: 'Vaccines & Labs',
  womens_health: "Women's Health",
  sexual_health: 'Sexual Health',
  dental: 'Dental',
  vision: 'Vision',
  dermatology: 'Dermatology',
  mental_health: 'Mental Health',
  documents: 'Documents / Uploads',
};

export const CARE_CATEGORY_LABELS: Record<ProfileCareCategory, string> = {
  core_medical: 'Primary Care (PCP)',
  vaccines_labs: 'Vaccines & Labs',
  womens_health: "OB-GYN / Women's Health",
  sexual_health: 'Sexual Health / STI Screening',
  dental: 'Dental',
  vision: 'Vision',
  dermatology: 'Dermatology',
  mental_health: 'Mental Health',
};

export const DUE_FREQUENCY_LABELS: Record<DueFrequency, string> = {
  yearly: 'Yearly',
  six_months: 'Every 6 months',
  three_months: 'Every 3 months',
  as_needed: 'As needed (manual due date)',
  optional_yearly: 'Optional / Yearly',
  custom: 'Custom interval',
};

export const PRIVACY_WARNING =
  'Do not store passwords, full insurance IDs, or sensitive codes in this app unless you understand it is saved locally on this device.';

export const PORTAL_NOTES_WARNING =
  'Store portal URLs and login hints only — never store passwords here.';

export const emptyInsurancePlan = (): InsurancePlan => ({
  carrier: '',
  planName: '',
  memberIdHint: '',
  groupNumber: '',
  phone: '',
  portalUrl: '',
  portalNotes: '',
  notes: '',
});

export const emptyAdultHealthProfile = (): AdultHealthProfile => ({
  name: '',
  dateOfBirth: '',
  pharmacy: { name: '', phone: '', location: '' },
  emergencyContact: { name: '', phone: '', relationship: '' },
  insuranceMedical: emptyInsurancePlan(),
  insuranceDental: emptyInsurancePlan(),
  insuranceVision: emptyInsurancePlan(),
  careProviders: [],
  profileNotes: '',
  updatedAt: new Date().toISOString(),
});
