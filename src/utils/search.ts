import type { AppData } from '../types';
import {
  APPOINTMENT_STATUS_LABELS,
  CONDITION_STATUS_LABELS,
  RECORD_TYPE_LABELS,
} from '../types';
import { CARE_CATEGORY_LABELS } from '../types/profile';

export type SearchResultType =
  | 'provider'
  | 'appointment'
  | 'medication'
  | 'condition'
  | 'lab'
  | 'vaccine'
  | 'insurance'
  | 'record'
  | 'note';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  path: string;
}

function matches(query: string, ...fields: string[]): boolean {
  const q = query.toLowerCase().trim();
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export function globalSearch(data: AppData, query: string): SearchResult[] {
  if (!query.trim()) return [];
  const results: SearchResult[] = [];

  for (const entry of data.adultHealthProfile.careProviders) {
    if (
      matches(
        query,
        entry.providerName,
        entry.specialty,
        entry.location,
        entry.phone,
        entry.notes,
        CARE_CATEGORY_LABELS[entry.category],
      )
    ) {
      results.push({
        id: entry.id,
        type: 'provider',
        title: entry.providerName || CARE_CATEGORY_LABELS[entry.category],
        subtitle: entry.specialty,
        path: '/health?section=providers',
      });
    }
  }

  for (const a of data.appointments) {
    if (
      matches(
        query,
        a.doctorName,
        a.specialty,
        a.clinic,
        a.reason,
        a.diagnosis,
        a.notes,
        APPOINTMENT_STATUS_LABELS[a.status],
      )
    ) {
      results.push({
        id: a.id,
        type: 'appointment',
        title: `${a.doctorName} — ${a.reason || 'Appointment'}`,
        subtitle: `${a.specialty} · ${a.date}`,
        path: `/appointments?id=${a.id}`,
      });
    }
  }

  for (const m of data.medications) {
    if (matches(query, m.name, m.dose, m.frequency, m.prescribingDoctor, m.reason, m.notes)) {
      results.push({
        id: m.id,
        type: 'medication',
        title: m.name,
        subtitle: `${m.dose} · ${m.frequency}`,
        path: '/health?section=medications',
      });
    }
  }

  for (const c of data.conditions) {
    if (matches(query, c.name, c.doctor, c.notes, CONDITION_STATUS_LABELS[c.status])) {
      results.push({
        id: c.id,
        type: 'condition',
        title: c.name,
        subtitle: CONDITION_STATUS_LABELS[c.status],
        path: '/health?section=conditions',
      });
    }
  }

  for (const r of data.records) {
    const isLab = r.recordType === 'lab';
    const isVaccine = r.recordType === 'vaccine';
    if (
      matches(
        query,
        r.provider,
        r.summary,
        r.notes,
        r.fileName,
        r.extractedText,
        RECORD_TYPE_LABELS[r.recordType],
      )
    ) {
      results.push({
        id: r.id,
        type: isLab ? 'lab' : isVaccine ? 'vaccine' : 'record',
        title: r.summary || r.fileName || RECORD_TYPE_LABELS[r.recordType],
        subtitle: `${RECORD_TYPE_LABELS[r.recordType]} · ${r.date}`,
        path: `/records?id=${r.id}`,
      });
    }
  }

  const insurances = [
    { key: 'medical', plan: data.adultHealthProfile.insuranceMedical },
    { key: 'dental', plan: data.adultHealthProfile.insuranceDental },
    { key: 'vision', plan: data.adultHealthProfile.insuranceVision },
  ];
  for (const { key, plan } of insurances) {
    if (matches(query, plan.carrier, plan.planName, plan.notes, plan.memberIdHint, key)) {
      results.push({
        id: key,
        type: 'insurance',
        title: `${plan.carrier || key} insurance`,
        subtitle: plan.planName,
        path: '/health?section=insurance',
      });
    }
  }

  if (matches(query, data.adultHealthProfile.name, data.adultHealthProfile.profileNotes)) {
    results.push({
      id: 'profile',
      type: 'note',
      title: data.adultHealthProfile.name || 'Health profile',
      subtitle: 'Profile notes',
      path: '/health?section=providers',
    });
  }

  for (const n of data.healthNotes) {
    if (matches(query, n.title, n.content)) {
      results.push({
        id: n.id,
        type: 'note',
        title: n.title,
        subtitle: 'Health note',
        path: '/settings',
      });
    }
  }

  return results.slice(0, 20);
}

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  provider: 'Provider',
  appointment: 'Appointment',
  medication: 'Medication',
  condition: 'Condition',
  lab: 'Lab',
  vaccine: 'Vaccine',
  insurance: 'Insurance',
  record: 'Document',
  note: 'Note',
};
