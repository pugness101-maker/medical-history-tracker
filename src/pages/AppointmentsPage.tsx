import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAppData } from '../context/MedicalDataContext';
import { AppointmentForm } from '../components/forms/AppointmentForm';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ConfirmDialog } from '../components/ui/EmptyState';
import type { Appointment } from '../types';
import { APPOINTMENT_STATUS_LABELS, RECORD_TYPE_LABELS } from '../types';
import { formatDate, formatTime, sortByDateAsc, sortByDateDesc } from '../utils/format';
import type { AutofillResult } from '../utils/autofillParser';

type ViewMode = 'list' | 'calendar';
type TabMode = 'upcoming' | 'past';

const AUTOFILL_KEY = 'appointment-autofill';

export function AppointmentsPage() {
  const { data, setData } = useAppData();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const highlightId = searchParams.get('id');

  const [tab, setTab] = useState<TabMode>('upcoming');
  const [view, setView] = useState<ViewMode>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Appointment | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date());

  useEffect(() => {
    const state = location.state as { openAdd?: boolean } | null;
    if (state?.openAdd) {
      setEditing(undefined);
      setModalOpen(true);
    }
  }, [location.state]);

  useEffect(() => {
    const raw = sessionStorage.getItem(AUTOFILL_KEY);
    if (raw) {
      try {
        const autofill = JSON.parse(raw) as AutofillResult;
        setEditing({
          id: '',
          createdAt: '',
          updatedAt: '',
          doctorName: autofill.providerName,
          specialty: autofill.specialty,
          clinic: autofill.clinic,
          date: autofill.visitDate,
          time: autofill.visitTime,
          reason: autofill.reasonForVisit,
          symptoms: '',
          questionsToAsk: '',
          diagnosis: autofill.diagnosis,
          treatmentPlan: autofill.treatmentPlan,
          followUpNeeded: autofill.followUpNeeded,
          nextAppointmentDate: '',
          cost: '',
          notes: [autofill.prescriptions, autofill.followUpNotes, autofill.extraNotes].filter(Boolean).join('\n\n'),
          status: 'completed',
          attachedRecordIds: [],
        });
        setModalOpen(true);
        sessionStorage.removeItem(AUTOFILL_KEY);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (highlightId) setDetailId(highlightId);
  }, [highlightId]);

  const filtered = useMemo(() => {
    const list = data.appointments.filter((a) =>
      tab === 'upcoming' ? a.status === 'upcoming' : a.status !== 'upcoming',
    );
    return tab === 'upcoming'
      ? list.sort((a, b) => sortByDateAsc(a.date, b.date))
      : list.sort((a, b) => sortByDateDesc(a.date, b.date));
  }, [data.appointments, tab]);

  const detail = detailId ? data.appointments.find((a) => a.id === detailId) : null;
  const attachedRecords = detail
    ? data.records.filter((r) => detail.attachedRecordIds.includes(r.id))
    : [];

  const save = (appointment: Appointment) => {
    setData((d) => {
      const exists = d.appointments.some((a) => a.id === appointment.id);
      return {
        ...d,
        appointments: exists
          ? d.appointments.map((a) => (a.id === appointment.id ? appointment : a))
          : [...d.appointments, { ...appointment, attachedRecordIds: appointment.attachedRecordIds ?? [] }],
      };
    });
    setModalOpen(false);
    setEditing(undefined);
  };

  const remove = (id: string) => {
    setData((d) => ({
      ...d,
      appointments: d.appointments.filter((a) => a.id !== id),
    }));
    setDeleteId(null);
    if (detailId === id) setDetailId(null);
  };

  const toggleRecordAttach = (recordId: string) => {
    if (!detail) return;
    const ids = detail.attachedRecordIds.includes(recordId)
      ? detail.attachedRecordIds.filter((x) => x !== recordId)
      : [...detail.attachedRecordIds, recordId];
    save({ ...detail, attachedRecordIds: ids, updatedAt: new Date().toISOString() });
  };

  const calendarDays = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calMonth]);

  const apptsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of data.appointments) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return map;
  }, [data.appointments]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Visits, follow-ups, and attached records"
        actions={
          <>
            <Link to="/records" state={{ openUpload: true }}>
              <Button variant="secondary">Upload & Auto-fill</Button>
            </Link>
            <Button onClick={() => { setEditing(undefined); setModalOpen(true); }}>+ Add Appointment</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          options={[
            { value: 'upcoming' as TabMode, label: 'Upcoming' },
            { value: 'past' as TabMode, label: 'Past' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="flex-1" />
        <SegmentedControl
          options={[
            { value: 'list' as ViewMode, label: 'List' },
            { value: 'calendar' as ViewMode, label: 'Calendar' },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === 'list' ? (
        filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="opacity-50">No {tab} appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setDetailId(a.id)}
                className={`card card-hover w-full text-left p-5 ${highlightId === a.id ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-semibold">{a.doctorName}</p>
                    <p className="text-sm opacity-50">{a.specialty} · {a.reason || 'Visit'}</p>
                    {a.followUpNeeded && (
                      <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full badge-due-soon">Follow-up needed</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-medium">{formatDate(a.date)}</p>
                    {a.time && <p className="text-sm opacity-50">{formatTime(a.time)}</p>}
                    <p className="text-xs opacity-40 mt-1">{APPOINTMENT_STATUS_LABELS[a.status]}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} className="px-3 py-1 rounded-lg hover:bg-black/5">‹</button>
            <h3 className="font-semibold">{calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} className="px-3 py-1 rounded-lg hover:bg-black/5">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-50 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d) => {
              const key = d.toISOString().split('T')[0];
              const inMonth = d.getMonth() === calMonth.getMonth();
              const appts = apptsByDate.get(key) ?? [];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => appts[0] && setDetailId(appts[0].id)}
                  className={`min-h-14 p-1 rounded-lg text-sm ${inMonth ? '' : 'opacity-30'} ${appts.length ? 'bg-[var(--color-accent-soft)] font-medium' : 'hover:bg-black/5'}`}
                >
                  {d.getDate()}
                  {appts.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] mx-auto mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {detail && (
        <Modal open onClose={() => setDetailId(null)} title={detail.doctorName} wide>
          <div className="space-y-4 text-[15px]">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="opacity-50">Date</span><p className="font-medium">{formatDate(detail.date)} {detail.time && formatTime(detail.time)}</p></div>
              <div><span className="opacity-50">Status</span><p className="font-medium">{APPOINTMENT_STATUS_LABELS[detail.status]}</p></div>
              <div><span className="opacity-50">Specialty</span><p>{detail.specialty || '—'}</p></div>
              <div><span className="opacity-50">Location</span><p>{detail.clinic || '—'}</p></div>
            </div>
            {detail.reason && <div><p className="text-sm opacity-50">Reason</p><p>{detail.reason}</p></div>}
            {detail.questionsToAsk && <div><p className="text-sm opacity-50">Questions for doctor</p><p className="whitespace-pre-line">{detail.questionsToAsk}</p></div>}
            {detail.diagnosis && <div><p className="text-sm opacity-50">Diagnosis</p><p>{detail.diagnosis}</p></div>}
            {detail.treatmentPlan && <div><p className="text-sm opacity-50">Treatment plan</p><p className="whitespace-pre-line">{detail.treatmentPlan}</p></div>}
            {detail.followUpNeeded && (
              <div className="p-3 rounded-xl badge-due-soon">
                Follow-up needed{detail.nextAppointmentDate ? ` · ${formatDate(detail.nextAppointmentDate)}` : ''}
              </div>
            )}
            {detail.notes && <div><p className="text-sm opacity-50">Notes</p><p className="whitespace-pre-line">{detail.notes}</p></div>}

            <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <p className="font-semibold mb-2">Attached records</p>
              {data.records.length === 0 ? (
                <p className="text-sm opacity-50">No records to attach</p>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {data.records.map((r) => (
                    <li key={r.id}>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={detail.attachedRecordIds.includes(r.id)}
                          onChange={() => toggleRecordAttach(r.id)}
                        />
                        {r.summary || r.fileName} ({RECORD_TYPE_LABELS[r.recordType]})
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {attachedRecords.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {attachedRecords.map((r) => (
                    <li key={r.id} className="text-sm text-[var(--color-accent)]">
                      <Link to={`/records?id=${r.id}`}>{r.fileName || r.summary}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => { setEditing(detail); setDetailId(null); setModalOpen(true); }}>Edit</Button>
              <Button variant="ghost" onClick={() => setDeleteId(detail.id)} className="text-red-600">Delete</Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(undefined); }} title={editing?.id ? 'Edit Appointment' : 'Add Appointment'} wide>
        <AppointmentForm initial={editing?.id ? editing : editing} onSubmit={save} onCancel={() => { setModalOpen(false); setEditing(undefined); }} />
      </Modal>

      <ConfirmDialog open={deleteId !== null} title="Delete appointment?" message="This cannot be undone." confirmLabel="Delete" danger onConfirm={() => deleteId && remove(deleteId)} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

export function setAppointmentAutofill(data: AutofillResult) {
  sessionStorage.setItem(AUTOFILL_KEY, JSON.stringify(data));
}
