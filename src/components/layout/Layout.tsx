import { NavLink, Outlet } from 'react-router-dom';
import { useAppData } from '../../context/MedicalDataContext';
import { useTheme } from '../../hooks/useTheme';
import { GlobalSearch } from './GlobalSearch';

const navItems = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: HomeIcon },
  { to: '/appointments', label: 'Appointments', shortLabel: 'Visits', icon: CalendarIcon },
  { to: '/health', label: 'Health', shortLabel: 'Health', icon: HeartIcon },
  { to: '/records', label: 'Records', shortLabel: 'Records', icon: DocIcon },
  { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: GearIcon },
];

export function Layout() {
  const { data } = useAppData();
  useTheme(data.settings);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-60 lg:w-64 md:flex-col shrink-0 border-r sticky top-0 h-screen"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              <HeartIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight leading-tight">Medical Tracker</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Personal health hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
          All data stored locally
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-40 border-b px-4 py-3 md:px-8 md:py-4 backdrop-blur-xl"
          style={{ background: 'color-mix(in srgb, var(--color-card) 85%, transparent)', borderColor: 'var(--color-border)' }}
        >
          <div className="max-w-4xl mx-auto">
            <GlobalSearch />
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-36 md:px-8 md:py-8 md:pb-8">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 border-t z-40 safe-bottom"
          style={{ background: 'color-mix(in srgb, var(--color-card) 92%, transparent)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex justify-around items-center py-1.5 px-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] rounded-xl transition-colors ${
                    isActive ? 'text-[var(--color-accent)]' : 'opacity-40'
                  }`
                }
              >
                <item.icon className="w-6 h-6" />
                <span className="text-[10px] font-medium leading-none">{item.shortLabel}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
