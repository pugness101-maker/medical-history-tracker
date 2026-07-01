import { v4 as uuidv4 } from 'uuid';
import type { AppData, MedicalRecord } from '../types';
import type {
  VaccineDose,
  VaccineKey,
  VaccineProfile,
  VaccineStatus,
} from '../types/vaccine';
import { VACCINE_STATUS_EMOJI, VACCINE_STATUS_LABELS } from '../types/vaccine';
import { addMonthsToDate } from './dueDates';
import { formatDate, sortByDateDesc } from './format';
import { allVaccineKeys, detectVaccineKey, getCatalogEntry } from './vaccineCatalog';
import { parseVaccinesFromText, type ParsedVaccineDose } from './vaccineParser';

export interface VaccineRowView {
  key: VaccineKey;
  name: string;
  lastDose: string | null;
  seriesStatus: string;
  boosterDue: string | null;
  boosterRecommendation: string;
  status: VaccineStatus;
  notes: string;
  doses: VaccineDose[];
  recordIds: string[];
  records: MedicalRecord[];
  expandedNotes: string;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function mergeDoses(existing: VaccineDose[], incoming: VaccineDose[]): VaccineDose[] {
  const seen = new Set(existing.map((d) => `${d.date}|${d.product ?? ''}|${d.recordId ?? ''}`));
  const merged = [...existing];
  for (const dose of incoming) {
    const key = `${dose.date}|${dose.product ?? ''}|${dose.recordId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(dose);
  }
  return merged.sort((a, b) => sortByDateDesc(a.date, b.date));
}

export function createEmptyProfile(key: VaccineKey, now = new Date().toISOString()): VaccineProfile {
  const catalog = getCatalogEntry(key);
  return {
    key,
    notes: '',
    doses: [],
    recordIds: [],
    notApplicable: catalog.adultDefault === 'childhood_only',
    createdAt: now,
    updatedAt: now,
  };
}

export function ensureVaccineProfiles(profiles: VaccineProfile[] | undefined): VaccineProfile[] {
  const now = new Date().toISOString();
  const byKey = new Map((profiles ?? []).map((p) => [p.key, p]));
  return allVaccineKeys().map((key) => {
    const existing = byKey.get(key);
    if (existing) {
      return {
        ...existing,
        doses: existing.doses ?? [],
        recordIds: existing.recordIds ?? [],
      };
    }
    return createEmptyProfile(key, now);
  });
}

function parsedToDoses(
  parsed: ParsedVaccineDose[],
  record: MedicalRecord,
): { key: VaccineKey; doses: VaccineDose[] }[] {
  const grouped = new Map<VaccineKey, VaccineDose[]>();
  for (const item of parsed) {
    if (!item.date) continue;
    const dose: VaccineDose = {
      id: uuidv4(),
      date: item.date,
      provider: record.provider,
      product: item.product,
      recordId: record.id,
      notes: item.rawLine,
    };
    const list = grouped.get(item.key) ?? [];
    list.push(dose);
    grouped.set(item.key, list);
  }
  return [...grouped.entries()].map(([key, doses]) => ({ key, doses }));
}

function dosesFromSingleRecord(record: MedicalRecord): { key: VaccineKey; doses: VaccineDose[] }[] {
  const key = detectVaccineKey(record.summary);
  if (!key || !record.date) return [];
  return [{
    key,
    doses: [{
      id: uuidv4(),
      date: record.date,
      provider: record.provider,
      product: record.summary,
      recordId: record.id,
      notes: record.notes,
    }],
  }];
}

function isImmunizationRecord(record: MedicalRecord): boolean {
  const text = `${record.fileName}\n${record.summary}\n${record.extractedText}`.toLowerCase();
  return text.includes('immunization') || text.includes('vaccination history');
}

export function applyRecordToProfiles(
  profiles: VaccineProfile[],
  record: MedicalRecord,
): VaccineProfile[] {
  const now = new Date().toISOString();
  let parsed = parseVaccinesFromText(record.extractedText || '');
  if (parsed.length === 0 && record.recordType === 'vaccine') {
    parsed = parseVaccinesFromText(`${record.summary}\n${record.notes}`);
  }

  const updates =
    parsed.length > 0
      ? parsedToDoses(parsed, record)
      : record.recordType === 'vaccine'
        ? dosesFromSingleRecord(record)
        : [];

  const parsedKeys = new Set(parsed.map((p) => p.key));
  const seriesCompleteKeys = new Set(
    parsed.filter((p) => !p.date && p.rawLine?.toLowerCase().includes('series')).map((p) => p.key),
  );

  return profiles.map((profile) => {
    const match = updates.find((u) => u.key === profile.key);
    const linkOnly = parsedKeys.has(profile.key) && !match;
    const seriesComplete = seriesCompleteKeys.has(profile.key);

    if (!match && !linkOnly && !seriesComplete) return profile;

    const recordIds = profile.recordIds.includes(record.id)
      ? profile.recordIds
      : [...profile.recordIds, record.id];

    if (!match && (linkOnly || seriesComplete)) {
      return {
        ...profile,
        recordIds,
        notes: seriesComplete ? profile.notes || 'Completed series' : profile.notes,
        notApplicable: seriesComplete ? false : profile.notApplicable,
        updatedAt: now,
      };
    }

    if (!match) return profile;

    return {
      ...profile,
      doses: mergeDoses(profile.doses, match.doses),
      recordIds,
      notes: seriesComplete ? profile.notes || 'Completed series' : profile.notes,
      notApplicable: false,
      updatedAt: now,
    };
  });
}

export function syncVaccinesFromAllRecords(data: AppData): AppData {
  let profiles = ensureVaccineProfiles(data.vaccineProfiles);
  for (const record of data.records) {
    if (
      record.recordType === 'vaccine' ||
      parseVaccinesFromText(record.extractedText).length > 0 ||
      isImmunizationRecord(record)
    ) {
      profiles = applyRecordToProfiles(profiles, record);
    }
  }
  return { ...data, vaccineProfiles: profiles };
}

export function syncVaccinesFromRecord(data: AppData, record: MedicalRecord): AppData {
  const profiles = applyRecordToProfiles(ensureVaccineProfiles(data.vaccineProfiles), record);
  return { ...data, vaccineProfiles: profiles };
}

function getLastDose(doses: VaccineDose[]): string | null {
  const dated = doses.filter((d) => d.date).sort((a, b) => sortByDateDesc(a.date, b.date));
  return dated[0]?.date ?? null;
}

function seriesStatusText(key: VaccineKey, doses: VaccineDose[], notes: string): string {
  const catalog = getCatalogEntry(key);
  const count = doses.filter((d) => d.date).length;
  const lowerNotes = `${notes} ${doses.map((d) => d.notes ?? '').join(' ')}`.toLowerCase();

  if (lowerNotes.includes('completed series') || lowerNotes.includes('series complete')) {
    return 'Series complete';
  }
  if (count >= catalog.seriesDoses) return 'Series complete';
  if (count === 0) return 'No doses recorded';
  return `${count} of ${catalog.seriesDoses} dose${catalog.seriesDoses === 1 ? '' : 's'}`;
}

function computeBoosterDue(key: VaccineKey, lastDose: string | null, doses: VaccineDose[]): string | null {
  const catalog = getCatalogEntry(key);
  if (!lastDose || !catalog.boosterIntervalMonths) return null;

  const seriesComplete =
    doses.filter((d) => d.date).length >= catalog.seriesDoses ||
    doses.some((d) => (d.notes ?? '').toLowerCase().includes('series complete'));

  if (seriesComplete || catalog.seriesDoses === 1) {
    return addMonthsToDate(lastDose, catalog.boosterIntervalMonths);
  }
  return null;
}

function boosterRecommendationText(
  key: VaccineKey,
  status: VaccineStatus,
  boosterDue: string | null,
  seriesStatus: string,
): string {
  const catalog = getCatalogEntry(key);

  if (status === 'not_applicable') {
    return catalog.adultDefault === 'childhood_only'
      ? 'Typically completed in childhood.'
      : 'Not currently tracked.';
  }
  if (status === 'series_complete' && !boosterDue) {
    return 'Primary series complete. No booster currently recommended.';
  }
  if (key === 'influenza') {
    return boosterDue
      ? `Annual flu vaccine recommended by ${formatDate(boosterDue)}.`
      : 'Annual flu vaccine recommended each fall.';
  }
  if (key === 'covid19') {
    return boosterDue
      ? `Consider updated COVID-19 booster by ${formatDate(boosterDue)}.`
      : 'Follow CDC guidance for updated COVID-19 boosters.';
  }
  if (key === 'tdap') {
    return boosterDue
      ? `Tdap booster recommended every 10 years — due ${formatDate(boosterDue)}.`
      : 'Tdap booster recommended every 10 years for adults.';
  }
  if (key === 'meningococcal') {
    return boosterDue
      ? `Booster dose recommended by ${formatDate(boosterDue)}.`
      : seriesStatus.toLowerCase().includes('complete')
        ? 'Booster may be needed based on age and risk factors.'
        : 'Complete primary series first.';
  }
  if (boosterDue) {
    return `Next dose recommended by ${formatDate(boosterDue)}.`;
  }
  if (seriesStatus.toLowerCase().includes('complete')) {
    return 'Series complete.';
  }
  return `Complete ${catalog.seriesDoses}-dose series.`;
}

function computeStatus(
  profile: VaccineProfile,
  boosterDue: string | null,
  seriesStatus: string,
): VaccineStatus {
  if (profile.notApplicable) return 'not_applicable';

  const catalog = getCatalogEntry(profile.key);
  const doseCount = profile.doses.filter((d) => d.date).length;

  if (doseCount === 0 && catalog.adultDefault === 'childhood_only') {
    return 'not_applicable';
  }

  const seriesComplete = seriesStatus.toLowerCase().includes('complete');
  const today = todayIso();

  if (boosterDue) {
    if (boosterDue < today) return 'overdue';
    const soon = addMonthsToDate(today, 1);
    if (soon && boosterDue <= soon) return 'due_soon';
    return 'up_to_date';
  }

  if (seriesComplete && !catalog.boosterIntervalMonths) {
    return 'series_complete';
  }

  if (doseCount === 0) {
    return catalog.adultDefault === 'optional' ? 'not_applicable' : 'overdue';
  }

  return 'up_to_date';
}

export function buildVaccineRowView(
  profile: VaccineProfile,
  records: MedicalRecord[],
): VaccineRowView {
  const catalog = getCatalogEntry(profile.key);
  const lastDose = getLastDose(profile.doses);
  const seriesStatus = seriesStatusText(profile.key, profile.doses, profile.notes);
  const boosterDue = computeBoosterDue(profile.key, lastDose, profile.doses);
  const status = computeStatus(profile, boosterDue, seriesStatus);
  const linkedRecords = records.filter(
    (r) => profile.recordIds.includes(r.id) || profile.doses.some((d) => d.recordId === r.id),
  );

  return {
    key: profile.key,
    name: catalog.name,
    lastDose,
    seriesStatus,
    boosterDue,
    boosterRecommendation: boosterRecommendationText(profile.key, status, boosterDue, seriesStatus),
    status,
    notes: profile.notes,
    doses: [...profile.doses].sort((a, b) => sortByDateDesc(a.date, b.date)),
    recordIds: profile.recordIds,
    records: linkedRecords,
    expandedNotes: profile.notes,
  };
}

export function buildAllVaccineRows(data: AppData): VaccineRowView[] {
  const profiles = ensureVaccineProfiles(data.vaccineProfiles);
  return profiles.map((p) => buildVaccineRowView(p, data.records));
}

export function countActionNeeded(rows: VaccineRowView[]): number {
  return rows.filter((r) => r.status === 'overdue' || r.status === 'due_soon').length;
}

export function statusBadgeClass(status: VaccineStatus): string {
  const map: Record<VaccineStatus, string> = {
    up_to_date: 'badge-complete',
    due_soon: 'badge-due-soon',
    overdue: 'badge-overdue',
    series_complete: 'badge-optional',
    not_applicable: 'badge-scheduled',
  };
  return map[status];
}

export function formatStatusLabel(status: VaccineStatus): string {
  return `${VACCINE_STATUS_EMOJI[status]} ${VACCINE_STATUS_LABELS[status]}`;
}

export function updateVaccineNotes(
  profiles: VaccineProfile[],
  key: VaccineKey,
  notes: string,
): VaccineProfile[] {
  const now = new Date().toISOString();
  return profiles.map((p) => (p.key === key ? { ...p, notes, updatedAt: now } : p));
}

export const SAMPLE_IMMUNIZATION_RECORD_TEXT = `IMMUNIZATION RECORD
Patient Immunization History

COVID-19 Pfizer: 02/14/2022, 04/18/2022
Meningococcal (MenACWY): 10/12/2018, 04/25/2024
HPV-9 (Gardasil 9): 10/12/2018, 04/19/2019
Tdap (Adacel): 10/12/2018
Influenza: 10/15/2024, 10/18/2023, 10/12/2022, 09/28/2021
Hepatitis A: completed series — 03/15/2010, 09/20/2010
Hepatitis B: completed series — 06/01/2008, 08/01/2008, 02/01/2009
MMR: completed series — 05/10/2005, 05/10/2008
Varicella: completed series — 05/10/2005, 05/10/2008
Polio (IPV): completed series — 02/01/2004, 04/01/2004, 06/01/2004, 02/01/2005
Pneumococcal (PCV13): 10/12/2018
Hib: completed series — childhood
Rotavirus: completed series — childhood
Tuberculosis (PPD): 08/15/2023 — negative

Source document: immunization_record.pdf
`;

export function createSeedImmunizationRecord(now: string): MedicalRecord {
  const today = now.split('T')[0];
  return {
    id: uuidv4(),
    recordType: 'vaccine',
    date: '2024-04-25',
    uploadDate: today,
    provider: 'Student Health Services',
    summary: 'Immunization record — COVID-19, Meningococcal, HPV, Tdap, Influenza, and childhood series',
    notes: 'Uploaded immunization history PDF. All doses parsed and merged automatically.',
    fileName: 'immunization_record.pdf',
    extractedText: SAMPLE_IMMUNIZATION_RECORD_TEXT,
    createdAt: now,
    updatedAt: now,
  };
}

export function seedVaccineDataForApp(data: AppData, now: string): AppData {
  const immunizationRecord = createSeedImmunizationRecord(now);
  const records = [
    immunizationRecord,
    ...data.records.filter((r) => r.fileName !== 'immunization_record.pdf'),
  ];
  return syncVaccinesFromAllRecords({ ...data, records });
}
