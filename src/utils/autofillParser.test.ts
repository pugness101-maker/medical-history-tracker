import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { mergeClinicalAutofill, parseAutofillFromText, type AutofillResult } from './autofillParser';

const behavioralHealthText = readFileSync(
  new URL('../test-fixtures/behavioral-health-visit.txt', import.meta.url),
  'utf8',
);

describe('Records behavioral-health upload regression', () => {
  it('separates patient and credentialed provider and retains the reason', () => {
    const parsed = parseAutofillFromText(behavioralHealthText);

    assert.equal(parsed.providerName, 'Angela Nordin, LPC');
    assert.ok(!parsed.providerName.includes('Adriana Hyatt'));
    assert.equal(parsed.specialty, 'Mental Health / Counseling');
    assert.notEqual(parsed.specialty, 'ENT');
    assert.equal(parsed.reasonForVisit, 'Trauma Stress Mood Issues');
  });

  it('does not use DOB or an unrelated time and creates concise notes', () => {
    const parsed = parseAutofillFromText(behavioralHealthText);

    assert.equal(parsed.visitDate, '');
    assert.notEqual(parsed.visitDate, '2007-02-04');
    assert.equal(parsed.visitTime, '');
    assert.ok(parsed.extraNotes.includes('Care Plan:'));
    assert.ok(!parsed.extraNotes.includes('Adriana Hyatt'));
    assert.ok(parsed.extraNotes.length < behavioralHealthText.length);
  });

  it('does not classify words containing ent as ENT', () => {
    const parsed = parseAutofillFromText(
      'Patient assessment and treatment document. The patient reports improvement.',
    );
    assert.notEqual(parsed.specialty, 'ENT');
  });

  it('only accepts explicitly encounter-associated dates and times', () => {
    const parsed = parseAutofillFromText(
      'DOB: 02/04/2007\nSigned: 09/20/2026 08:00\nSession Date: September 18, 2026\nSession Time: 1:00 PM',
    );
    assert.equal(parsed.visitDate, '2026-09-18');
    assert.equal(parsed.visitTime, '13:00');
  });

  it('cannot overwrite immutable upload identity during auto-fill', () => {
    const current: AutofillResult & { originalFilename: string; rawExtractedText: string } = {
      ...parseAutofillFromText(''),
      originalFilename: 'care-record 15th June _.pdf',
      rawExtractedText: behavioralHealthText,
    };
    const maliciousParserResult = {
      ...parseAutofillFromText(behavioralHealthText),
      originalFilename: 'CARE PLAN and clinical document text',
      rawExtractedText: 'overwritten',
    };

    const merged = mergeClinicalAutofill(current, maliciousParserResult);
    assert.equal(merged.originalFilename, 'care-record 15th June _.pdf');
    assert.equal(merged.rawExtractedText, behavioralHealthText);
  });
});
