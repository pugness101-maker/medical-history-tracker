import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppData } from '../context/MedicalDataContext';
import { AppointmentForm } from '../components/forms/AppointmentForm';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ConfirmDialog } from '../components/ui/EmptyState';
import { Select } from '../components/ui/FormFields';
import type { Appointment } from '../types';
import { APPOINTMENT_STATUS_LABELS, RECORD_TYPE_LABELS } from '../types';
import { CARE_CATEGORY_LABELS, type ProfileCareCategory } from '../types/profile';
import { formatDate, formatTime, sortByDateAsc, sortByDateDesc } from '../utils/format';
import type { AutofillResult } from '../utils/autofillParser';
import {
  applyProviderNameFromAppointment,
  autoLinkAllAppointments,
  autoLinkAppointment,
  inferHealthCategory,
  linkAppointmentToProvider,
  normalizeAppointment,
  syncCareProvidersFromAppointments,
} from '../utils/appointmentLinking';
import { specialtyMatches } from '../utils/specialties';
import { SpecialtySelect } from '../components/ui/SpecialtySelect';
import { getCareEntry as getEntry } from '../utils/profileDefaults';

type ViewMode = 'list' | 'calendar';
type TabMode = 'upcoming' | 'past';

const AUTOFILL_KEY = 'appointment-autofill';

const CARE_CATEGORIES = Object.keys(CARE_CATEGORY_LABELS) as ProfileCareCategory[];

