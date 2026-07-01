import type { VaccineKey } from '../types/vaccine';
import { detectVaccineKey, VACCINE_CATALOG, VACCINE_CATALOG_BY_KEY } from './vaccineCatalog';

export interface ParsedVaccineDose {
  key: VaccineKey;
  date: string;
  product?: string;
  rawLine?: string;
}

const DATE_PATTERNS = [
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseDateToken(token: string): string | null {
  const slash = token.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return toIsoDate(Number(slash[3]), Number(slash[1]), Number(slash[2]));
  }
  const iso = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return token;
  return null;
}

function extractDatesFromSegment(segment: string): string[] {
  const dates: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(segment)) !== null) {
      if (match[0].includes('-')) {
        dates.push(match[0]);
      } else {
        const iso = toIsoDate(Number(match[3]), Number(match[1]), Number(match[2]));
        if (iso) dates.push(iso);
      }
    }
  }
  return [...new Set(dates)];
}

function lineLooksLikeVaccineLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (detectVaccineKey(line)) return true;
  return (
    lower.includes('immunization') ||
    lower.includes('vaccine') ||
    lower.includes('vaccination') ||
    lower.includes('dose')
  );
}

function parseLineForDoses(line: string): ParsedVaccineDose[] {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 4) return [];

  const key = detectVaccineKey(trimmed);
  if (!key) return [];

  const entry = VACCINE_CATALOG_BY_KEY[key];
  const colonIdx = trimmed.indexOf(':');
  const dateSegment = colonIdx >= 0 ? trimmed.slice(colonIdx + 1) : trimmed;
  const productSegment = colonIdx >= 0 ? trimmed.slice(0, colonIdx) : trimmed;

  const lower = trimmed.toLowerCase();
  const dates = extractDatesFromSegment(colonIdx >= 0 ? trimmed : dateSegment);
  const seriesComplete = lower.includes('completed series') || lower.includes('series complete');

  if (dates.length > 0) {
    let product = productSegment.trim();
    for (const alias of entry.aliases) {
      product = product.replace(new RegExp(alias, 'i'), '').trim();
    }
    product = product.replace(/^[-–—:\s]+/, '').replace(/[-–—:\s]+$/, '').trim();

    return dates.map((date) => ({
      key,
      date,
      product: product || entry.name,
      rawLine: trimmed,
    }));
  }

  if (seriesComplete) {
    return [{ key, date: '', product: entry.name, rawLine: trimmed }];
  }

  return [];
}

export function parseVaccinesFromText(text: string): ParsedVaccineDose[] {
  if (!text.trim()) return [];

  const results: ParsedVaccineDose[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!lineLooksLikeVaccineLine(line)) continue;
    results.push(...parseLineForDoses(line));
  }

  if (results.length === 0) {
    for (const entry of VACCINE_CATALOG) {
      const blockPattern = new RegExp(
        `${entry.name}[^\\n]*(?:\\n[^\\n]*){0,2}`,
        'i',
      );
      const block = text.match(blockPattern)?.[0];
      if (block) {
        results.push(...parseLineForDoses(block.replace(/\n/g, ' ')));
      }
    }
  }

  return results;
}

export function isImmunizationRecord(text: string, fileName = ''): boolean {
  const combined = `${fileName}\n${text}`.toLowerCase();
  if (combined.includes('immunization record') || combined.includes('vaccination history')) {
    return true;
  }
  if (parseVaccinesFromText(text).length >= 2) return true;
  return (
    combined.includes('immunization') &&
    (combined.includes('vaccine') || combined.includes('dose') || combined.includes('hepatitis'))
  );
}

export function suggestRecordTypeFromText(text: string, fileName = ''): 'vaccine' | null {
  return isImmunizationRecord(text, fileName) ? 'vaccine' : null;
}

export function summarizeParsedVaccines(doses: ParsedVaccineDose[]): string {
  const byKey = new Map<VaccineKey, number>();
  for (const d of doses) {
    if (!d.date) continue;
    byKey.set(d.key, (byKey.get(d.key) ?? 0) + 1);
  }
  const parts = [...byKey.entries()].map(([key, count]) => {
    const name = VACCINE_CATALOG_BY_KEY[key].name;
    return `${name} (${count} dose${count === 1 ? '' : 's'})`;
  });
  return parts.length ? `Immunization record — ${parts.join(', ')}` : 'Immunization record';
}
