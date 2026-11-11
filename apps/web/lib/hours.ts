import { OpeningDay, openingHours } from './clinic-content';
import { formatTime, zonedNow } from './opening-hours';

/** The clinic is in London, so "today" is London's day, whatever the visitor's time zone. */
export const londonWeekday = (now = new Date()) => zonedNow('Europe/London', now).day;

export const formatRange = (d: OpeningDay) =>
  d.open && d.close ? `${formatTime(d.open)}–${formatTime(d.close)}` : 'Closed';

export const openDaysCount = openingHours.filter((d) => d.open).length;

/** "Open today 8:30–18:00", or "Closed today · Opens tomorrow 8:30". */
export function todayStatus(now = new Date()): string {
  const today = londonWeekday(now);
  const day = openingHours.find((d) => d.day === today);
  if (day?.open && day.close) return `Open today ${formatRange(day)}`;

  for (let i = 1; i <= 7; i++) {
    const next = openingHours.find((d) => d.day === (today + i) % 7);
    if (next?.open) return `Closed today · Opens ${i === 1 ? 'tomorrow' : next.label} ${formatTime(next.open)}`;
  }
  return 'Closed today';
}
