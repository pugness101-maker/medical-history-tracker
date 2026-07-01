export const HEALTH_SECTION_IDS = [
  'preventive',
  'providers',
  'conditions',
  'medications',
  'insurance',
  'vaccines-labs',
] as const;

export type HealthSectionId = (typeof HEALTH_SECTION_IDS)[number];

const STORAGE_KEY = 'health-sections-open';

export const DEFAULT_HEALTH_SECTIONS_OPEN: Record<HealthSectionId, boolean> = {
  preventive: true,
  providers: false,
  conditions: false,
  medications: false,
  insurance: false,
  'vaccines-labs': false,
};

export function normalizeHealthSectionParam(param: string | null | undefined): HealthSectionId | null {
  if (!param) return null;
  if (param === 'vaccines' || param === 'labs') return 'vaccines-labs';
  if (HEALTH_SECTION_IDS.includes(param as HealthSectionId)) return param as HealthSectionId;
  return null;
}

export function loadHealthSectionState(): Record<HealthSectionId, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_HEALTH_SECTIONS_OPEN };
    const parsed = JSON.parse(raw) as Partial<Record<HealthSectionId, boolean>>;
    return { ...DEFAULT_HEALTH_SECTIONS_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_HEALTH_SECTIONS_OPEN };
  }
}

export function saveHealthSectionState(state: Record<HealthSectionId, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
