import { PRIVACY_WARNING } from '../../types/profile';

export function PrivacyWarning({ className = '' }: { className?: string }) {
  return (
    <p className={`text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      {PRIVACY_WARNING}
    </p>
  );
}

export function PortalNotesWarning() {
  return (
    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3">
      Portal / login notes: store URLs and hints only — never store passwords here.
    </p>
  );
}
