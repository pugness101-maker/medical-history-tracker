import type { ProfileCareCategory } from '../types/profile';

export const OTHER_SPECIALTY_KEY = '__other__';

export interface SpecialtyOption {
  label: string;
  value: string;
  healthCategory: ProfileCareCategory | '';
}

export const SPECIALTY_OPTIONS: SpecialtyOption[] = [
  { label: 'Primary Care / Family Medicine', value: 'Primary Care / Family Medicine', healthCategory: 'core_medical' },
  { label: 'Pediatrics', value: 'Pediatrics', healthCategory: 'core_medical' },
  { label: "OB-GYN / Women's Health", value: "OB-GYN / Women's Health", healthCategory: 'womens_health' },
  { label: 'Sexual Health / STI Clinic', value: 'Sexual Health / STI Clinic', healthCategory: 'sexual_health' },
  { label: 'Mental Health / Counseling', value: 'Mental Health / Counseling', healthCategory: 'mental_health' },
  { label: 'Psychiatry', value: 'Psychiatry', healthCategory: 'mental_health' },
  { label: 'Dermatology', value: 'Dermatology', healthCategory: 'dermatology' },
  { label: 'Dentistry', value: 'Dentistry', healthCategory: 'dental' },
  { label: 'Orthodontics', value: 'Orthodontics', healthCategory: 'dental' },
  { label: 'Optometry / Eye Care', value: 'Optometry / Eye Care', healthCategory: 'vision' },
  { label: 'Labs / Bloodwork', value: 'Labs / Bloodwork', healthCategory: 'vaccines_labs' },
  { label: 'Vaccines / Immunizations', value: 'Vaccines / Immunizations', healthCategory: 'vaccines_labs' },
  { label: 'Urgent Care', value: 'Urgent Care', healthCategory: 'core_medical' },
  { label: 'ENT', value: 'ENT', healthCategory: 'core_medical' },
  { label: 'Allergy / Immunology', value: 'Allergy / Immunology', healthCategory: 'core_medical' },
  { label: 'Cardiology', value: 'Cardiology', healthCategory: 'core_medical' },
  { label: 'Podiatry', value: 'Podiatry', healthCategory: 'core_medical' },
  { label: 'Rheumatology', value: 'Rheumatology', healthCategory: 'core_medical' },
  { label: 'Physical Therapy', value: 'Physical Therapy', healthCategory: 'core_medical' },
  { label: 'Imaging / Radiology', value: 'Imaging / Radiology', healthCategory: 'vaccines_labs' },
  { label: 'Pharmacy', value: 'Pharmacy', healthCategory: 'core_medical' },
  { label: 'Other', value: OTHER_SPECIALTY_KEY, healthCategory: '' },
];

const ALIAS_TO_CANONICAL: Record<string, string> = {
  'primary care': 'Primary Care / Family Medicine',
  'family medicine': 'Primary Care / Family Medicine',
  'general practice': 'Primary Care / Family Medicine',
  'internal medicine': 'Primary Care / Family Medicine',
  'pcp': 'Primary Care / Family Medicine',
  'ob-gyn': "OB-GYN / Women's Health",
  obgyn: "OB-GYN / Women's Health",
  gynecology: "OB-GYN / Women's Health",
  "women's health": "OB-GYN / Women's Health",
  'womens health': "OB-GYN / Women's Health",
  'sexual health': 'Sexual Health / STI Clinic',
  'sti clinic': 'Sexual Health / STI Clinic',
  counseling: 'Mental Health / Counseling',
  therapist: 'Mental Health / Counseling',
  psychology: 'Mental Health / Counseling',
  'mental health': 'Mental Health / Counseling',
  'general dentistry': 'Dentistry',
  dentist: 'Dentistry',
  dental: 'Dentistry',
  optometry: 'Optometry / Eye Care',
  ophthalmology: 'Optometry / Eye Care',
  'eye care': 'Optometry / Eye Care',
  'preventive care / labs': 'Labs / Bloodwork',
  bloodwork: 'Labs / Bloodwork',
  'lab result': 'Labs / Bloodwork',
  labs: 'Labs / Bloodwork',
  vaccine: 'Vaccines / Immunizations',
  immunization: 'Vaccines / Immunizations',
  radiology: 'Imaging / Radiology',
  imaging: 'Imaging / Radiology',
};

