import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../context/MedicalDataContext';
import { Card, CardBody, CardHeader, CardLink, EmptyCardMessage } from '../components/ui/Card';
import {
  CalendarPlusIcon,
  HeartPulseIcon,
  PillIcon,
  QuickActionGrid,
  UploadIcon,
} from '../components/ui/QuickActionGrid';
import { formatDate, formatTime, sortByDateAsc, sortByDateDesc } from '../utils/format';
import { CARE_CATEGORY_LABELS } from '../types/profile';
import {
  getDueThisMonth,
  getPreventiveItems,
  PREVENTIVE_STATUS_LABELS,
  preventiveBadgeClass,
} from '../utils/preventiveCare';
import { RECORD_TYPE_LABELS } from '../types';

export function DashboardPage() {
  const { data } = useAppData();
  const navigate = useNavigate();

  const upcoming = data.appointments
    .filter((a) => a.status === 'upcoming')
    .sort((a, b) => sortByDateAsc(a.date, b.date))
    .slice(0, 4);

  const preventive = getPreventiveItems(data.adultHealthProfile.careProviders, CARE_CATEGORY_LABELS);
  const overdue = preventive.filter((p) => p.status === 'overdue');
  const dueThisMonth = getDueThisMonth(preventive);

  const activeMeds = data.medications.filter((m) => m.active).slice(0, 4);
  const recentRecords = [...data.records]
    .sort((a, b) => sortByDateDesc(a.date || a.uploadDate, b.date || b.uploadDate))
    .slice(0, 4);

  const profile = data.adultHealthProfile;
  const activeConditions = data.conditions.filter((c) => c.status === 'active' || c.status === 'chronic');

  const quickActions = [
    { to: '/appointments', label: 'Add Appointment', icon: <CalendarPlusIcon />, state: { openAdd: true } },
    { to: '/records', label: 'Upload Medical Record', icon: <UploadIcon />, state: { openUpload: true } },
    { to: '/health', label: 'Add Medication', icon: <PillIcon />, state: { section: 'medications', openAdd: true } },
    { to: '/health', label: 'Add Condition', icon: <HeartPulseIcon />, state: { section: 'conditions', openAdd: true } },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">
          {profile.name ? `Hello, ${profile.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="page-subtitle">Your health at a glance</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>
          Quick Actions
        </h2>
        <QuickActionGrid items={quickActions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Upcoming Appointments"
            action={<CardLink to="/appointments">See all</CardLink>}
          />
          <CardBody>
            {upcoming.length === 0 ? (
              <EmptyCardMessage>No upcoming appointments</EmptyCardMessage>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/appointments?id=${a.id}`}
                      className="flex justify-between gap-2 group rounded-xl -mx-2 px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-[15px]">{a.doctorName}</p>
                        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{a.reason || a.specialty}</p>
                      </div>
                      <p className="text-sm text-[var(--color-accent)] shrink-0">
                        {formatDate(a.date)}{a.time ? ` · ${formatTime(a.time)}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Overdue Preventive Care"
            action={<CardLink to="/health?section=preventive">View</CardLink>}
          />
          <CardBody>
            {overdue.length === 0 ? (
              <EmptyCardMessage>Nothing overdue — nice work!</EmptyCardMessage>
            ) : (
              <ul className="space-y-3">
                {overdue.map((p) => (
                  <li key={p.entry.id} className="flex justify-between items-center gap-2">
                    <span className="text-[15px]">{p.label}</span>
                    <span className={`badge ${preventiveBadgeClass(p.status)}`}>
                      {PREVENTIVE_STATUS_LABELS[p.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Due This Month"
            action={<CardLink to="/health?section=preventive">View</CardLink>}
          />
          <CardBody>
            {dueThisMonth.length === 0 ? (
              <EmptyCardMessage>Nothing due this month</EmptyCardMessage>
            ) : (
              <ul className="space-y-3">
                {dueThisMonth.map((p) => (
                  <li key={p.entry.id} className="flex justify-between items-center gap-2">
                    <div>
                      <p className="text-[15px] font-medium">{p.label}</p>
                      {p.nextDue && (
                        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Due {formatDate(p.nextDue)}</p>
                      )}
                    </div>
                    <span className={`badge ${preventiveBadgeClass(p.status)}`}>
                      {PREVENTIVE_STATUS_LABELS[p.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Active Medications"
            action={<CardLink to="/health?section=medications">See all</CardLink>}
          />
          <CardBody>
            {activeMeds.length === 0 ? (
              <EmptyCardMessage>No active medications</EmptyCardMessage>
            ) : (
              <ul className="space-y-3">
                {activeMeds.map((m) => (
                  <li key={m.id}>
                    <p className="font-medium text-[15px]">{m.name}</p>
                    <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{m.dose} · {m.frequency}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent Records"
            action={<CardLink to="/records">See all</CardLink>}
          />
          <CardBody>
            {recentRecords.length === 0 ? (
              <EmptyCardMessage>No records yet</EmptyCardMessage>
            ) : (
              <ul className="space-y-3">
                {recentRecords.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/records?id=${r.id}`)}
                      className="w-full text-left rounded-xl -mx-2 px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <p className="font-medium text-[15px] truncate">{r.summary || r.fileName}</p>
                      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                        {RECORD_TYPE_LABELS[r.recordType]} · {formatDate(r.date || r.uploadDate)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Health Summary" />
          <CardBody>
            <dl className="space-y-3 text-[15px]">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-muted)' }}>Conditions</dt>
                <dd className="font-semibold">{activeConditions.length} active</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-muted)' }}>Medications</dt>
                <dd className="font-semibold">{data.medications.filter((m) => m.active).length} active</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-muted)' }}>Providers</dt>
                <dd className="font-semibold">
                  {data.adultHealthProfile.careProviders.filter((c) => c.providerName).length} on file
                </dd>
              </div>
              {profile.pharmacy.name && (
                <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Pharmacy</p>
                  <p className="font-medium mt-0.5">{profile.pharmacy.name}</p>
                </div>
              )}
              {activeConditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {activeConditions.slice(0, 4).map((c) => (
                    <span
                      key={c.id}
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
