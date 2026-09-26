import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyAppData } from '../storage/storage';
import type { MedicalRecord } from '../types';
import { syncEncounterRelationships, unlinkAppointment } from './encounterRelationships';

describe('shared encounter relationships', () => {
  it('links Health and a later visit record to exactly one historical appointment', () => {
    const base = emptyAppData();
    const mentalHealth = base.adultHealthProfile.careProviders.find((provider) => provider.category === 'mental_health');
    assert.ok(mentalHealth);
    const healthData = {
      ...base,
      adultHealthProfile: {
        ...base.adultHealthProfile,
        careProviders: base.adultHealthProfile.careProviders.map((provider) => provider.id === mentalHealth.id ? {
          ...provider,
          providerName: 'Angela Nordin, LPC',
          specialty: 'Mental Health / Counseling',
          lastVisit: '2026-07-17',
          lastVisitReason: 'Trauma Stress Mood Issues',
        } : provider),
      },
    };

    const afterHealth = syncEncounterRelationships(healthData);
    assert.equal(afterHealth.appointments.length, 1);
    const encounter = afterHealth.appointments[0];
    assert.equal(encounter.doctorName, 'Angela Nordin, LPC');
    assert.equal(encounter.date, '2026-07-17');
    assert.equal(encounter.status, 'completed');
    assert.equal(encounter.specialty, 'Mental Health / Counseling');
    assert.equal(encounter.reason, 'Trauma Stress Mood Issues');
    assert.equal(
      afterHealth.adultHealthProfile.careProviders.find((provider) => provider.id === mentalHealth.id)?.lastVisitAppointmentId,
      encounter.id,
    );

    const record: MedicalRecord = {
      id: 'record-1', recordType: 'visit_note', date: '2026-07-17', uploadDate: '2026-09-26',
      provider: 'Angela Nordin', summary: 'Trauma Stress Mood Issues', notes: '', fileName: 'visit.pdf',
      extractedText: '', encounterDateVerified: true, createdAt: '', updatedAt: '',
    };
    const afterRecord = syncEncounterRelationships({ ...afterHealth, records: [record] });
    assert.equal(afterRecord.appointments.length, 1);
    assert.equal(afterRecord.records[0].appointmentId, encounter.id);
    assert.deepEqual(afterRecord.appointments[0].relatedRecordIds, [record.id]);

    const afterEdit = syncEncounterRelationships({
      ...afterRecord,
      appointments: afterRecord.appointments.map((appointment) => ({
        ...appointment,
        doctorName: 'Angela Nordin, LPC',
        date: '2026-07-18',
      })),
    });
    assert.equal(afterEdit.appointments.length, 1);
    assert.equal(afterEdit.records[0].date, '2026-07-18');
    assert.equal(
      afterEdit.adultHealthProfile.careProviders.find((provider) => provider.id === mentalHealth.id)?.lastVisit,
      '2026-07-18',
    );

    const deleted = unlinkAppointment(afterEdit, encounter.id);
    assert.equal(deleted.appointments.length, 0);
    assert.equal(deleted.records[0].appointmentId, undefined);
    assert.equal(deleted.records[0].appointmentUnlinked, true);
    assert.equal(syncEncounterRelationships(deleted).appointments.length, 0);
  });

  it('does not fabricate encounters for standalone records or undated Health providers', () => {
    const base = emptyAppData();
    const provider = base.adultHealthProfile.careProviders[0];
    const data = {
      ...base,
      records: [{
        id: 'lab-1', recordType: 'lab', date: '2026-07-17', uploadDate: '', provider: 'Example Lab',
        summary: 'CBC', notes: '', fileName: '', extractedText: '', createdAt: '', updatedAt: '',
      } as MedicalRecord],
      adultHealthProfile: {
        ...base.adultHealthProfile,
        careProviders: base.adultHealthProfile.careProviders.map((entry) => entry.id === provider.id
          ? { ...entry, providerName: 'Undated Provider' }
          : entry),
      },
    };
    assert.equal(syncEncounterRelationships(data).appointments.length, 0);
  });
});
