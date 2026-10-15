/** Calendar helpers that stay on the user's local date, never UTC. */

export function localISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalMondayWeek(date: Date = new Date()): Date {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = local.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  local.setDate(local.getDate() + offset);
  return local;
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Monday–Sunday ISO dates for the week that contains `date`. */
export function currentLocalWeekDates(date: Date = new Date()): string[] {
  const monday = startOfLocalMondayWeek(date);
  return Array.from({ length: 7 }, (_, index) => localISODate(addLocalDays(monday, index)));
}

export type LocalWeekRange = {
  start: string;
  end: string;
};

/** Monday–Sunday ISO range for the week that contains `date`. */
export function localMondayWeekRange(date: Date = new Date()): LocalWeekRange {
  const dates = currentLocalWeekDates(date);
  return { start: dates[0], end: dates[6] };
}

/**
 * The last `n` Monday–Sunday weeks in local time, oldest first.
 * The final entry is the week that contains `date`.
 */
export function lastNLocalWeekRanges(n: number, date: Date = new Date()): LocalWeekRange[] {
  const count = Math.max(0, Math.floor(n));
  const currentMonday = startOfLocalMondayWeek(date);
  return Array.from({ length: count }, (_, index) => {
    const monday = addLocalDays(currentMonday, -7 * (count - 1 - index));
    return {
      start: localISODate(monday),
      end: localISODate(addLocalDays(monday, 6)),
    };
  });
}
