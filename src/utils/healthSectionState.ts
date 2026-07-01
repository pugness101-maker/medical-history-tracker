export const HEALTH_SECTION_IDS = [
  'preventive',
  'providers',
  'conditions',
  'medications',
  'insurance',
  'vaccines',
  'labs',
] as const;

export type HealthSectionId = (typeof HEALTH_SECTION_IDS)[number];

const STORAGE_KEY = 'health-sections-open';

export const DEFAULT_HEALTH_SECTIONS_OPEN: Record<HealthSectionId, boolean> = {
  preventive: true,
  providers: false,
  conditions: false,
  medications: false,
  insurance: false,
  vaccines: false,
  labs: false,
};

const LEGACY_SECTION_MAP: Record<string, HealthSectionId> = {
  vaccines: 'vaccines',
  labs: 'labs',
  'vaccines-labs': 'vaccines',
};

export function normalizeHealthSectionParam(param: string | null | undefined): HealthSectionId | null {
  if (!param) return null;
  if (param in LEGACY_SECTION_MAP) return LEGACY_SECTION_MAP[param];
  if (HEALTH_SECTION_IDS.includes(param as HealthSectionId)) return param as HealthSectionId;
  return null;
}

export function loadHealthSectionState(): Record<HealthSectionId, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_HEALTH_SECTIONS_OPEN };
    const parsed = JSON.parse(raw) as Partial<Record<string, boolean>>;
    const merged = { ...DEFAULT_HEALTH_SECTIONS_OPEN };
    for (const id of HEALTH_SECTION_IDS) {
      if (typeof parsed[id] === 'boolean') merged[id] = parsed[id]!;
    }
    if (parsed['vaccines-labs'] && parsed.vaccines === undefined) {
      merged.vaccines = parsed['vaccines-labs']!;
    }
    return merged;
  } catch {
    return { ...DEFAULT_HEALTH_SECTIONS_OPEN };
  }
}

export function saveHealthSectionState(state: Record<HealthSectionId, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
