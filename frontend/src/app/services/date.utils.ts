// Date and duration helpers. We always work with local-time YYYY-MM-DD strings
// so the user's "today" matches their phone, regardless of timezone.

import { T } from './strings';

/** "2025-05-03" for the given Date (local time). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** "HH:mm" for the given Date (local time). */
export function toIsoTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Parse 'YYYY-MM-DD' as a local-time Date. */
export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Sat, May 3" -- friendly label for a date string. */
export function prettyDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Round minutes UP to the nearest 5. Sessions never display in seconds and
 * never under-count time. So 1m → 5, 7m → 10, 22m → 25.
 * (We keep the raw exact value in storage; this is purely for display.)
 */
export function roundMinutesUp5(rawMinutes: number): number {
  if (rawMinutes <= 0) return 0;
  return Math.ceil(rawMinutes / 5) * 5;
}

/**
 * "1h 30m" / "45m" / "5m". Always rounded-up-to-5. Never shows seconds.
 */
export function formatDuration(rawMinutes: number): string {
  const minutes = roundMinutesUp5(rawMinutes);
  if (minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Primary bold label shown as session headline.
 * Always shows the duration prominently.
 *   < 15 min  → "short session · 10m"  (shortSession label + duration)
 *   15–59 min → "45m"
 *   >= 60 min → "long session · 1h 30m"
 */
export function sessionHeadline(rawMinutes: number): string {
  const dur = formatDuration(rawMinutes);
  if (rawMinutes < 15) return `${T.shortSession} · ${dur}`;
  if (rawMinutes >= 60) return `${T.longSession} · ${dur}`;
  return dur;
}

/**
 * The smaller, greyed secondary line (the time range like "10:00–11:30").
 * Since the headline already shows the duration, this is just the clock times.
 * Return null if nothing extra to show (duration-only sessions).
 */
export function sessionDurationSecondary(rawMinutes: number): string | null {
  // Duration is always in the headline now; secondary is for time-of-day only
  // (handled at the call site by passing startTime/endTime). Return null here.
  return null;
}

/**
 * For the elapsed-timer display while a session is running.
 * NEVER shows seconds - that was stressful. Just minutes / hours.
 * Under 1 minute → "<1m" (so the user knows it's running, but no ticking).
 */
export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return '<1m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Streak calculation.
 *
 * Two numbers:
 *   total: how many "good days" she's had ever (any day with a session)
 *   inRow: current run of consecutive days where she met expectations
 *
 * Rules:
 *   - A day with at least one session counts and extends the streak.
 *   - A day marked as a rest day doesn't break or extend it.
 *   - A day with no plan and no session doesn't count or break it
 *     (she doesn't have to learn every day).
 *   - A day with a plan but no session AND not marked rest DOES break it.
 *   - Today is always "in progress" - never breaks the streak by itself.
 */
export interface StreakInfo { total: number; inRow: number; }

export function calculateStreak(opts: {
  sessionDates: Set<string>;
  plannedDates: Set<string>;
  restDays: Set<string>;
  today: string;
}): StreakInfo {
  const { sessionDates, plannedDates, restDays, today } = opts;
  const total = sessionDates.size;

  let inRow = 0;
  const cursor = parseIsoDate(today);

  if (sessionDates.has(today)) {
    inRow++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // Today is in progress - move to yesterday to evaluate.
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const iso = toIsoDate(cursor);

    // Safety cap: don't look back more than 2 years
    const msBack = parseIsoDate(today).getTime() - cursor.getTime();
    if (msBack > 365 * 2 * 24 * 60 * 60 * 1000) break;

    if (sessionDates.has(iso)) {
      inRow++;
    } else if (restDays.has(iso)) {
      // skip day - doesn't count or break
    } else if (!plannedDates.has(iso)) {
      // no plan, no session - doesn't count or break (not every day needs learning)
    } else {
      // had a plan, didn't learn, not a skip → streak ends here
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return { total, inRow };
}
