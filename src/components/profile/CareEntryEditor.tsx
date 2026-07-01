import type { CareProviderEntry, ProfileCareCategory } from '../../types/profile';
import { CARE_CATEGORY_LABELS, DUE_FREQUENCY_LABELS } from '../../types/profile';
import { computeNextDue } from '../../utils/dueDates';
import { frequencyOptionsForCategory } from '../../utils/dueDates';
import { formatDate } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Checkbox, Input, Select, Textarea } from '../ui/FormFields';
import { PortalNotesWarning } from './PrivacyWarning';

interface CareEntryEditorProps {
  entry: CareProviderEntry;
  onChange: (entry: CareProviderEntry) => void;
  showEnableToggle?: boolean;
}

export function CareEntryEditor({ entry, onChange, showEnableToggle }: CareEntryEditorProps) {
  const set = <K extends keyof CareProviderEntry>(key: K, value: CareProviderEntry[K]) => {
    onChange({ ...entry, [key]: value });
  };

  const computedDue = computeNextDue(entry);
  const freqOptions = frequencyOptionsForCategory(entry.category);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-800">
          {CARE_CATEGORY_LABELS[entry.category as ProfileCareCategory]}
        </h3>
        {computedDue && entry.enabled && (
          <Badge variant="info">Next due: {formatDate(computedDue)}</Badge>
        )}
      </div>

      {showEnableToggle && (
        <Checkbox
          label="Track this care category"
          checked={entry.enabled}
          onChange={(v) => set('enabled', v)}
        />
      )}

      {entry.enabled && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Doctor / Provider" value={entry.providerName} onChange={(e) => set('providerName', e.target.value)} />
            <Input label="Specialty" value={entry.specialty} onChange={(e) => set('specialty', e.target.value)} />
            <Input label="Location" value={entry.location} onChange={(e) => set('location', e.target.value)} className="sm:col-span-2" />
            <Input label="Phone" type="tel" value={entry.phone} onChange={(e) => set('phone', e.target.value)} />
            <Select
              label="Due frequency"
              value={entry.dueFrequency}
              onChange={(e) => set('dueFrequency', e.target.value as CareProviderEntry['dueFrequency'])}
            >
              {freqOptions.map((f) => (
                <option key={f} value={f}>{DUE_FREQUENCY_LABELS[f]}</option>
              ))}
            </Select>
            {entry.dueFrequency === 'custom' && (
              <Input
                label="Custom interval (months)"
                type="number"
                min={1}
                max={60}
                value={entry.customFrequencyMonths || ''}
                onChange={(e) => set('customFrequencyMonths', parseInt(e.target.value, 10) || 12)}
              />
            )}
            <Input label="Last visit" type="date" value={entry.lastVisit} onChange={(e) => set('lastVisit', e.target.value)} />
            <Input label="Scheduled visit" type="date" value={entry.scheduledVisit} onChange={(e) => set('scheduledVisit', e.target.value)} />
            <Input
              label="Next due (manual override)"
              type="date"
              value={entry.nextDueOverride}
              onChange={(e) => set('nextDueOverride', e.target.value)}
            />
          </div>
          {entry.dueFrequency === 'as_needed' && (
            <p className="text-xs text-slate-500">
              Set a manual next due date above, or record last visit when you go.
            </p>
          )}
          <PortalNotesWarning />
          <Textarea
            label="Portal / login notes (no passwords)"
            value={entry.portalNotes}
            onChange={(e) => set('portalNotes', e.target.value)}
            rows={2}
          />
          <Textarea label="Notes" value={entry.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
        </>
      )}
    </div>
  );
}
