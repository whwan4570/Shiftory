/**
 * Time utility functions for time entry processing
 */

/**
 * Parse a time string (HH:mm) and return minutes since midnight
 * @param timeStr - Time string in HH:mm format
 * @returns Minutes since midnight (0-1439)
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Parse a date string (YYYY-MM-DD) and time string (HH:mm) to a Date object
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:mm format
 * @returns Date object
 */
export function parseDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Calculate minutes difference between two times (in HH:mm format)
 * @param time1 - First time string (HH:mm)
 * @param time2 - Second time string (HH:mm)
 * @returns Difference in minutes (time1 - time2)
 */
export function timeDifferenceMinutes(time1: string, time2: string): number {
  const minutes1 = parseTimeToMinutes(time1);
  const minutes2 = parseTimeToMinutes(time2);
  return minutes1 - minutes2;
}
