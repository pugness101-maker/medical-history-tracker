import { useState, type FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Medication } from '../../types';
import { Button } from '../ui/Button';
import { Checkbox, Input, Textarea } from '../ui/FormFields';

export const emptyMedication = (): Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  dose: '',
  frequency: '',
  startDate: '',
  endDate: '',
  prescribingDoctor: '',
  reason: '',
  sideEffects: '',
  active: true,
  notes: '',
});

interface MedicationFormProps {
  initial?: Medication;
  onSubmit: (medication: Medication) => void;
  onCancel: () => void;
}

export function MedicationForm({ initial, onSubmit, onCancel }: MedicationFormProps) {
  const [form, setForm] = useState(initial ?? { ...emptyMedication(), id: '', createdAt: '', updatedAt: '' });

  const update = <K extends keyof Medication>(key: K, value: Medication[K]) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Medication Name" required value={form.name} onChange={(e) => update('name', e.target.value)} />
        <Input label="Dose" value={form.dose} onChange={(e) => update('dose', e.target.value)} />
        <Input label="Frequency" value={form.frequency} onChange={(e) => update('frequency', e.target.value)} />
        <Input label="Prescribing Doctor" value={form.prescribingDoctor} onChange={(e) => update('prescribingDoctor', e.target.value)} />
        <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
        <Input label="End Date" type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
      </div>
      <Input label="Reason" value={form.reason} onChange={(e) => update('reason', e.target.value)} />
      <Textarea label="Side Effects" value={form.sideEffects} onChange={(e) => update('sideEffects', e.target.value)} />
      <Checkbox label="Active medication" checked={form.active} onChange={(v) => update('active', v)} />
      <Textarea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Medication'}</Button>
      </div>
    </form>
  );
}
