/**
 * Shift warning utility functions
 * Calculates warnings for shifts based on labor rules
 */

export interface ShiftWarning {
  type: 'DAILY_HOURS' | 'WEEKLY_HOURS' | 'BREAK_REQUIRED' | 'CONSECUTIVE_HOURS';
  message: string;
  severity: 'warning' | 'error';
}

export interface ShiftWithTime {
  id: string;
  userId: string;
  date: Date;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMins: number;
}

/**
 * Calculate shift duration in minutes
 */
function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  
  let startTotal = startHours * 60 + startMins;
  let endTotal = endHours * 60 + endMins;
  
  // Handle overnight shifts (endTime < startTime)
  if (endTotal < startTotal) {
    endTotal += 24 * 60; // Add 24 hours
  }
  
  return endTotal - startTotal;
}

/**
 * Calculate total working hours (excluding breaks)
 */
function calculateWorkingMinutes(shift: ShiftWithTime): number {
  const duration = calculateDurationMinutes(shift.startTime, shift.endTime);
  return duration - (shift.breakMins || 0);
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date, weekStartsOn: number = 1): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday) for a given date
 */
function getWeekEnd(date: Date, weekStartsOn: number = 1): Date {
  const weekStart = getWeekStart(date, weekStartsOn);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Check if two shifts are consecutive (no gap or minimal gap)
 */
function areConsecutive(
  shift1: ShiftWithTime,
  shift2: ShiftWithTime,
  maxGapMinutes: number = 30,
): boolean {
  const date1 = new Date(shift1.date);
  const date2 = new Date(shift2.date);
  
  // Same day
  if (date1.toDateString() === date2.toDateString()) {
    const [endHours, endMins] = shift1.endTime.split(':').map(Number);
    const [startHours, startMins] = shift2.startTime.split(':').map(Number);
    
    const endTotal = endHours * 60 + endMins;
    const startTotal = startHours * 60 + startMins;
    
    return startTotal - endTotal <= maxGapMinutes;
  }
  
  // Next day (overnight shift followed by morning shift)
  const daysDiff = Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff === 1) {
    const [endHours, endMins] = shift1.endTime.split(':').map(Number);
    const [startHours, startMins] = shift2.startTime.split(':').map(Number);
    
    // If shift1 ends late (e.g., 23:00) and shift2 starts early (e.g., 06:00)
    // Check if gap is within maxGapMinutes
    const endTotal = endHours * 60 + endMins;
    const startTotal = startHours * 60 + startMins;
    
    // Overnight: end might be next day
    const endTotalAdjusted = endHours < 12 ? endTotal + 24 * 60 : endTotal;
    const gap = startTotal + 24 * 60 - endTotalAdjusted;
    
    return gap <= maxGapMinutes;
  }
  
  return false;
}

/**
 * Calculate total consecutive hours for a shift
 */
function calculateConsecutiveHours(
  shift: ShiftWithTime,
  allShifts: ShiftWithTime[],
): number {
  // Get all shifts for the same user sorted by date/time
  const userShifts = allShifts
    .filter((s) => s.userId === shift.userId)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.startTime.localeCompare(b.startTime);
    });

  // Find shift index
  const shiftIndex = userShifts.findIndex((s) => s.id === shift.id);
  if (shiftIndex === -1) return 0;

  // Calculate consecutive hours backwards and forwards
  let totalMinutes = calculateWorkingMinutes(shift);
  
  // Check backwards
  for (let i = shiftIndex - 1; i >= 0; i--) {
    if (areConsecutive(userShifts[i], userShifts[i + 1])) {
      totalMinutes += calculateWorkingMinutes(userShifts[i]);
    } else {
      break;
    }
  }
  
  // Check forwards
  for (let i = shiftIndex + 1; i < userShifts.length; i++) {
    if (areConsecutive(userShifts[i - 1], userShifts[i])) {
      totalMinutes += calculateWorkingMinutes(userShifts[i]);
    } else {
      break;
    }
  }

  return totalMinutes / 60; // Convert to hours
}

