/** Generic weekly-hours logic, shared by the widget (tenant config) and the demo site. */
export interface WeeklyHours {
  /** 0 = Sunday ... 6 = Saturday */
  day: number;
  /** "HH:MM", 24h. Missing = closed. */
  open?: string;
  close?: string;
}

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Day and minutes-since-midnight in the clinic's time zone, not the visitor's. */
export function zonedNow(timeZone: string, now = new Date()): { day: number; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return zonedNow('Europe/London', now); // bad tz in config: fall back rather than crash the widget
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: WEEKDAY[get('weekday')] ?? now.getDay(), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** "08:30" -> "8:30" */
export const formatTime = (hhmm: string) => hhmm.replace(/^0/, '');

/** "08:30" -> "8:30am", "13:00" -> "1pm" */
function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

export function isOpenNow(hours: WeeklyHours[], timeZone: string, now = new Date()): boolean {
  const { day, minutes } = zonedNow(timeZone, now);
  const today = hours.find((h) => h.day === day);
  return Boolean(today?.open && today.close && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close));
}

/** "later today from 9am", "tomorrow from 8:30am", "on Monday from 8:30am", or null if no hours are set. */
export function nextOpeningText(hours: WeeklyHours[], timeZone: string, now = new Date()): string | null {
  const { day, minutes } = zonedNow(timeZone, now);
  const today = hours.find((h) => h.day === day);
  if (today?.open && minutes < toMinutes(today.open)) return `later today from ${formatTime12(today.open)}`;
  for (let i = 1; i <= 7; i++) {
    const d = hours.find((h) => h.day === (day + i) % 7);
    if (d?.open) return `${i === 1 ? 'tomorrow' : `on ${DAY_NAMES[d.day]}`} from ${formatTime12(d.open)}`;
  }
  return null;
}
