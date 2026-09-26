import { canonicalSpecialty, normalizeSpecialtyFromText } from './specialties';

export interface AutofillResult {
  providerName: string;
  specialty: string;
  visitDate: string;
  visitTime: string;
  reasonForVisit: string;
  prescriptions: string;
  diagnosis: string;
  treatmentPlan: string;
  followUpNotes: string;
  dischargeInstructions: string;
  extraNotes: string;
  followUpNeeded: boolean;
  clinic: string;
}

/** Merge only clinical fields, preserving any upload-state properties on current. */
export function mergeClinicalAutofill<T extends AutofillResult>(current: T, parsed: AutofillResult): T {
  return {
    ...current,
    providerName: parsed.providerName,
    specialty: parsed.specialty,
    visitDate: parsed.visitDate,
    visitTime: parsed.visitTime,
    reasonForVisit: parsed.reasonForVisit,
    prescriptions: parsed.prescriptions,
    diagnosis: parsed.diagnosis,
    treatmentPlan: parsed.treatmentPlan,
    followUpNotes: parsed.followUpNotes,
    dischargeInstructions: parsed.dischargeInstructions,
    extraNotes: parsed.extraNotes,
    followUpNeeded: parsed.followUpNeeded,
    clinic: parsed.clinic,
  };
}

const CREDENTIAL_SUFFIX =
  'LPC|LCSW|LMFT|LMSW|LP|PsyD|PhD|Psychologist|Therapist|Counselor|MD|DO|NP|PA(?:-C)?|RN|APRN|DNP|PMHNP|FNP|CNP';

const SECTION_STOP =
  'provider|doctor|physician|specialty|date|time|visit|reason|chief complaint|diagnosis|assessment|treatment|plan|care plan|prescription|medications?|rx|follow[- ]?up|notes|clinic|location|facility|documents?|referral|started|ended|discharge|instructions';

function captureSection(text: string, labels: string[], maxLength = 800): string {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:${SECTION_STOP})\\s*:|$)`,
      'im',
    );
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = match[1].trim();
      if (value) return value.slice(0, maxLength);
    }
  }
  return '';
}

function captureLineValue(text: string, labels: string[], maxLen = 200): string {
  for (const label of labels) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*:?\\s*(.+)$`, 'im');
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim().slice(0, maxLen);
  }
  return '';
}

/** Same-line field value, stopping before the next known label (for PDF single-line text). */
function captureInlineValue(text: string, label: string, stopLabels: string[]): string {
  const stop = stopLabels.join('|');
  const pattern = new RegExp(
    `\\b${label}\\s*:?\\s*(.+?)(?=\\s+(?:${stop})\\s*:?|\\s+(?:${stop})\\b|$)`,
    'i',
  );
  const match = text.match(pattern);
  return match?.[1]?.trim().slice(0, 200) ?? '';
}

function parseDate(text: string): string {
  const iso = text.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const us = text.match(/\b(0?[1-9]|1[0-2])[/\\-](0?[1-9]|[12]\d|3[01])[/\\-](20\d{2})\b/);
  if (us) {
    const mm = us[1].padStart(2, '0');
    const dd = us[2].padStart(2, '0');
    return `${us[3]}-${mm}-${dd}`;
  }

  const written = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i,
  );
  if (written) {
    const months: Record<string, string> = {
      jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
      aug: '08', august: '08', sep: '09', september: '09', oct: '10', october: '10',
      nov: '11', november: '11', dec: '12', december: '12',
    };
    const mm = months[written[1].toLowerCase()];
    const dd = written[2].padStart(2, '0');
    return `${written[3]}-${mm}-${dd}`;
  }

  return '';
}

function parseEncounterDate(text: string): string {
  const encounterLabels = /visit date|date of service|\bDOS\b|encounter date|appointment date|session date|service date/i;
  const excludedLabels = /date of birth|\bD\.?O\.?B\.?\b|\bDOB\b|birth date|born|signed|printed|created|uploaded|downloaded/i;
  const datePattern = /\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[\\/-]\d{1,2}[\\/-]20\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+20\d{2})\b/gi;
  const lines = text.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const match of line.matchAll(datePattern)) {
      const start = match.index ?? 0;
      const before = line.slice(0, start);
      const sameLineContext = `${before.slice(-80)} ${line.slice(start + match[0].length, start + match[0].length + 40)}`;
      const previousLine = lines[index - 1] ?? '';
      const associated = encounterLabels.test(sameLineContext) || (encounterLabels.test(previousLine) && !datePattern.test(previousLine));
      const date = parseDate(match[0]);
      if (date && associated && !excludedLabels.test(sameLineContext)) return date;
    }
  }
  return '';
}

