import { Link } from 'react-router-dom';
import type { CareProviderEntry } from '../../types/profile';
import { CARE_CATEGORY_LABELS } from '../../types/profile';
import type { ProviderLinkSummaryData } from '../../utils/appointmentLinking';
import { formatDate } from '../../utils/format';
import { APPOINTMENT_STATUS_LABELS } from '../../types';

export function ProviderLinkSummary({ summary }: { summary: ProviderLinkSummaryData }) {
  const { lastAppointment, nextAppointment, allAppointments, linkedRecords, linkedMedications, linkedConditions } = summary;

  if (
    allAppointments.length === 0 &&
    linkedRecords.length === 0 &&
    linkedMedications.length === 0 &&
    linkedConditions.length === 0
  ) {
    return (
      <p className="text-sm mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
        No linked appointments yet
      </p>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Last appointment</p>
          {lastAppointment ? (
            <Link to={`/appointments?id=${lastAppointment.id}`} className="font-medium text-[var(--color-accent)] hover:opacity-80">
              {formatDate(lastAppointment.date)} · {lastAppointment.doctorName}
            </Link>
          ) : (
            <p style={{ color: 'var(--color-muted)' }}>—</p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Next appointment</p>
          {nextAppointment ? (
            <Link to={`/appointments?id=${nextAppointment.id}`} className="font-medium text-[var(--color-accent)] hover:opacity-80">
              {formatDate(nextAppointment.date)} · {nextAppointment.doctorName}
            </Link>
          ) : (
            <p style={{ color: 'var(--color-muted)' }}>—</p>
          )}
        </div>
      </div>

      {allAppointments.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>
            Linked appointments ({allAppointments.length})
          </p>
          <ul className="space-y-1.5 max-h-36 overflow-y-auto">
            {allAppointments.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/appointments?id=${a.id}`}
                  className="flex justify-between gap-2 text-sm hover:opacity-80 py-1"
                >
                  <span className="truncate">{a.doctorName} · {a.reason || 'Visit'}</span>
                  <span className="shrink-0" style={{ color: 'var(--color-muted)' }}>
                    {formatDate(a.date)} · {APPOINTMENT_STATUS_LABELS[a.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {linkedRecords.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>
            Linked records ({linkedRecords.length})
          </p>
          <ul className="space-y-1">
            {linkedRecords.map((r) => (
              <li key={r.id}>
                <Link to={`/records?id=${r.id}`} className="text-sm text-[var(--color-accent)] hover:opacity-80 truncate block">
                  {r.summary || r.fileName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(linkedMedications.length > 0 || linkedConditions.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {linkedMedications.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Linked meds</p>
              <ul className="space-y-1">
                {linkedMedications.map((m) => (
                  <li key={m.id} className="text-sm truncate">{m.name}</li>
                ))}
              </ul>
            </div>
          )}
          {linkedConditions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Linked conditions</p>
              <ul className="space-y-1">
                {linkedConditions.map((c) => (
                  <li key={c.id} className="text-sm truncate">{c.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProviderCategoryBadge({ entry }: { entry: CareProviderEntry }) {
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
    >
      {CARE_CATEGORY_LABELS[entry.category]}
    </span>
  );
}