export function AppointmentsPage() {
  const { data, setData } = useAppData();
  const navigate = useNavigate();
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
  const [changeProviderOpen, setChangeProviderOpen] = useState(false);
  const [linkMedsCondsOpen, setLinkMedsCondsOpen] = useState(false);
  const [attachRecordOpen, setAttachRecordOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProfileCareCategory>('core_medical');
  const [autoLinkMsg, setAutoLinkMsg] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');

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
          ...normalizeAppointment({
            id: '',
            createdAt: '',
            updatedAt: '',
            doctorName: autofill.providerName,
            specialty: autofill.specialty,
            clinic: autofill.clinic,
            date: autofill.visitDate,
            time: autofill.visitTime,
            reason: autofill.reasonForVisit,
            diagnosis: autofill.diagnosis,
            treatmentPlan: autofill.treatmentPlan,
            followUpNeeded: autofill.followUpNeeded,
            nextAppointmentDate: '',
            cost: '',
            notes: [autofill.prescriptions, autofill.followUpNotes, autofill.extraNotes].filter(Boolean).join('\n\n'),
            status: 'completed',
            providerId: '',
            healthCategory: '',
            relatedConditionIds: [],
            relatedMedicationIds: [],
            relatedRecordIds: [],
          }),
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
    let list = data.appointments.filter((a) =>
      tab === 'upcoming' ? a.status === 'upcoming' : a.status !== 'upcoming',
    );
    if (specialtyFilter) {
      list = list.filter((a) => specialtyMatches(a.specialty, specialtyFilter));
    }
    return tab === 'upcoming'
      ? list.sort((a, b) => sortByDateAsc(a.date, b.date))
      : list.sort((a, b) => sortByDateDesc(a.date, b.date));
  }, [data.appointments, tab, specialtyFilter]);

  const detail = detailId ? data.appointments.find((a) => a.id === detailId) : null;
  const linkedProvider = detail?.providerId
    ? data.adultHealthProfile.careProviders.find((p) => p.id === detail.providerId)
    : detail?.healthCategory
      ? getEntry(data.adultHealthProfile, detail.healthCategory as ProfileCareCategory)
      : null;

  const linkedRecords = detail
    ? data.records.filter((r) => detail.relatedRecordIds.includes(r.id))
    : [];
  const linkedMeds = detail
    ? data.medications.filter((m) => detail.relatedMedicationIds.includes(m.id))
    : [];
  const linkedConds = detail
    ? data.conditions.filter((c) => detail.relatedConditionIds.includes(c.id))
    : [];

  const persistAppointment = (appointment: Appointment, closeModal = true) => {
    setData((d) => {
      let profile = d.adultHealthProfile;
      let linked = autoLinkAppointment(appointment, profile);
      profile = applyProviderNameFromAppointment(profile, linked);
      const exists = d.appointments.some((a) => a.id === linked.id);
      const appointments = exists
        ? d.appointments.map((a) => (a.id === linked.id ? linked : a))
        : [...d.appointments, linked];
      profile = syncCareProvidersFromAppointments(profile, appointments);
      return { ...d, appointments, adultHealthProfile: profile };
    });
    if (closeModal) {
      setModalOpen(false);
      setEditing(undefined);
    }
  };

  const updateDetail = (updates: Partial<Appointment>) => {
    if (!detail) return;
    persistAppointment({ ...detail, ...updates, updatedAt: new Date().toISOString() }, false);
  };

  const remove = (id: string) => {
    setData((d) => ({
      ...d,
      appointments: d.appointments.filter((a) => a.id !== id),
    }));
    setDeleteId(null);
    if (detailId === id) setDetailId(null);
  };

  const handleAutoLinkAll = () => {
    setData((d) => autoLinkAllAppointments(d));
    setAutoLinkMsg('All appointments linked to Health providers.');
    setTimeout(() => setAutoLinkMsg(''), 3000);
  };

  const handleChangeProvider = () => {
    if (!detail) return;
    const entry = getEntry(data.adultHealthProfile, selectedCategory);
    const { appointment, profile } = linkAppointmentToProvider(
      detail, data.adultHealthProfile, entry.id, selectedCategory, data.appointments,
    );
    setData((d) => ({
      ...d,
      appointments: d.appointments.map((a) => (a.id === appointment.id ? appointment : a)),
      adultHealthProfile: profile,
    }));
    setChangeProviderOpen(false);
  };

  const handleCreateLinkProvider = () => {
    if (!detail) return;
    const category = (detail.healthCategory || inferCategoryFromDetail(detail)) as ProfileCareCategory || 'core_medical';
    const entry = getEntry(data.adultHealthProfile, category);
    const { appointment, profile } = linkAppointmentToProvider(
      { ...detail, doctorName: detail.doctorName },
      {
        ...data.adultHealthProfile,
        careProviders: data.adultHealthProfile.careProviders.map((p) =>
          p.id === entry.id
            ? {
                ...p,
                providerName: p.providerName || detail.doctorName.replace(/^Dr\.?\s*/i, ''),
                specialty: p.specialty || detail.specialty,
                location: p.location || detail.clinic,
              }
            : p,
        ),
      },
      entry.id,
      category,
      data.appointments,
    );
    setData((d) => ({
      ...d,
      appointments: d.appointments.map((a) => (a.id === appointment.id ? appointment : a)),
      adultHealthProfile: profile,
    }));
    navigate(`/health?section=providers`);
  };

  const toggleId = (field: 'relatedRecordIds' | 'relatedConditionIds' | 'relatedMedicationIds', id: string) => {
    if (!detail) return;
    const ids = detail[field];
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    updateDetail({ [field]: next });
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
        subtitle="Visits, follow-ups, and linked Health providers"
        actions={
          <>
            <Button variant="secondary" onClick={handleAutoLinkAll}>Auto-link all</Button>
            <Link to="/records" state={{ openUpload: true }}>
              <Button variant="secondary">Upload & Auto-fill</Button>
            </Link>
            <Button onClick={() => { setEditing(undefined); setModalOpen(true); }}>+ Add Appointment</Button>
          </>
        }
      />

      {autoLinkMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{autoLinkMsg}</p>}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        <SegmentedControl
          options={[
            { value: 'upcoming' as TabMode, label: 'Upcoming' },
            { value: 'past' as TabMode, label: 'Past' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <SpecialtySelect
          mode="filter"
          label="Specialty"
          value={specialtyFilter}
          onChange={setSpecialtyFilter}
          className="w-full sm:w-56"
        />
        <div className="hidden sm:block flex-1" />
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
            {filtered.map((a) => {
              const catLabel = a.healthCategory ? CARE_CATEGORY_LABELS[a.healthCategory as ProfileCareCategory] : null;
              return (
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
                      {catLabel && (
                        <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full badge-scheduled">{catLabel}</span>
                      )}
                      {a.followUpNeeded && (
                        <span className="inline-block mt-2 ml-1 text-xs font-medium px-2 py-0.5 rounded-full badge-due-soon">Follow-up needed</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-medium">{formatDate(a.date)}</p>
                      {a.time && <p className="text-sm opacity-50">{formatTime(a.time)}</p>}
                      <p className="text-xs opacity-40 mt-1">{APPOINTMENT_STATUS_LABELS[a.status]}</p>
                    </div>
                  </div>
                </button>
              );
            })}
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

            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-accent-soft)' }}>
              <p className="text-sm font-semibold mb-1">Linked Health provider</p>
              {linkedProvider ? (
                <div>
                  <p className="font-medium">{CARE_CATEGORY_LABELS[linkedProvider.category]}</p>
                  <p className="text-sm opacity-70">{linkedProvider.providerName || detail.doctorName || 'No provider name set'}</p>
                  <Link to="/health?section=providers" className="text-sm text-[var(--color-accent)] mt-1 inline-block">View in Health →</Link>
                </div>
              ) : (
                <p className="text-sm opacity-60">Not linked to a Health section yet</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="secondary" onClick={() => {
                  setSelectedCategory((detail.healthCategory as ProfileCareCategory) || 'core_medical');
                  setChangeProviderOpen(true);
                }}>Change linked provider</Button>
                <Button size="sm" variant="secondary" onClick={handleCreateLinkProvider}>Create/link provider</Button>
              </div>
            </div>

            {detail.reason && <div><p className="text-sm opacity-50">Reason for visit</p><p>{detail.reason}</p></div>}
            {detail.diagnosis && <div><p className="text-sm opacity-50">Diagnosis / Assessment</p><p>{detail.diagnosis}</p></div>}
            {detail.treatmentPlan && <div><p className="text-sm opacity-50">Treatment plan</p><p className="whitespace-pre-line">{detail.treatmentPlan}</p></div>}
            {detail.followUpNeeded && (
              <div className="p-3 rounded-xl badge-due-soon">
                Follow-up needed{detail.nextAppointmentDate ? ` · ${formatDate(detail.nextAppointmentDate)}` : ''}
              </div>
            )}
            {detail.notes && <div><p className="text-sm opacity-50">Notes</p><p className="whitespace-pre-line">{detail.notes}</p></div>}

            {(linkedRecords.length > 0 || linkedMeds.length > 0 || linkedConds.length > 0) && (
              <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                {linkedRecords.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Linked records</p>
                    <ul className="space-y-1">
                      {linkedRecords.map((r) => (
                        <li key={r.id}><Link to={`/records?id=${r.id}`} className="text-sm text-[var(--color-accent)]">{r.summary || r.fileName}</Link></li>
                      ))}
                    </ul>
                  </div>
                )}
                {linkedMeds.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Linked medications</p>
                    <ul className="space-y-1">{linkedMeds.map((m) => <li key={m.id} className="text-sm">{m.name}</li>)}</ul>
                  </div>
                )}
                {linkedConds.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Linked conditions</p>
                    <ul className="space-y-1">{linkedConds.map((c) => <li key={c.id} className="text-sm">{c.name}</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <Button size="sm" variant="secondary" onClick={() => setAttachRecordOpen(true)}>Attach record</Button>
              <Button size="sm" variant="secondary" onClick={() => setLinkMedsCondsOpen(true)}>Link condition/medication</Button>
              <Button variant="secondary" onClick={() => { setEditing(detail); setDetailId(null); setModalOpen(true); }}>Edit</Button>
              <Button variant="ghost" onClick={() => setDeleteId(detail.id)} className="text-red-600">Delete</Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={changeProviderOpen} onClose={() => setChangeProviderOpen(false)} title="Change linked provider">
        <div className="space-y-4">
          <Select label="Health section" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as ProfileCareCategory)}>
            {CARE_CATEGORIES.map((c) => <option key={c} value={c}>{CARE_CATEGORY_LABELS[c]}</option>)}
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setChangeProviderOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeProvider}>Link to section</Button>
          </div>
        </div>
      </Modal>

      <Modal open={attachRecordOpen} onClose={() => setAttachRecordOpen(false)} title="Attach records" wide>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {data.records.length === 0 ? (
            <p className="text-sm opacity-50">No records available</p>
          ) : (
            data.records.map((r) => (
              <li key={r.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-black/5">
                  <input
                    type="checkbox"
                    checked={detail?.relatedRecordIds.includes(r.id) ?? false}
                    onChange={() => toggleId('relatedRecordIds', r.id)}
                  />
                  {r.summary || r.fileName} ({RECORD_TYPE_LABELS[r.recordType]})
                </label>
              </li>
            ))
          )}
        </ul>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setAttachRecordOpen(false)}>Done</Button>
        </div>
      </Modal>

      <Modal open={linkMedsCondsOpen} onClose={() => setLinkMedsCondsOpen(false)} title="Link conditions & medications" wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="font-semibold mb-2">Conditions</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {data.conditions.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={detail?.relatedConditionIds.includes(c.id) ?? false} onChange={() => toggleId('relatedConditionIds', c.id)} />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Medications</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {data.medications.map((m) => (
                <li key={m.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={detail?.relatedMedicationIds.includes(m.id) ?? false} onChange={() => toggleId('relatedMedicationIds', m.id)} />
                    {m.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setLinkMedsCondsOpen(false)}>Done</Button>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(undefined); }} title={editing?.id ? 'Edit Appointment' : 'Add Appointment'} wide>
        <AppointmentForm initial={editing?.id ? editing : editing} onSubmit={persistAppointment} onCancel={() => { setModalOpen(false); setEditing(undefined); }} />
      </Modal>

      <ConfirmDialog open={deleteId !== null} title="Delete appointment?" message="This cannot be undone." confirmLabel="Delete" danger onConfirm={() => deleteId && remove(deleteId)} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function inferCategoryFromDetail(detail: Appointment): ProfileCareCategory | '' {
  return inferHealthCategory(detail);
}

export function setAppointmentAutofill(data: AutofillResult) {
  sessionStorage.setItem(AUTOFILL_KEY, JSON.stringify(data));
}
