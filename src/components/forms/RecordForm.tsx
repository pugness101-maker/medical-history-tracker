import { useState, type FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { MedicalRecord, RecordType } from '../../types';
import { RECORD_TYPE_LABELS } from '../../types';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/FormFields';

export const emptyRecord = (): Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
  recordType: 'other',
  date: '',
  uploadDate: '',
  provider: '',
  summary: '',
  notes: '',
  fileName: '',
  extractedText: '',
});

interface RecordFormProps {
  initial?: MedicalRecord;
  onSubmit: (record: MedicalRecord) => void;
  onCancel: () => void;
}

export function RecordForm({ initial, onSubmit, onCancel }: RecordFormProps) {
  const [form, setForm] = useState(initial ?? { ...emptyRecord(), id: '', createdAt: '', updatedAt: '' });

  const update = <K extends keyof MedicalRecord>(key: K, value: MedicalRecord[K]) => {
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
        <Select label="Record Type" value={form.recordType} onChange={(e) => update('recordType', e.target.value as RecordType)}>
          {Object.entries(RECORD_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Input label="Date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
        <Input label="Provider" value={form.provider} onChange={(e) => update('provider', e.target.value)} className="sm:col-span-2" />
      </div>
      <Textarea label="Summary" required value={form.summary} onChange={(e) => update('summary', e.target.value)} />
      <Input label="Link / File Name" placeholder="e.g. lab_results.pdf" value={form.fileName} onChange={(e) => update('fileName', e.target.value)} />
      <Textarea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Record'}</Button>
      </div>
    </form>
  );
}
