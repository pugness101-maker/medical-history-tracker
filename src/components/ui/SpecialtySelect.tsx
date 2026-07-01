import type { ProfileCareCategory } from '../../types/profile';
import {
  OTHER_SPECIALTY_KEY,
  SPECIALTY_OPTIONS,
  getSpecialtyFilterOptions,
  healthCategoryFromSpecialty,
  resolveSpecialtySelectState,
} from '../../utils/specialties';
import { Input, Select } from './FormFields';

interface SpecialtySelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onHealthCategoryChange?: (category: ProfileCareCategory | '') => void;
  className?: string;
  /** Filter mode: includes "All specialties", no Other text field */
  mode?: 'pick' | 'filter';
  required?: boolean;
}

export function SpecialtySelect({
  label = 'Specialty',
  value,
  onChange,
  onHealthCategoryChange,
  className = '',
  mode = 'pick',
  required,
}: SpecialtySelectProps) {
  const { selectValue, customValue } = resolveSpecialtySelectState(value);

  const handleSelectChange = (next: string) => {
    if (mode === 'filter') {
      onChange(next);
      return;
    }
    if (next === OTHER_SPECIALTY_KEY) {
      onChange(customValue || '');
      onHealthCategoryChange?.(healthCategoryFromSpecialty(customValue));
    } else if (next === '') {
      onChange('');
      onHealthCategoryChange?.('');
    } else {
      onChange(next);
      onHealthCategoryChange?.(healthCategoryFromSpecialty(next));
    }
  };

  const handleCustomChange = (text: string) => {
    onChange(text);
    onHealthCategoryChange?.(healthCategoryFromSpecialty(text));
  };

  const options = mode === 'filter' ? getSpecialtyFilterOptions() : SPECIALTY_OPTIONS;

  return (
    <div className={className}>
      <Select
        label={label}
        required={required}
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
      >
        {mode === 'pick' && !required && <option value="">Select specialty…</option>}
        {options.map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {mode === 'pick' && selectValue === OTHER_SPECIALTY_KEY && (
        <Input
          label="Custom specialty"
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Enter specialty"
          className="mt-2"
        />
      )}
    </div>
  );
}
