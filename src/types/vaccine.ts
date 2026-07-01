export type VaccineKey =
  | 'covid19'
  | 'influenza'
  | 'tdap'
  | 'hpv'
  | 'meningococcal'
  | 'hepatitis_a'
  | 'hepatitis_b'
  | 'mmr'
  | 'varicella'
  | 'polio_ipv'
  | 'pneumococcal'
  | 'hib'
  | 'rotavirus'
  | 'tuberculosis_ppd';

export type VaccineStatus =
  | 'up_to_date'
  | 'due_soon'
  | 'overdue'
  | 'series_complete'
  | 'not_applicable';

export interface VaccineDose {
  id: string;
  date: string;
  provider: string;
  product?: string;
  lotNumber?: string;
  notes?: string;
  recordId?: string;
}

export interface VaccineProfile {
  key: VaccineKey;
  notes: string;
  doses: VaccineDose[];
  /** MedicalRecord ids linked to this vaccine */
  recordIds: string[];
  notApplicable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaccineCatalogEntry {
  key: VaccineKey;
  name: string;
  aliases: string[];
  seriesDoses: number;
  /** Months until booster recommended after last dose; null = no recurring booster */
  boosterIntervalMonths: number | null;
  /** Typical adult relevance */
  adultDefault: 'track' | 'optional' | 'childhood_only';
}

export const VACCINE_STATUS_LABELS: Record<VaccineStatus, string> = {
  up_to_date: 'Up to Date',
  due_soon: 'Due Soon',
  overdue: 'Overdue',
  series_complete: 'Series Complete',
  not_applicable: 'Not Applicable',
};

export const VACCINE_STATUS_EMOJI: Record<VaccineStatus, string> = {
  up_to_date: '🟢',
  due_soon: '🟡',
  overdue: '🔴',
  series_complete: '⚪',
  not_applicable: '🔵',
};