function parseTime(text: string): string {
  const match = text.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i);
  if (!match) return '';

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function parseEncounterTime(text: string): string {
  const label = '(?:appointment|encounter|session|visit|service)(?:\\s+(?:start|end))?\\s+time';
  const sameLine = text.match(new RegExp(`\\b${label}\\s*:?\\s*(\\d{1,2}:\\d{2}\\s*(?:AM|PM)?)`, 'i'));
  if (sameLine) return parseTime(sameLine[1]);
  const nextLine = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:?\\s*\\n\\s*(\\d{1,2}:\\d{2}\\s*(?:AM|PM)?)`, 'i'));
  return nextLine ? parseTime(nextLine[1]) : '';
}

function parsePatientVariants(text: string): Set<string> {
  const value = text.match(/(?:^|\n)\s*(?:patient name|patient|member name)\s*:?\s*([^\n|]+)/im)?.[1]?.trim() ?? '';
  const clean = value.replace(/\b(?:DOB|MRN|phone|address)\b.*$/i, '').replace(/\s+/g, ' ').trim();
  const parts = clean.split(/\s*,\s*|\s+/).filter(Boolean);
  const variants = new Set<string>();
  if (clean) variants.add(clean.toLowerCase());
  if (parts.length >= 2) {
    variants.add(`${parts[0]} ${parts[1]}`.toLowerCase());
    variants.add(`${parts[1]} ${parts[0]}`.toLowerCase());
  }
  return variants;
}

function parseProvider(text: string): string {
  const patientVariants = parsePatientVariants(text);
  const isValidProvider = (value: string) => {
    const cleaned = value.replace(/\s+/g, ' ').trim().replace(/[|;]+$/, '');
    if (!cleaned || cleaned.length < 4 || cleaned.length > 120) return false;
    if ([...patientVariants].some((patient) => cleaned.toLowerCase().includes(patient))) return false;
    if (/^(name|date|dob|mrn|phone|fax|address)\b/i.test(cleaned)) return false;
    return /[A-Za-z].*[A-Za-z]/.test(cleaned);
  };

  const providerInline = text.match(
    new RegExp(
      `\\bProvider\\s*:?\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z'\\-]+)+,\\s*(?:${CREDENTIAL_SUFFIX}))`,
      'i',
    ),
  );
  if (providerInline?.[1] && isValidProvider(providerInline[1])) return providerInline[1].trim();

  // Credentialed clinician names are stronger evidence than nearby unlabeled names.
  const credentialMatches = text.matchAll(new RegExp(
    `\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z'\\-]+)+,\\s*(?:${CREDENTIAL_SUFFIX}))\\b`, 'g',
  ));
  for (const match of credentialMatches) {
    if (isValidProvider(match[1])) return match[1].trim();
  }

  const lineAfterLabel = text.match(
    /(?:^|\n)\s*(?:rendering |attending )?provider(?:\s+name)?\s*:?\s*\n\s*(.+)$/im,
  );
  if (lineAfterLabel?.[1] && isValidProvider(lineAfterLabel[1])) return lineAfterLabel[1].trim().slice(0, 120);

  const sameLine = captureLineValue(text, [
    'Rendering Provider',
    'Attending Provider',
    'Physician',
    'Doctor',
    'Attending',
    'Therapist',
    'Clinician',
  ]);
  if (isValidProvider(sameLine)) return sameLine;

  const drMatch = text.match(/\bDr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z'\\-]+)+)(?:,\s*(?:MD|DO))?/);
  if (drMatch) return `Dr. ${drMatch[1]}`;

  return captureInlineValue(text, 'Provider', [
    'Date', 'Visit Date', 'Started', 'Ended', 'Reason', 'Prescriptions',
    'Care Plan', 'Discharge', 'Documents', 'Diagnosis',
  ]);
}

function parseSpecialty(text: string): string {
  const direct = captureLineValue(text, ['Specialty', 'Department', 'Service']);
  if (direct) return canonicalSpecialty(direct);

  const clinic = captureLineValue(text, ['Clinic', 'Location', 'Facility', 'Office', 'Practice']);
  const clinicSpecialty = normalizeSpecialtyFromText(clinic);
  if (clinicSpecialty) return clinicSpecialty;

  return normalizeSpecialtyFromText(text);
}

function parsePrescriptions(text: string): string {
  const section = captureSection(text, [
    'Prescriptions?',
    'Medications?\\s*(?:prescribed|ordered|given)?',
    'Rx',
    'Current Medications?',
  ]);
  if (section) return section;

  const rxLines = text
    .split('\n')
    .filter((line) => /\b(mg|mcg|tablet|capsule|daily|twice|bid|tid|qid|prn|rx)\b/i.test(line))
    .slice(0, 8);
  return rxLines.join('\n').trim();
}

