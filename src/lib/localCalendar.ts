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
