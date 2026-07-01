import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppData } from '../../types';
import type { VaccineKey } from '../../types/vaccine';
import { Textarea } from '../ui/FormFields';
import { formatDate } from '../../utils/format';
import {
  buildAllVaccineRows,
  formatStatusLabel,
  statusBadgeClass,
  type VaccineRowView,
} from '../../utils/vaccineRegistry';

interface VaccinesSectionProps {
  data: AppData;
  onUpdateNotes: (key: VaccineKey, notes: string) => void;
}

function VaccineExpandedDetail({
  row,
  onUpdateNotes,
}: {
  row: VaccineRowView;
  onUpdateNotes: (key: VaccineKey, notes: string) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(row.notes);

  return (
    <div className="px-4 sm:px-5 pb-5 pt-3 space-y-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div>
        <h4 className="text-sm font-semibold mb-2">Dose history</h4>
        {row.doses.length === 0 ? (
          <p className="text-sm opacity-50">No doses recorded yet</p>
        ) : (
          <ul className="space-y-2">
            {row.doses.map((dose) => (
              <li
                key={dose.id}
                className="p-3 rounded-xl border text-sm min-h-[44px]"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{dose.date ? formatDate(dose.date) : 'Series complete'}</span>
                  {dose.product && <span className="opacity-60">{dose.product}</span>}
                </div>
                {dose.provider && <p className="opacity-50 mt-1">{dose.provider}</p>}
                {dose.notes && dose.notes !== dose.product && (
                  <p className="opacity-50 mt-1 text-xs">{dose.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {row.records.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Uploaded records</h4>
          <ul className="space-y-2">
            {row.records.map((record) => (
              <li key={record.id}>
                <Link
                  to={`/records?id=${record.id}`}
                  className="block p-3 rounded-xl border text-sm min-h-[44px] hover:opacity-90 transition-opacity"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="font-medium text-[var(--color-accent)]">{record.fileName || record.summary}</p>
                  <p className="opacity-50 mt-1">
                    {formatDate(record.date || record.uploadDate)}
                    {record.provider && ` · ${record.provider}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Booster recommendation</h4>
        <p className="text-sm p-3 rounded-xl bg-black/5 dark:bg-white/5">{row.boosterRecommendation}</p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold">Notes</h4>
          {!editingNotes && (
            <button
              type="button"
              className="text-sm text-[var(--color-accent)] min-h-[44px] px-2"
              onClick={() => {
                setDraftNotes(row.notes);
                setEditingNotes(true);
              }}
            >
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              label=""
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="text-sm font-medium text-[var(--color-accent)] min-h-[44px] px-3"
                onClick={() => {
                  onUpdateNotes(row.key, draftNotes);
                  setEditingNotes(false);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="text-sm opacity-60 min-h-[44px] px-3"
                onClick={() => setEditingNotes(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm opacity-70">{row.notes || 'No notes'}</p>
        )}
      </div>
    </div>
  );
}

function VaccineTableRow({
  row,
  expanded,
  onToggle,
  onUpdateNotes,
}: {
  row: VaccineRowView;
  expanded: boolean;
  onToggle: () => void;
  onUpdateNotes: (key: VaccineKey, notes: string) => void;
}) {
  const hasHistory = row.doses.length > 0 || row.records.length > 0 || row.notes;

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left min-h-[56px] touch-manipulation hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        aria-expanded={expanded}
      >
        {/* Desktop table row */}
        <div className="hidden md:grid md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_auto] gap-3 items-center px-4 py-3">
          <span className="font-medium text-[15px] flex items-center gap-2">
            <svg
              className={`w-4 h-4 shrink-0 opacity-40 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {row.name}
          </span>
          <span className="text-sm">{row.lastDose ? formatDate(row.lastDose) : '—'}</span>
          <span className="text-sm">{row.seriesStatus}</span>
          <span className="text-sm">{row.boosterDue ? formatDate(row.boosterDue) : '—'}</span>
          <span className="text-sm truncate opacity-70">{row.notes || '—'}</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusBadgeClass(row.status)}`}>
            {formatStatusLabel(row.status)}
          </span>
        </div>

        {/* Mobile card row */}
        <div className="md:hidden px-4 py-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className={`w-5 h-5 shrink-0 opacity-40 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <span className="font-semibold text-[16px]">{row.name}</span>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusBadgeClass(row.status)}`}>
              {formatStatusLabel(row.status)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pl-7">
            <span className="opacity-50">Last dose</span>
            <span>{row.lastDose ? formatDate(row.lastDose) : '—'}</span>
            <span className="opacity-50">Series</span>
            <span>{row.seriesStatus}</span>
            <span className="opacity-50">Booster due</span>
            <span>{row.boosterDue ? formatDate(row.boosterDue) : '—'}</span>
          </div>
          {row.notes && <p className="text-sm opacity-60 pl-7 truncate">{row.notes}</p>}
        </div>
      </button>

      {expanded && hasHistory && (
        <VaccineExpandedDetail row={row} onUpdateNotes={onUpdateNotes} />
      )}
      {expanded && !hasHistory && (
        <div className="px-4 sm:px-5 pb-5 pt-3 border-t text-sm opacity-50" style={{ borderColor: 'var(--color-border)' }}>
          No dose history yet. Upload an immunization record in Records.
        </div>
      )}
    </div>
  );
}

export function VaccinesSection({ data, onUpdateNotes }: VaccinesSectionProps) {
  const rows = useMemo(() => buildAllVaccineRows(data), [data]);
  const [expandedKeys, setExpandedKeys] = useState<Set<VaccineKey>>(new Set());

  const toggle = (key: VaccineKey) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const trackedRows = rows.filter(
    (r) => r.doses.length > 0 || r.status !== 'not_applicable' || r.records.length > 0,
  );
  const displayRows = trackedRows.length > 0 ? rows : rows;

  return (
    <div className="pt-4">
      <div className="hidden md:grid md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_auto] gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide opacity-50 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span>Vaccine</span>
        <span>Last Dose</span>
        <span>Series Status</span>
        <span>Booster Due</span>
        <span>Notes</span>
        <span>Status</span>
      </div>

      <div>
        {displayRows.map((row) => (
          <VaccineTableRow
            key={row.key}
            row={row}
            expanded={expandedKeys.has(row.key)}
            onToggle={() => toggle(row.key)}
            onUpdateNotes={onUpdateNotes}
          />
        ))}
      </div>

      {data.records.some((r) => r.fileName === 'immunization_record.pdf') && (
        <p className="text-xs opacity-50 px-4 pt-4">
          Source: immunization_record.pdf linked from Records
        </p>
      )}
    </div>
  );
}

export { buildAllVaccineRows, countActionNeeded } from '../../utils/vaccineRegistry';