function hasFollowUp(text: string): boolean {
  return /\bfollow[- ]?up\b/i.test(text) && !/\bno follow[- ]?up\b/i.test(text);
}

function buildRecordNotes(parts: {
  treatmentPlan: string;
  dischargeInstructions: string;
  followUpNotes: string;
  prescriptions: string;
  extraNotes: string;
}): string {
  const sections: string[] = [];

  if (parts.treatmentPlan) sections.push(`Care Plan:\n${parts.treatmentPlan}`);
  if (parts.dischargeInstructions) sections.push(`Discharge Instructions:\n${parts.dischargeInstructions}`);
  if (parts.prescriptions) sections.push(`Prescriptions:\n${parts.prescriptions}`);
  if (parts.followUpNotes) sections.push(`Follow-up:\n${parts.followUpNotes}`);
  if (parts.extraNotes) sections.push(parts.extraNotes);

  return sections.join('\n\n').trim();
}

export function parseAutofillFromText(text: string): AutofillResult {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  const followUpNotes = captureSection(text, [
    'Follow[- ]?up\\s*(?:notes|instructions|plan)?',
    'Next (?:visit|appointment)',
    'Return (?:visit|in)',
  ]);

  const reasonForVisit =
    captureSection(text, [
      'Reason for (?:visit|appointment)',
      'Chief Complaints?',
      'Visit Reason',
      'Presenting (?:Problem|Concern)',
    ]) ||
    captureLineValue(text, ['Reason for Visit', 'Chief Complaints?', 'Reason', 'Visit Reason']) ||
    captureInlineValue(text, 'Reason for Visit', [
      'Prescriptions', 'Care Plan', 'Discharge', 'Documents', 'Started', 'Ended', 'Diagnosis',
    ]) ||
    captureInlineValue(text, 'Chief Complaints?', [
      'Prescriptions', 'Care Plan', 'Discharge', 'Documents', 'Started', 'Ended', 'Diagnosis',
    ]) ||
    normalized.match(/\bH\/O\s+([^\n|;,.()]+(?:\s+[^\n|;,.()]+)*)/i)?.[1]?.trim() ||
    '';

  const diagnosis = captureSection(text, [
    'Diagnosis',
    'Assessment',
    'Impression',
    'Findings',
    'Result',
  ]);

  const treatmentPlan = captureSection(text, [
    'Care Plan',
    'Treatment Plan',
    'Plan of Care',
    'Plan',
    'Recommendations',
    'Treatment',
  ]);

  const dischargeInstructions = captureSection(text, [
    'Discharge Instructions?',
    'After[- ]?Visit Instructions?',
    'Patient Instructions?',
  ]);

  const visitDate = parseEncounterDate(normalized);

  const visitTime = parseEncounterTime(normalized);

  const clinic = captureLineValue(text, [
    'Clinic',
    'Location',
    'Facility',
    'Office',
    'Practice',
  ]);

  const additionalNotes = captureSection(text, ['Additional Notes', 'Comments', 'Remarks']);

  const prescriptions = parsePrescriptions(normalized);

  const extraNotes = buildRecordNotes({
    treatmentPlan,
    dischargeInstructions,
    followUpNotes,
    prescriptions,
    extraNotes: additionalNotes,
  });

  return {
    providerName: parseProvider(normalized),
    specialty: parseSpecialty(normalized),
    visitDate,
    visitTime,
    reasonForVisit,
    prescriptions,
    diagnosis,
    treatmentPlan,
    followUpNotes,
    dischargeInstructions,
    extraNotes,
    followUpNeeded: hasFollowUp(normalized) || Boolean(followUpNotes),
    clinic,
  };
}

export function buildAppointmentNotes(review: AutofillResult, extractedText: string): string {
  const parts: string[] = [];

  if (review.prescriptions) {
    parts.push(`Prescriptions:\n${review.prescriptions}`);
  }
  if (review.treatmentPlan) {
    parts.push(`Care Plan:\n${review.treatmentPlan}`);
  }
  if (review.dischargeInstructions) {
    parts.push(`Discharge Instructions:\n${review.dischargeInstructions}`);
  }
  if (review.followUpNotes) {
    parts.push(`Follow-up Notes:\n${review.followUpNotes}`);
  }
  if (review.extraNotes) {
    parts.push(`Additional Notes:\n${review.extraNotes}`);
  }

  if (extractedText.trim() && parts.length === 0) {
    parts.push('Source text requires manual review.');
  }

  return parts.filter(Boolean).join('\n\n');
}
