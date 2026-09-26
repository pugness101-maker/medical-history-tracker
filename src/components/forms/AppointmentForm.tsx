import { useState, type FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Appointment, AppointmentStatus } from '../../types';
import { APPOINTMENT_STATUS_LABELS } from '../../types';
import { Button } from '../ui/Button';
import { Checkbox, Input, Select, Textarea } from '../ui/FormFields';
import { SpecialtySelect } from '../ui/SpecialtySelect';
import type { HealthCategory } from '../../types';
import { ProviderCombobox } from '../ui/ProviderCombobox';
import { fillProviderDetails, type ProviderSuggestion } from '../../utils/providerSuggestions';

export const emptyAppointment = (): Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> => ({
  doctorName: '',
  specialty: '',
  clinic: '',
  date: '',
  time: '',
  reason: '',
  diagnosis: '',
  treatmentPlan: '',
  followUpNeeded: false,
  nextAppointmentDate: '',
  repeatAppointmentFrequency: '',
  cost: '',
  notes: '',
  status: 'upcoming',
  providerId: '',
  healthCategory: '',
  relatedConditionIds: [],
  relatedMedicationIds: [],
  relatedRecordIds: [],
});

interface AppointmentFormProps {
  initial?: Appointment;
  onSubmit: (appointment: Appointment) => void;
  onCancel: () => void;
  providerSuggestions: ProviderSuggestion[];
}

export function AppointmentForm({ initial, onSubmit, onCancel, providerSuggestions }: AppointmentFormProps) {
  const [form, setForm] = useState(initial ?? { ...emptyAppointment(), id: '', createdAt: '', updatedAt: '' });

  const update = <K extends keyof Appointment>(key: K, value: Appointment[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    onSubmit({
      ...form,
      id: initial?.id ?? uuidv4(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  };

  const selectProvider = (provider: ProviderSuggestion) => {
    setForm((current) => fillProviderDetails(current, provider));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProviderCombobox
          required
          value={form.doctorName}
          suggestions={providerSuggestions}
          onChange={(value) => update('doctorName', value)}
          onSelect={selectProvider}
        />
        <SpecialtySelect
          label="Specialty"
          value={form.specialty}
          onChange={(v) => update('specialty', v)}
          onHealthCategoryChange={(cat) => {
            if (cat) update('healthCategory', cat as HealthCategory);
          }}
        />
        <Input label="Clinic / Location" value={form.clinic} onChange={(e) => update('clinic', e.target.value)} />
        <Select label="Status" value={form.status} onChange={(e) => update('status', e.target.value as AppointmentStatus)}>
          {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Input label="Date" type="date" required value={form.date} onChange={(e) => update('date', e.target.value)} />
        <Input label="Time" type="time" value={form.time} onChange={(e) => update('time', e.target.value)} />
        <Input label="Cost / Copay" value={form.cost} onChange={(e) => update('cost', e.target.value)} />
        <Input label="Next Appointment" type="date" value={form.nextAppointmentDate} onChange={(e) => update('nextAppointmentDate', e.target.value)} />
        <Select label="Repeat appointment frequency" value={form.repeatAppointmentFrequency} onChange={(e) => update('repeatAppointmentFrequency', e.target.value)}>
          <option value="">Does not repeat</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Every 3 months</option>
          <option value="six_months">Every 6 months</option>
          <option value="yearly">Yearly</option>
        </Select>
      </div>
      <Input label="Reason for Visit" value={form.reason} onChange={(e) => update('reason', e.target.value)} />
      <Checkbox label="Follow-up needed" checked={form.followUpNeeded} onChange={(v) => update('followUpNeeded', v)} />
      <Textarea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Appointment'}</Button>
      </div>
    </form>
  );
}
