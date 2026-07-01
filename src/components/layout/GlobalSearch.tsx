import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/MedicalDataContext';
import { SpecialtySelect } from '../ui/SpecialtySelect';
import { globalSearch, SEARCH_TYPE_LABELS, type SearchResult } from '../../utils/search';
import { specialtyMatches } from '../../utils/specialties';

function filterBySpecialty(results: SearchResult[], specialtyFilter: string, data: ReturnType<typeof useAppData>['data']): SearchResult[] {
  if (!specialtyFilter) return results;

  return results.filter((r) => {
    if (r.type === 'appointment') {
      const a = data.appointments.find((x) => x.id === r.id);
      return a ? specialtyMatches(a.specialty, specialtyFilter) : false;
    }
    if (r.type === 'provider') {
      const p = data.adultHealthProfile.careProviders.find((x) => x.id === r.id);
      return p ? specialtyMatches(p.specialty, specialtyFilter) : false;
    }
    return true;
  });
}

export function GlobalSearch() {
  const { data } = useAppData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => filterBySpecialty(globalSearch(data, query), specialtyFilter, data),
    [data, query, specialtyFilter],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const showResults = open && (query.trim() || specialtyFilter);

  return (
    <div ref={ref} className="relative w-full space-y-2">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--color-muted)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search providers, appointments, meds…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="field-input w-full pl-10 pr-16 py-2.5"
        />
        <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium px-1.5 py-0.5 rounded-md border opacity-40">
          ⌘K
        </kbd>
      </div>
      <SpecialtySelect
        mode="filter"
        label="Filter by specialty"
        value={specialtyFilter}
        onChange={(v) => {
          setSpecialtyFilter(v);
          setOpen(true);
        }}
        className="w-full sm:max-w-xs"
      />
      {showResults && (
        <div
          className="absolute top-full mt-2 w-full rounded-2xl border shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {!query.trim() && specialtyFilter ? (
            <p className="px-4 py-3 text-xs border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              Type a search term to narrow results, or browse by specialty filter
            </p>
          ) : null}
          {query.trim() && results.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--color-muted)' }}>
              No results for &ldquo;{query}&rdquo;
              {specialtyFilter ? ' with this specialty' : ''}
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--color-muted)' }}>
              Enter a search term
            </p>
          ) : (
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 border-b last:border-0 flex items-center gap-3 transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => {
                  navigate(r.path);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider shrink-0 w-[72px]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {SEARCH_TYPE_LABELS[r.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate">{r.title}</p>
                  <p className="text-sm truncate" style={{ color: 'var(--color-muted)' }}>{r.subtitle}</p>
                </div>
                <svg className="w-4 h-4 shrink-0 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
