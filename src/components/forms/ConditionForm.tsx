import { useState, type FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Condition, ConditionStatus, Medication, Appointment } from '../../types';
import { CONDITION_STATUS_LABELS } from '../../types';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/FormFields';

export const emptyCondition = (): Omit<Condition, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  dateDiagnosed: '',
  doctor: '',
  status: 'active',
  notes: '',
  relatedMedicationIds: [],
  relatedAppointmentIds: [],
});

interface ConditionFormProps {
  initial?: Condition;
  medications: Medication[];
  appointments: Appointment[];
  onSubmit: (condition: Condition) => void;
  onCancel: () => void;
}

export function ConditionForm({ initial, medications, appointments, onSubmit, onCancel }: ConditionFormProps) {
  const [form, setForm] = useState(initial ?? { ...emptyCondition(), id: '', createdAt: '', updatedAt: '' });

  const update = <K extends keyof Condition>(key: K, value: Condition[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleMed = (id: string) => {
    const ids = form.relatedMedicationIds.includes(id)
      ? form.relatedMedicationIds.filter((x) => x !== id)
      : [...form.relatedMedicationIds, id];
    update('relatedMedicationIds', ids);
  };

  const toggleAppt = (id: string) => {
    const ids = form.relatedAppointmentIds.includes(id)
      ? form.relatedAppointmentIds.filter((x) => x !== id)
      : [...form.relatedAppointmentIds, id];
    update('relatedAppointmentIds', ids);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Condition Name" required value={form.name} onChange={(e) => update('name', e.target.value)} />
        <Input label="Date Diagnosed" type="date" value={form.dateDiagnosed} onChange={(e) => update('dateDiagnosed', e.target.value)} />
        <Input label="Doctor" value={form.doctor} onChange={(e) => update('doctor', e.target.value)} />
        <Select label="Status" value={form.status} onChange={(e) => update('status', e.target.value as ConditionStatus)}>
          {Object.entries(CONDITION_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>
      <Textarea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      {medications.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Related Medications</p>
          <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-3">
            {medications.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.relatedMedicationIds.includes(m.id)} onChange={() => toggleMed(m.id)} className="rounded text-medical-600" />
                {m.name} ({m.dose})
              </label>
            ))}
          </div>
        </div>
      )}
      {appointments.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Related Appointments</p>
          <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-3">
            {appointments.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.relatedAppointmentIds.includes(a.id)} onChange={() => toggleAppt(a.id)} className="rounded text-medical-600" />
                {a.doctorName} — {a.date}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Condition'}</Button>
      </div>
    </form>
  );
}
