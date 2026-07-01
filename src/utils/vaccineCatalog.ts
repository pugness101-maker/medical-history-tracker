import type { VaccineCatalogEntry, VaccineKey } from '../types/vaccine';

export const VACCINE_CATALOG: VaccineCatalogEntry[] = [
  {
    key: 'covid19',
    name: 'COVID-19',
    aliases: ['covid', 'covid-19', 'covid19', 'sars-cov-2', 'pfizer', 'moderna', 'novavax', 'comirnaty'],
    seriesDoses: 2,
    boosterIntervalMonths: 12,
    adultDefault: 'track',
  },
  {
    key: 'influenza',
    name: 'Influenza',
    aliases: ['flu', 'influenza', 'flu shot', 'fluzone', 'afluria'],
    seriesDoses: 1,
    boosterIntervalMonths: 12,
    adultDefault: 'track',
  },
  {
    key: 'tdap',
    name: 'Tdap',
    aliases: ['tdap', 't-dap', 'dtap', 'tetanus', 'diphtheria', 'pertussis', 'adacel', 'boostrix'],
    seriesDoses: 1,
    boosterIntervalMonths: 120,
    adultDefault: 'track',
  },
  {
    key: 'hpv',
    name: 'HPV',
    aliases: ['hpv', 'hpv-9', 'hpv9', 'gardasil', 'human papillomavirus'],
    seriesDoses: 2,
    boosterIntervalMonths: null,
    adultDefault: 'track',
  },
  {
    key: 'meningococcal',
    name: 'Meningococcal',
    aliases: ['meningococcal', 'menactra', 'menveo', 'menacwy', 'men b', 'bexsero', 'trumenba'],
    seriesDoses: 1,
    boosterIntervalMonths: 60,
    adultDefault: 'track',
  },
  {
    key: 'hepatitis_a',
    name: 'Hepatitis A',
    aliases: ['hepatitis a', 'hep a', 'hepa', 'havrix', 'vaqta'],
    seriesDoses: 2,
    boosterIntervalMonths: null,
    adultDefault: 'track',
  },
  {
    key: 'hepatitis_b',
    name: 'Hepatitis B',
    aliases: ['hepatitis b', 'hep b', 'hepb', 'engerix', 'recombivax'],
    seriesDoses: 3,
    boosterIntervalMonths: null,
    adultDefault: 'track',
  },
  {
    key: 'mmr',
    name: 'MMR',
    aliases: ['mmr', 'measles', 'mumps', 'rubella', 'priorix', 'm-m-r'],
    seriesDoses: 2,
    boosterIntervalMonths: null,
    adultDefault: 'track',
  },
  {
    key: 'varicella',
    name: 'Varicella',
    aliases: ['varicella', 'chickenpox', 'chicken pox', 'varivax'],
    seriesDoses: 2,
    boosterIntervalMonths: null,
    adultDefault: 'track',
  },
  {
    key: 'polio_ipv',
    name: 'Polio (IPV)',
    aliases: ['polio', 'ipv', 'inactivated polio', 'poliovirus'],
    seriesDoses: 4,
    boosterIntervalMonths: null,
    adultDefault: 'childhood_only',
  },
  {
    key: 'pneumococcal',
    name: 'Pneumococcal',
    aliases: ['pneumococcal', 'pcv', 'pcv13', 'pcv15', 'pcv20', 'ppsv23', 'prevnar', 'pneumovax'],
    seriesDoses: 1,
    boosterIntervalMonths: 60,
    adultDefault: 'optional',
  },
  {
    key: 'hib',
    name: 'Hib',
    aliases: ['hib', 'haemophilus', 'haemophilus influenzae type b', 'acthib', 'pedvax'],
    seriesDoses: 3,
    boosterIntervalMonths: null,
    adultDefault: 'childhood_only',
  },
  {
    key: 'rotavirus',
    name: 'Rotavirus',
    aliases: ['rotavirus', 'rotateq', 'rotarix', 'rota'],
    seriesDoses: 2,
    boosterIntervalMonths: null,
    adultDefault: 'childhood_only',
  },
  {
    key: 'tuberculosis_ppd',
    name: 'Tuberculosis (PPD)',
    aliases: ['ppd', 'tuberculosis', 'tb test', 'tb skin test', 'mantoux', 'quantiferon', 't-spot'],
    seriesDoses: 1,
    boosterIntervalMonths: 12,
    adultDefault: 'optional',
  },
];

export const VACCINE_CATALOG_BY_KEY: Record<VaccineKey, VaccineCatalogEntry> = Object.fromEntries(
  VACCINE_CATALOG.map((e) => [e.key, e]),
) as Record<VaccineKey, VaccineCatalogEntry>;

export function getCatalogEntry(key: VaccineKey): VaccineCatalogEntry {
  return VACCINE_CATALOG_BY_KEY[key];
}

export function detectVaccineKey(text: string): VaccineKey | null {
  const lower = text.toLowerCase();
  for (const entry of VACCINE_CATALOG) {
    for (const alias of entry.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(lower)) return entry.key;
    }
    if (lower.includes(entry.name.toLowerCase())) return entry.key;
  }
  return null;
}

export function allVaccineKeys(): VaccineKey[] {
  return VACCINE_CATALOG.map((e) => e.key);
}
