import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  className?: string;
}

export function Input({
  label,
  required,
  className = '',
  id,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={className}>
      <label htmlFor={inputId} className="field-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input id={inputId} className="field-input" {...props} />
    </div>
  );
}

export function Select({
  label,
  required,
  className = '',
  id,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={className}>
      <label htmlFor={selectId} className="field-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select id={selectId} className="field-input" {...props}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({
  label,
  required,
  className = '',
  id,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={className}>
      <label htmlFor={textareaId} className="field-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea id={textareaId} rows={3} className="field-input resize-y" {...props} />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  className = '',
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