/**
 * Calculate warnings for a single shift
 */
export function calculateShiftWarnings(
  shift: ShiftWithTime,
  allShifts: ShiftWithTime[],
  weekStartsOn: number = 1,
  rules: {
    maxDailyHours?: number;
    maxWeeklyHours?: number;
    breakRequiredAfterHours?: number;
    minBreakMinutes?: number;
    consecutiveHoursWarning?: number;
  } = {},
): ShiftWarning[] {
  const warnings: ShiftWarning[] = [];
  
  // Default rules
  const maxDailyHours = rules.maxDailyHours ?? 8;
  const maxWeeklyHours = rules.maxWeeklyHours ?? 40;
  const breakRequiredAfterHours = rules.breakRequiredAfterHours ?? 6;
  const minBreakMinutes = rules.minBreakMinutes ?? 30;
  const consecutiveHoursWarning = rules.consecutiveHoursWarning ?? 10;

  // Calculate working minutes for this shift
  const workingMinutes = calculateWorkingMinutes(shift);
  const workingHours = workingMinutes / 60;

  // 1. Daily hours check
  if (workingHours > maxDailyHours) {
    warnings.push({
      type: 'DAILY_HOURS',
      message: `Daily hours exceed ${maxDailyHours}h (${workingHours.toFixed(1)}h)`,
      severity: 'warning',
    });
  }

  // 2. Weekly hours check
  const weekStart = getWeekStart(shift.date, weekStartsOn);
  const weekEnd = getWeekEnd(shift.date, weekStartsOn);
  
  const weeklyShifts = allShifts.filter((s) => {
    if (s.userId !== shift.userId) return false;
    const shiftDate = new Date(s.date);
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  });

  const weeklyMinutes = weeklyShifts.reduce(
    (sum, s) => sum + calculateWorkingMinutes(s),
    0,
  );
  const weeklyHours = weeklyMinutes / 60;

  if (weeklyHours > maxWeeklyHours) {
    warnings.push({
      type: 'WEEKLY_HOURS',
      message: `Weekly hours exceed ${maxWeeklyHours}h (${weeklyHours.toFixed(1)}h)`,
      severity: 'warning',
    });
  }

  // 3. Break requirement check (6h+ requires 30min break)
  if (workingMinutes >= breakRequiredAfterHours * 60) {
    const breakMinutes = shift.breakMins || 0;
    if (breakMinutes < minBreakMinutes) {
      warnings.push({
        type: 'BREAK_REQUIRED',
        message: `Shift of ${workingHours.toFixed(1)}h requires at least ${minBreakMinutes}min break`,
        severity: 'warning',
      });
    }
  }

  // 4. Consecutive hours warning (10h+ consecutive)
  const consecutiveHours = calculateConsecutiveHours(shift, allShifts);
  if (consecutiveHours >= consecutiveHoursWarning) {
    warnings.push({
      type: 'CONSECUTIVE_HOURS',
      message: `Consecutive work hours exceed ${consecutiveHoursWarning}h (${consecutiveHours.toFixed(1)}h)`,
      severity: 'warning',
    });
  }

  return warnings;
}

/**
 * Calculate warnings for all shifts
 */
export function calculateAllShiftWarnings(
  shifts: ShiftWithTime[],
  weekStartsOn: number = 1,
  rules?: {
    maxDailyHours?: number;
    maxWeeklyHours?: number;
    breakRequiredAfterHours?: number;
    minBreakMinutes?: number;
    consecutiveHoursWarning?: number;
  },
): Map<string, ShiftWarning[]> {
  const warningsMap = new Map<string, ShiftWarning[]>();

  for (const shift of shifts) {
    const warnings = calculateShiftWarnings(shift, shifts, weekStartsOn, rules);
    if (warnings.length > 0) {
      warningsMap.set(shift.id, warnings);
    }
  }

  return warningsMap;
}

