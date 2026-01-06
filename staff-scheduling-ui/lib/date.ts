/**
 * Date utility functions for schedule management
 */

/**
 * Get month range with from/to dates and all days in the month
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Object with from, to (YYYY-MM-DD) and days array
 */
export function getMonthRange(year: number, month: number): {
  from: string
  to: string
  days: Date[]
} {
  // Validate month range
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12')
  }

  // First day of the month
  const firstDay = new Date(year, month - 1, 1)
  // Last day of the month
  const lastDay = new Date(year, month, 0)

  // Format as YYYY-MM-DD
  const from = formatYMD(firstDay)
  const to = formatYMD(lastDay)

  // Generate all days in the month
  const days: Date[] = []
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month - 1, day))
  }

  return { from, to, days }
}

/**
 * Format date as YYYY-MM-DD
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatYMD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse date string (ISO or YYYY-MM-DD) to Date object
 * @param dateStr - Date string
 * @returns Date object
 */
export function parseDate(dateStr: string): Date {
  // Handle ISO strings
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`)
  }
  return date
}

/**
 * Extract YYYY-MM-DD from ISO date string
 * @param dateStr - ISO date string or YYYY-MM-DD
 * @returns YYYY-MM-DD string
 */
export function extractYMD(dateStr: string): string {
  // If already YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  // Otherwise parse and format
  const date = parseDate(dateStr)
  return formatYMD(date)
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 * @param timeStr - Time string in HH:mm format
 * @returns Minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 * @param minutes - Minutes since midnight
 * @returns Time string in HH:mm format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Compare two time strings (HH:mm)
 * @param time1 - First time string
 * @param time2 - Second time string
 * @returns Negative if time1 < time2, positive if time1 > time2, 0 if equal
 */
export function compareTimes(time1: string, time2: string): number {
  return timeToMinutes(time1) - timeToMinutes(time2)
}

/**
 * Parse YYYY-MM-DD string to Date object
 * @param ymd - Date string in YYYY-MM-DD format
 * @returns Date object
 */
export function parseYMD(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid YYYY-MM-DD format: ${ymd}`)
  }
  return new Date(year, month - 1, day)
}

/**
 * Get week range with from/to dates and all days in the week
 * @param anchorDate - Any date in the week
 * @param weekStartsOn - 0 = Sunday, 1 = Monday
 * @returns Object with from, to (YYYY-MM-DD) and days array
 */
export function getWeekRange(
  anchorDate: Date,
  weekStartsOn: number = 1
): {
  from: string
  to: string
  days: Date[]
} {
  // Validate weekStartsOn
  if (weekStartsOn !== 0 && weekStartsOn !== 1) {
    throw new Error('weekStartsOn must be 0 (Sunday) or 1 (Monday)')
  }

  // Get the day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = anchorDate.getDay()

  // Calculate offset to get to the start of the week
  // If weekStartsOn is 1 (Monday), we need to adjust:
  // - Monday (1) -> 0 days back
  // - Tuesday (2) -> 1 day back
  // - ...
  // - Sunday (0) -> 6 days back
  // If weekStartsOn is 0 (Sunday), we need to adjust:
  // - Sunday (0) -> 0 days back
  // - Monday (1) -> 1 day back
  // - ...
  // - Saturday (6) -> 6 days back
  let daysToSubtract: number
  if (weekStartsOn === 1) {
    // Week starts on Monday
    daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  } else {
    // Week starts on Sunday
    daysToSubtract = dayOfWeek
  }

  // Calculate start of week
  const startOfWeek = new Date(anchorDate)
  startOfWeek.setDate(anchorDate.getDate() - daysToSubtract)
  startOfWeek.setHours(0, 0, 0, 0)

  // Calculate end of week (6 days after start)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  // Format as YYYY-MM-DD
  const from = formatYMD(startOfWeek)
  const to = formatYMD(endOfWeek)

  // Generate all days in the week
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    days.push(day)
  }

  return { from, to, days }
}

/**
 * Add or subtract months from a year/month pair
 * @param year - Current year
 * @param month - Current month (1-12)
 * @param delta - Number of months to add (positive) or subtract (negative)
 * @returns New year and month (month always 1-12)
 */
export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  // Convert to 0-based month for easier calculation
  const date = new Date(year, month - 1, 1)
  date.setMonth(date.getMonth() + delta)

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // Convert back to 1-based
  }
}

/**
 * Format week range for display
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @returns Formatted string like "Week of Jan 5 – Jan 11, 2026"
 */
export function formatWeekRange(from: string, to: string): string {
  const fromDate = parseYMD(from)
  const toDate = parseYMD(to)

  const fromMonth = fromDate.toLocaleDateString('en-US', { month: 'short' })
  const fromDay = fromDate.getDate()
  const fromYear = fromDate.getFullYear()

  const toMonth = toDate.toLocaleDateString('en-US', { month: 'short' })
  const toDay = toDate.getDate()
  const toYear = toDate.getFullYear()

  // If same month and year
  if (fromMonth === toMonth && fromYear === toYear) {
    return `Week of ${fromMonth} ${fromDay} – ${toDay}, ${fromYear}`
  }
  // If different months but same year
  if (fromYear === toYear) {
    return `Week of ${fromMonth} ${fromDay} – ${toMonth} ${toDay}, ${fromYear}`
  }
  // Different years
  return `Week of ${fromMonth} ${fromDay}, ${fromYear} – ${toMonth} ${toDay}, ${toYear}`
}

