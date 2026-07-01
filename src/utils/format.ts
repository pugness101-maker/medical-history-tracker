export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function sortByDateDesc(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

export function sortByDateAsc(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

export function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return date >= today;
}

export function getUniqueDoctors(appointments: { doctorName: string }[]): string[] {
  return [...new Set(appointments.map((a) => a.doctorName).filter(Boolean))].sort();
}

export function getUniqueSpecialties(appointments: { specialty: string }[]): string[] {
  return [...new Set(appointments.map((a) => a.specialty).filter(Boolean))].sort();
}
