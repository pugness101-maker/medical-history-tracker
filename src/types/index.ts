export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'missed';

export type ConditionStatus = 'active' | 'resolved' | 'chronic';

export type RecordType =
  | 'lab'
  | 'imaging'
  | 'visit_note'
  | 'prescription'
  | 'bill'
  | 'referral'
  | 'vaccine'
  | 'other';

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  clinic: string;
  date: string;
  time: string;
  reason: string;
  symptoms: string;
  questionsToAsk: string;
  diagnosis: string;
  treatmentPlan: string;
  followUpNeeded: boolean;
  nextAppointmentDate: string;
  cost: string;
  notes: string;
  status: AppointmentStatus;
  attachedRecordIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Condition {
  id: string;
  name: string;
  dateDiagnosed: string;
  doctor: string;
  status: ConditionStatus;
  notes: string;
  relatedMedicationIds: string[];
  relatedAppointmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate: string;
  prescribingDoctor: string;
  reason: string;
  sideEffects: string;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  recordType: RecordType;
  date: string;
  uploadDate: string;
  provider: string;
  summary: string;
  notes: string;
  fileName: string;
  extractedText: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type { AdultHealthProfile, CareProviderEntry, InsurancePlan, ProfileTabId } from './profile';
export { emptyAdultHealthProfile, PRIVACY_WARNING } from './profile';

export interface AppSettings {
  theme: 'light' | 'dark';
}

export interface AppData {
  appointments: Appointment[];
  conditions: Condition[];
  medications: Medication[];
  records: MedicalRecord[];
  healthNotes: HealthNote[];
  adultHealthProfile: import('./profile').AdultHealthProfile;
  settings: AppSettings;
}

export const STORAGE_KEY = 'medical-history-tracker-v1';

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  lab: 'Lab Result',
  imaging: 'Imaging',
  visit_note: 'Visit Note',
  prescription: 'Prescription',
  bill: 'Bill',
  referral: 'Referral',
  vaccine: 'Vaccine',
  other: 'Other',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
  missed: 'Missed',
};

export const CONDITION_STATUS_LABELS: Record<ConditionStatus, string> = {
  active: 'Active',
  resolved: 'Resolved',
  chronic: 'Chronic',
};