export function healthCategoryFromSpecialty(specialty: string): ProfileCareCategory | '' {
  const canonical = canonicalSpecialty(specialty);
  if (!canonical) return '';
  const opt = SPECIALTY_OPTIONS.find((o) => o.value === canonical);
  return opt?.healthCategory ?? '';
}

export function canonicalSpecialty(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const exact = SPECIALTY_OPTIONS.find(
    (o) => o.value !== OTHER_SPECIALTY_KEY && o.value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact.value;

  const alias = ALIAS_TO_CANONICAL[trimmed.toLowerCase()];
  if (alias) return alias;

  // Unknown values remain custom specialties. Partial substring matching is not
  // safe here: for example, "patient assessment" contains the option "ENT".
  return trimmed;
}

export function resolveSpecialtySelectState(value: string): {
  selectValue: string;
  customValue: string;
  displayValue: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { selectValue: '', customValue: '', displayValue: '' };
  }

  const canonical = canonicalSpecialty(trimmed);
  const known = SPECIALTY_OPTIONS.find((o) => o.value === canonical && o.value !== OTHER_SPECIALTY_KEY);
  if (known) {
    return { selectValue: known.value, customValue: '', displayValue: known.value };
  }

  return { selectValue: OTHER_SPECIALTY_KEY, customValue: trimmed, displayValue: trimmed };
}

export function normalizeSpecialtyFromText(text: string): string {
  const direct = text.match(/(?:^|\n)\s*Specialty\s*:?\s*(.+)$/im)?.[1]?.trim();
  if (direct) {
    const c = canonicalSpecialty(direct);
    if (c) return c;
  }

  // Full-document inference must use bounded, meaningful phrases. In particular,
  // never treat "ent" inside patient, treatment, assessment, or document as ENT.
  const evidence: Array<[RegExp, string]> = [
    [/\b(?:ear[ ,/-]+nose[ ,/&-]+(?:and[ ,/&-]+)?throat|otolaryngolog(?:y|ist))\b/i, 'ENT'],
    [/\b(?:dermatolog(?:y|ist)|skin clinic)\b/i, 'Dermatology'],
    [/\b(?:family medicine|primary care|general practice|internal medicine)\b/i, 'Primary Care / Family Medicine'],
    [/\b(?:mental health|behavioral health|counseling|psychology|psychotherapy)\b/i, 'Mental Health / Counseling'],
    [/\bpsychiatr(?:y|ist)\b/i, 'Psychiatry'],
    [/\b(?:dentistry|dentist|dental clinic)\b/i, 'Dentistry'],
    [/\b(?:optometry|ophthalmology|eye care)\b/i, 'Optometry / Eye Care'],
    [/\b(?:radiology|diagnostic imaging)\b/i, 'Imaging / Radiology'],
  ];
  for (const [pattern, specialty] of evidence) {
    if (pattern.test(text)) return specialty;
  }

  const behavioralCredential = /,\s*(?:LPC|LCSW|LMFT|LMSW|LP|PsyD|PhD)\b/i.test(text);
  if (behavioralCredential || /\b(?:psychologist|therapist|counselor)\b/i.test(text)) {
    return 'Mental Health / Counseling';
  }

  return direct ? canonicalSpecialty(direct) : '';
}

export function specialtyMatches(stored: string, filterValue: string): boolean {
  if (!filterValue) return true;
  if (!stored.trim()) return false;

  const storedCanonical = canonicalSpecialty(stored).toLowerCase();
  const filterCanonical = canonicalSpecialty(filterValue).toLowerCase();

  if (filterValue === OTHER_SPECIALTY_KEY) {
    const known = SPECIALTY_OPTIONS.some(
      (o) => o.value !== OTHER_SPECIALTY_KEY && o.value.toLowerCase() === storedCanonical,
    );
    return !known;
  }

  if (storedCanonical === filterCanonical) return true;
  return stored.toLowerCase().includes(filterCanonical) || filterCanonical.includes(stored.toLowerCase());
}

export function getSpecialtyFilterOptions(): { label: string; value: string }[] {
  return [
    { label: 'All specialties', value: '' },
    ...SPECIALTY_OPTIONS.filter((o) => o.value !== OTHER_SPECIALTY_KEY).map((o) => ({
      label: o.label,
      value: o.value,
    })),
    { label: 'Other (custom)', value: OTHER_SPECIALTY_KEY },
  ];
}
