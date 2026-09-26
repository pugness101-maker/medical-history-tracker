import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AppData } from '../types';
import { buildProviderSuggestions, fillProviderDetails } from './providerSuggestions';

function providerData(): AppData {
  return {
    appointments: [
      { doctorName: ' Angela   Nordin ', specialty: '', clinic: '', date: '2026-01-01' },
      { doctorName: 'Aarushi Walia, PA-C', specialty: 'Dermatology', clinic: 'Skin Clinic', date: '2026-02-01' },
    ],
    records: [
      { provider: 'Angela Nordin, LPC' },
      { provider: 'Vimal George, MD' },
    ],
    adultHealthProfile: {
      careProviders: [
        { providerName: 'angela nordin', specialty: 'Mental Health / Counseling', location: 'TimelyCare' },
      ],
    },
  } as AppData;
}

describe('provider suggestions', () => {
  it('collects every source, deduplicates case and whitespace, and preserves credentials', () => {
    const suggestions = buildProviderSuggestions(providerData());

    assert.deepEqual(suggestions.map((provider) => provider.name), [
      'Aarushi Walia, PA-C',
      'Angela Nordin, LPC',
      'Vimal George, MD',
    ]);
    assert.equal(suggestions.find((provider) => provider.name.includes('Angela'))?.specialty, 'Mental Health / Counseling');
    assert.equal(suggestions.find((provider) => provider.name.includes('Angela'))?.clinic, 'TimelyCare');
  });

  it('fills known metadata without overwriting values already entered in the form', () => {
    const provider = { name: 'Angela Nordin, LPC', specialty: 'Mental Health', clinic: 'TimelyCare' };

    assert.deepEqual(
      fillProviderDetails({ doctorName: '', specialty: '', clinic: '' }, provider),
      { doctorName: provider.name, specialty: provider.specialty, clinic: provider.clinic },
    );
    assert.deepEqual(
      fillProviderDetails({ doctorName: '', specialty: 'Custom specialty', clinic: 'My clinic' }, provider),
      { doctorName: provider.name, specialty: 'Custom specialty', clinic: 'My clinic' },
    );
  });
});
