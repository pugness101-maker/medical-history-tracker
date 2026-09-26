import { useId, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { ProviderSuggestion } from '../../utils/providerSuggestions';

interface ProviderComboboxProps {
  value: string;
  suggestions: ProviderSuggestion[];
  onChange: (value: string) => void;
  onSelect: (provider: ProviderSuggestion) => void;
  required?: boolean;
}

export function ProviderCombobox({ value, suggestions, onChange, onSelect, required }: ProviderComboboxProps) {
  const generatedId = useId();
  const inputId = `doctor-provider-${generatedId}`;
  const listId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return suggestions;
    return suggestions.filter((provider) => provider.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [suggestions, query]);

  const select = (provider: ProviderSuggestion) => {
    onSelect(provider);
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    setQuery(event.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      select(filtered[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="field-label">
        Doctor / Provider
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={inputId}
        className="field-input"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        required={required}
        value={value}
        onChange={handleChange}
        onClick={() => { setQuery(''); setOpen(true); }}
        onFocus={() => { setQuery(''); setOpen(true); }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-[var(--color-surface)] p-1 shadow-lg"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {filtered.map((provider, index) => (
            <li
              id={`${listId}-${index}`}
              key={`${provider.name}-${provider.specialty}-${provider.clinic}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10 ${index === activeIndex ? 'bg-black/5 dark:bg-white/10' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(provider)}
              >
                <span className="block font-medium">{provider.name}</span>
                {(provider.specialty || provider.clinic) && (
                  <span className="block truncate text-xs opacity-60">
                    {[provider.specialty, provider.clinic].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
