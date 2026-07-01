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
  documents: string;
  extraNotes: string;
  followUpNeeded: boolean;
  clinic: string;
}

const CREDENTIAL_SUFFIX =
  'LPC|LCSW|LMFT|MD|DO|NP|PA|RN|PhD|PsyD|APRN|DNP|PMHNP|FNP|CNP';

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

function parseVisitTimeRange(text: string): string {
  const started = text.match(/\bStarted\s*:?\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  const ended = text.match(/\bEnded\s*:?\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  if (started && ended) return `${started[1].trim()} – ${ended[1].trim()}`;
  if (started) return started[1].trim();
  if (ended) return ended[1].trim();
  return '';
}

function parseProvider(text: string): string {
  const lineAfterLabel = text.match(
    /(?:^|\n)\s*Provider(?:\s+Name)?\s*:?\s*\n\s*(.+)$/im,
  );
  if (lineAfterLabel?.[1]?.trim()) return lineAfterLabel[1].trim().slice(0, 120);

  const providerInline = text.match(
    new RegExp(
      `\\bProvider\\s*:?\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z'\\-]+)+,\\s*(?:${CREDENTIAL_SUFFIX}))`,
      'i',
    ),
  );
  if (providerInline?.[1]) return providerInline[1].trim();

  const sameLine = captureLineValue(text, [
    'Rendering Provider',
    'Attending Provider',
    'Physician',
    'Doctor',
    'Attending',
    'Therapist',
    'Clinician',
  ]);
  if (sameLine) return sameLine;

  const credMatch = text.match(
    new RegExp(
      `\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z'\\-]+)+,\\s*(?:${CREDENTIAL_SUFFIX}))\\b`,
    ),
  );
  if (credMatch?.[1]) return credMatch[1].trim();

  const drMatch = text.match(/\bDr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z'\\-]+)+)(?:,\s*(?:MD|DO))?/);
  if (drMatch) return `Dr. ${drMatch[1]}`;

  return captureInlineValue(text, 'Provider', [
    'Date', 'Visit Date', 'Started', 'Ended', 'Reason', 'Prescriptions',
    'Care Plan', 'Discharge', 'Documents', 'Diagnosis',
  ]);
}

function parseSpecialty(text: string): string {
  const fromUtil = normalizeSpecialtyFromText(text);
  if (fromUtil) return fromUtil;

  const direct = captureLineValue(text, ['Specialty', 'Department', 'Service']);
  if (direct) return canonicalSpecialty(direct);

  return '';
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

export function parseAutofillFromText(text: string, fileName = ''): AutofillResult {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  const followUpNotes = captureSection(text, [
    'Follow[- ]?up\\s*(?:notes|instructions|plan)?',
    'Next (?:visit|appointment)',
    'Return (?:visit|in)',
  ]);

  const reasonForVisit =
    captureSection(text, [
      'Reason for (?:visit|appointment)',
      'Chief Complaint',
      'Visit Reason',
      'Presenting (?:Problem|Concern)',
    ]) ||
    captureLineValue(text, ['Reason for Visit', 'Chief Complaint', 'Reason', 'Visit Reason']) ||
    captureInlineValue(text, 'Reason for Visit', [
      'Prescriptions', 'Care Plan', 'Discharge', 'Documents', 'Started', 'Ended', 'Diagnosis',
    ]) ||
    captureInlineValue(text, 'Chief Complaint', [
      'Prescriptions', 'Care Plan', 'Discharge', 'Documents', 'Started', 'Ended', 'Diagnosis',
    ]);

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

  const documentsSection = captureSection(text, ['Documents?', 'Attachments?', 'Files?']);

  const visitDate =
    captureLineValue(text, [
      'Date of (?:visit|service)',
      'Visit Date',
      'Appointment Date',
      'Service Date',
    ]) ||
    parseDate(normalized.match(/\b(0?[1-9]|1[0-2])[/\\-](0?[1-9]|[12]\d|3[01])[/\\-](20\d{2})\b/)?.[0] || '') ||
    parseDate(captureLineValue(text, ['Date'])) ||
    parseDate(normalized.slice(0, 800));

  const visitTime =
    parseVisitTimeRange(normalized) ||
    captureLineValue(text, ['Time', 'Visit Time', 'Appointment Time']) ||
    parseTime(normalized.slice(0, 500));

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
    documents: documentsSection || fileName,
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
  if (review.documents) {
    parts.push(`Documents: ${review.documents}`);
  }
  if (review.extraNotes) {
    parts.push(`Additional Notes:\n${review.extraNotes}`);
  }

  parts.push('--- Extracted from uploaded note ---');
  parts.push(extractedText.slice(0, 3000));

  return parts.filter(Boolean).join('\n\n');
}
