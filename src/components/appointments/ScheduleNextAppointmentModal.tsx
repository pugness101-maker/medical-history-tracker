import { useMemo, useState } from 'react';
import type { Appointment } from '../../types';
import type { AdultHealthProfile } from '../../types/profile';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/EmptyState';
import { Input } from '../ui/FormFields';
import { formatDate } from '../../utils/format';
import {
  computeNextAppointmentDate,
  describePreventiveFrequency,
  findUpcomingForSameProvider,
  formatUpcomingSummary,
} from '../../utils/nextAppointment';

interface ScheduleNextAppointmentModalProps {
  open: boolean;
  source: Appointment | null;
  profile: AdultHealthProfile;
  allAppointments: Appointment[];
  onClose: () => void;
  onCreate: (source: Appointment, nextDate: string) => void;
}

export function ScheduleNextAppointmentModal({
  open,
  source,
  profile,
  allAppointments,
  onClose,
  onCreate,
}: ScheduleNextAppointmentModalProps) {
  const [customDate, setCustomDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ date: string } | null>(null);

  const frequencyDate = useMemo(
    () => (source ? computeNextAppointmentDate(source.date, source, profile) : null),
    [source, profile],
  );

  const frequencyLabel = useMemo(
    () => (source ? describePreventiveFrequency(source, profile, frequencyDate) : ''),
    [source, profile, frequencyDate],
  );

  const existingUpcoming = useMemo(
    () => (source ? findUpcomingForSameProvider(allAppointments, source) : []),
    [source, allAppointments],
  );

  if (!open || !source) return null;

  const resetAndClose = () => {
    setCustomDate('');
    setShowCustom(false);
    setDuplicateConfirm(null);
    onClose();
  };

  const tryCreate = (date: string) => {
    if (!date) return;
    if (existingUpcoming.length > 0) {
      setDuplicateConfirm({ date });
      return;
    }
    onCreate(source, date);
    resetAndClose();
  };

  const confirmDuplicateCreate = () => {
    if (!duplicateConfirm) return;
    onCreate(source, duplicateConfirm.date);
    resetAndClose();
  };

  const handleUseFrequency = () => {
    if (frequencyDate) {
      tryCreate(frequencyDate);
    } else {
      setShowCustom(true);
    }
  };

  const handleCustomCreate = () => {
    if (customDate) tryCreate(customDate);
  };

  return (
    <>
      <Modal open={!duplicateConfirm} onClose={resetAndClose} title="Schedule next appointment?">
        <div className="space-y-4 text-[15px]">
          <p style={{ color: 'var(--color-muted)' }}>
            {source.doctorName} · {formatDate(source.date)}
          </p>

          {existingUpcoming.length > 0 && !duplicateConfirm && (
            <div className="p-3 rounded-xl badge-due-soon text-sm">
              You already have an upcoming appointment ({formatUpcomingSummary(existingUpcoming)}).
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleUseFrequency}
              className="card w-full text-left p-4 hover:opacity-90 transition-opacity"
            >
              <p className="font-semibold">Use preventive care frequency</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
                {frequencyLabel}
                {frequencyDate && (
                  <span className="block mt-1 text-[var(--color-accent)] font-medium">
                    Suggested: {formatDate(frequencyDate)}
                  </span>
                )}
                {!frequencyDate && (
                  <span className="block mt-1">No automatic interval — pick a custom date below</span>
                )}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShowCustom((v) => !v)}
              className="card w-full text-left p-4 hover:opacity-90 transition-opacity"
            >
              <p className="font-semibold">Pick custom date</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
                Choose a specific date for the follow-up
              </p>
            </button>

            {showCustom && (
              <div className="pl-1">
                <Input
                  label="Next appointment date"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
                <Button className="mt-3" onClick={handleCustomCreate} disabled={!customDate}>
                  Schedule for {customDate ? formatDate(customDate) : '…'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={resetAndClose}>Skip</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={duplicateConfirm !== null}
        title="Create another appointment?"
        message={`You already have an upcoming appointment (${formatUpcomingSummary(existingUpcoming)}). Create another anyway?`}
        confirmLabel="Create anyway"
        onConfirm={confirmDuplicateCreate}
        onCancel={() => setDuplicateConfirm(null)}
      />
    </>
  );
}
