/**
 * Settings API client (Labor Rules, etc.)
 */

import { apiRequest } from './api'

export interface LaborRules {
  overtimeDailyEnabled?: boolean
  overtimeDailyMinutes?: number
  overtimeWeeklyEnabled?: boolean
  overtimeWeeklyMinutes?: number
  breakPaid?: boolean
  weekStartsOn?: number
  availabilityDeadlineDays?: number
  // Check-in Policy
  checkinPrimaryMethod?: 'QR' | 'GPS'
  checkinAllowFallback?: boolean
  checkinGpsRadius?: number // in meters
  checkinRequireBoth?: boolean
  checkinWindowStartMins?: number
  checkinWindowEndMins?: number
  checkoutWindowStartMins?: number
  checkoutWindowEndMins?: number
  checkinNoShiftBehavior?: 'BLOCK' | 'ALLOW_FLAG' | 'ALLOW'
  checkinOfflineBehavior?: 'BLOCK' | 'ALLOW_REQUEST'
}

/**
 * Get labor rules for a store
 * @param storeId - Store ID
 * @returns Labor rules
 */
export async function getLaborRules(storeId: string): Promise<LaborRules> {
  try {
    return await apiRequest<LaborRules>(`/stores/${storeId}/labor-rules`)
  } catch (error: any) {
    // If endpoint doesn't exist or returns 404, return empty object
    if (
      error?.message?.includes('404') ||
      error?.message?.includes('not found')
    ) {
      return {}
    }
    throw error
  }
}

/**
 * Update labor rules for a store
 * @param storeId - Store ID
 * @param rules - Labor rules to update
 * @returns Updated labor rules
 */
export async function updateLaborRules(
  storeId: string,
  rules: Partial<LaborRules>
): Promise<LaborRules> {
  return apiRequest<LaborRules>(`/stores/${storeId}/labor-rules`, {
    method: 'PUT',
    body: JSON.stringify(rules),
  })
}

/**
 * Get weekStartsOn setting with fallback
 * @param storeId - Store ID
 * @returns weekStartsOn value (0 = Sunday, 1 = Monday, default: 1)
 */
export async function getWeekStartsOn(storeId: string): Promise<number> {
  try {
    const rules = await getLaborRules(storeId)
    if (rules.weekStartsOn !== undefined) {
      return rules.weekStartsOn
    }
  } catch (error) {
    console.warn('Failed to load labor rules:', error)
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('workhaja_weekStartsOn')
    if (stored !== null) {
      const value = Number.parseInt(stored, 10)
      if (value === 0 || value === 1) {
        return value
      }
    }
  }

  // Default: Monday (1)
  return 1
}

/**
 * Set weekStartsOn (deprecated - use updateLaborRules instead)
 * @param weekStartsOn - 0 for Sunday, 1 for Monday
 */
export function setWeekStartsOn(weekStartsOn: number): void {
  if (typeof window === 'undefined') return
  if (weekStartsOn !== 0 && weekStartsOn !== 1) {
    throw new Error('weekStartsOn must be 0 (Sunday) or 1 (Monday)')
  }
  localStorage.setItem('workhaja_weekStartsOn', String(weekStartsOn))
}
