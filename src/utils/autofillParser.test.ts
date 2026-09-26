import { parseAutofillFromText } from './autofillParser';

export function runAutofillParserRegressionTest(): void {
  const result = parseAutofillFromText(
    'Visit Note - July 8, 2026 Hyatt, Adriana MRN: MM0000129950 Phone: (832) 535-5831 DOB: 02/04/2007 Sex: Female\nProvider: Aarushi Walia, PA-C\nChief Complaints: Eczema (Patient Reported)\nH/O eczema',
  );

  if (result.visitDate !== '2026-07-08') {
    throw new Error(`Expected visit date 2026-07-08, received ${result.visitDate}`);
  }
  if (String(result.visitDate) === '2007-02-04') {
    throw new Error('Patient DOB must never be selected as the visit date');
  }
  if (result.providerName !== 'Aarushi Walia, PA-C') {
    throw new Error(`Expected treating provider, received ${result.providerName}`);
  }
  if (result.specialty !== 'Dermatology') {
    throw new Error(`Expected Dermatology specialty, received ${result.specialty}`);
  }
  if (result.reasonForVisit !== 'acne flare') {
    throw new Error(`Expected concise reason, received ${result.reasonForVisit}`);
  }
}
