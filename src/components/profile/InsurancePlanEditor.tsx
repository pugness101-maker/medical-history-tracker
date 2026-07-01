import type { InsurancePlan } from '../../types/profile';
import { Input, Textarea } from '../ui/FormFields';
import { PortalNotesWarning } from './PrivacyWarning';

interface InsurancePlanEditorProps {
  plan: InsurancePlan;
  onChange: (plan: InsurancePlan) => void;
}

export function InsurancePlanEditor({ plan, onChange }: InsurancePlanEditorProps) {
  const set = <K extends keyof InsurancePlan>(key: K, value: InsurancePlan[K]) => {
    onChange({ ...plan, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Carrier" value={plan.carrier} onChange={(e) => set('carrier', e.target.value)} />
        <Input label="Plan name" value={plan.planName} onChange={(e) => set('planName', e.target.value)} />
        <Input
          label="Member ID hint (last 4 digits only)"
          placeholder="e.g. …1234 — do not store full ID"
          value={plan.memberIdHint}
          onChange={(e) => set('memberIdHint', e.target.value)}
        />
        <Input label="Group number" value={plan.groupNumber} onChange={(e) => set('groupNumber', e.target.value)} />
        <Input label="Phone" type="tel" value={plan.phone} onChange={(e) => set('phone', e.target.value)} />
        <Input label="Portal URL" type="url" placeholder="https://..." value={plan.portalUrl} onChange={(e) => set('portalUrl', e.target.value)} />
      </div>
      <PortalNotesWarning />
      <Textarea
        label="Portal / login notes (no passwords)"
        value={plan.portalNotes}
        onChange={(e) => set('portalNotes', e.target.value)}
        rows={2}
        placeholder="e.g. Username is my email; use password manager"
      />
      <Textarea label="Notes" value={plan.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
    </div>
  );
}
