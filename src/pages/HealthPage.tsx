import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAppData } from '../context/MedicalDataContext';
import { CareEntryEditor } from '../components/profile/CareEntryEditor';
import { InsurancePlanEditor } from '../components/profile/InsurancePlanEditor';
import { PrivacyWarning } from '../components/profile/PrivacyWarning';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/EmptyState';
import { ConditionForm } from '../components/forms/ConditionForm';
import { MedicationForm } from '../components/forms/MedicationForm';
import type { Condition, Medication } from '../types';
import { CONDITION_STATUS_LABELS } from '../types';
import { CARE_CATEGORY_LABELS } from '../types/profile';
import { getCareEntry, updateCareEntry } from '../utils/profileDefaults';
import {
  getPreventiveItems,
  PREVENTIVE_STATUS_LABELS,
  preventiveBadgeClass,
} from '../utils/preventiveCare';
import { computeNextDue } from '../utils/dueDates';
import { formatDate } from '../utils/format';
import { Input } from '../components/ui/FormFields';

export function HealthPage() {
  const { data, setData } = useAppData();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const sectionParam = searchParams.get('section');

  const [medModal, setMedModal] = useState(false);
  const [condModal, setCondModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | undefined>();
  const [editingCond, setEditingCond] = useState<Condition | undefined>();
  const [deleteMedId, setDeleteMedId] = useState<string | null>(null);
  const [deleteCondId, setDeleteCondId] = useState<string | null>(null);

  const profile = data.adultHealthProfile;

  useEffect(() => {
    const state = location.state as { section?: string; openAdd?: boolean } | null;
    if (state?.openAdd && state.section === 'medications') {
      setEditingMed(undefined);
      setMedModal(true);
    }
    if (state?.openAdd && state.section === 'conditions') {
      setEditingCond(undefined);
      setCondModal(true);
    }
    if (state?.section || sectionParam) {
      const id = state?.section || sectionParam;
      document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.state, sectionParam]);

  const updateProfile = (updates: Partial<typeof profile>) => {
    setData((d) => ({
      ...d,
      adultHealthProfile: { ...d.adultHealthProfile, ...updates, updatedAt: new Date().toISOString() },
    }));
  };

  const preventive = getPreventiveItems(profile.careProviders, CARE_CATEGORY_LABELS);
  const vaccines = data.records.filter((r) => r.recordType === 'vaccine');
  const labs = data.records.filter((r) => r.recordType === 'lab');

  const saveMed = (m: Medication) => {
    setData((d) => {
      const exists = d.medications.some((x) => x.id === m.id);
      return {
        ...d,
        medications: exists ? d.medications.map((x) => (x.id === m.id ? m : x)) : [...d.medications, m],
      };
    });
    setMedModal(false);
    setEditingMed(undefined);
  };

  const saveCond = (c: Condition) => {
    setData((d) => {
      const exists = d.conditions.some((x) => x.id === c.id);
      return {
        ...d,
        conditions: exists ? d.conditions.map((x) => (x.id === c.id ? c : x)) : [...d.conditions, c],
      };
    });
    setCondModal(false);
    setEditingCond(undefined);
  };

  const isOpen = (s: string) => sectionParam === s;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Health"
        subtitle="Providers, medications, conditions & preventive care"
      />

      <PrivacyWarning />

      <CollapsibleSection
        sectionId="section-providers"
        title="Providers"
        subtitle={`${profile.careProviders.filter((c) => c.providerName).length} on file`}
        defaultOpen={isOpen('providers') || !sectionParam}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input label="Your name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
            <Input label="Date of birth" type="date" value={profile.dateOfBirth} onChange={(e) => updateProfile({ dateOfBirth: e.target.value })} />
            <Input label="Pharmacy" value={profile.pharmacy.name} onChange={(e) => updateProfile({ pharmacy: { ...profile.pharmacy, name: e.target.value } })} />
            <Input label="Emergency contact" value={profile.emergencyContact.name} onChange={(e) => updateProfile({ emergencyContact: { ...profile.emergencyContact, name: e.target.value } })} />
            <Input label="Emergency phone" type="tel" value={profile.emergencyContact.phone} onChange={(e) => updateProfile({ emergencyContact: { ...profile.emergencyContact, phone: e.target.value } })} />
          </div>
          {profile.careProviders.map((entry) => (
            <div key={entry.id} className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
              <CareEntryEditor
                entry={entry}
                showEnableToggle={entry.category === 'dermatology'}
                onChange={(e) => updateProfile(updateCareEntry(profile, e))}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="section-medications"
        title="Medications"
        subtitle={`${data.medications.filter((m) => m.active).length} active`}
        defaultOpen={isOpen('medications')}
        badge={<Button size="sm" onClick={() => { setEditingMed(undefined); setMedModal(true); }}>+ Add</Button>}
      >
        <div className="pt-4 space-y-3">
          {data.medications.length === 0 ? (
            <p className="text-sm opacity-50">No medications yet</p>
          ) : (
            data.medications.map((m) => (
              <div key={m.id} className="flex justify-between items-start gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="font-semibold text-[15px]">{m.name}</p>
                  <p className="text-sm opacity-50">{m.dose} · {m.frequency}</p>
                  {m.reason && <p className="text-sm opacity-50 mt-1">{m.reason}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.active ? 'badge-complete' : 'badge-optional'}`}>{m.active ? 'Active' : 'Inactive'}</span>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingMed(m); setMedModal(true); }}>Edit</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="section-conditions"
        title="Medical Conditions"
        subtitle={`${data.conditions.length} recorded`}
        defaultOpen={isOpen('conditions')}
        badge={<Button size="sm" onClick={() => { setEditingCond(undefined); setCondModal(true); }}>+ Add</Button>}
      >
        <div className="pt-4 space-y-3">
          {data.conditions.length === 0 ? (
            <p className="text-sm opacity-50">No conditions recorded</p>
          ) : (
            data.conditions.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[15px]">{c.name}</p>
                    <p className="text-sm opacity-50">{CONDITION_STATUS_LABELS[c.status]} · {c.doctor}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingCond(c); setCondModal(true); }}>Edit</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="section-preventive"
        title="Preventive Care"
        subtitle="Auto-calculated due dates"
        defaultOpen={isOpen('preventive')}
      >
        <div className="pt-4 space-y-2">
          {preventive.map((p) => (
            <div key={p.entry.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="font-medium text-[15px]">{p.label}</p>
                <p className="text-sm opacity-50">
                  Last: {p.entry.lastVisit ? formatDate(p.entry.lastVisit) : '—'}
                  {p.nextDue && ` · Next: ${formatDate(p.nextDue)}`}
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${preventiveBadgeClass(p.status)}`}>
                {PREVENTIVE_STATUS_LABELS[p.status]}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection sectionId="section-vaccines" title="Vaccines" subtitle={`${vaccines.length} records`} defaultOpen={isOpen('vaccines')}>
        <div className="pt-4 space-y-2">
          {vaccines.length === 0 ? (
            <p className="text-sm opacity-50">Add vaccine records in Records, or track in Vaccines & Labs provider</p>
          ) : (
            vaccines.map((r) => (
              <div key={r.id} className="p-3 rounded-xl border text-[15px]" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-medium">{r.summary}</p>
                <p className="text-sm opacity-50">{formatDate(r.date)} · {r.provider}</p>
              </div>
            ))
          )}
          {getCareEntry(profile, 'vaccines_labs').providerName && (
            <p className="text-sm opacity-50 pt-2">
              Next review: {formatDate(computeNextDue(getCareEntry(profile, 'vaccines_labs')) || '') || 'Set last visit in Providers'}
            </p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection sectionId="section-labs" title="Labs" subtitle={`${labs.length} records`} defaultOpen={isOpen('labs')}>
        <div className="pt-4 space-y-2">
          {labs.length === 0 ? (
            <p className="text-sm opacity-50">Upload or add lab records in Records</p>
          ) : (
            labs.map((r) => (
              <div key={r.id} className="p-3 rounded-xl border text-[15px]" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-medium">{r.summary}</p>
                <p className="text-sm opacity-50">{formatDate(r.date)} · {r.provider}</p>
                {r.fileName && <p className="text-xs text-[var(--color-accent)] mt-1">{r.fileName}</p>}
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection sectionId="section-insurance" title="Insurance" subtitle="Medical, dental & vision" defaultOpen={isOpen('insurance')}>
        <div className="pt-4 space-y-6">
          {(['insuranceMedical', 'insuranceDental', 'insuranceVision'] as const).map((key, i) => (
            <div key={key}>
              <h4 className="font-semibold mb-3">{['Medical', 'Dental', 'Vision'][i]}</h4>
              <InsurancePlanEditor plan={profile[key]} onChange={(plan) => updateProfile({ [key]: plan })} />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <Modal open={medModal} onClose={() => setMedModal(false)} title={editingMed ? 'Edit Medication' : 'Add Medication'} wide>
        <MedicationForm initial={editingMed} onSubmit={saveMed} onCancel={() => setMedModal(false)} />
      </Modal>
      <Modal open={condModal} onClose={() => setCondModal(false)} title={editingCond ? 'Edit Condition' : 'Add Condition'} wide>
        <ConditionForm initial={editingCond} medications={data.medications} appointments={data.appointments} onSubmit={saveCond} onCancel={() => setCondModal(false)} />
      </Modal>
      <ConfirmDialog open={!!deleteMedId} title="Delete medication?" message="Cannot be undone." confirmLabel="Delete" danger onConfirm={() => { if (deleteMedId) setData((d) => ({ ...d, medications: d.medications.filter((m) => m.id !== deleteMedId) })); setDeleteMedId(null); }} onCancel={() => setDeleteMedId(null)} />
      <ConfirmDialog open={!!deleteCondId} title="Delete condition?" message="Cannot be undone." confirmLabel="Delete" danger onConfirm={() => { if (deleteCondId) setData((d) => ({ ...d, conditions: d.conditions.filter((c) => c.id !== deleteCondId) })); setDeleteCondId(null); }} onCancel={() => setDeleteCondId(null)} />
    </div>
  );
}
