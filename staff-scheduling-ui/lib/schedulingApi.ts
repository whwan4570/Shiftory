/**
 * Scheduling API client
 */

import { apiRequest } from './api'

/**
 * Get shifts for a date range
 * @param storeId - Store ID
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param userId - Optional user ID to filter by
 * @returns Array of shifts
 */
export async function getShifts(
  storeId: string,
  from: string,
  to: string,
  userId?: string
) {
  const params = new URLSearchParams({ from, to })
  if (userId) {
    params.append('userId', userId)
  }

  return apiRequest<Shift[]>(`/stores/${storeId}/shifts?${params.toString()}`)
}

/**
 * Create a new shift
 * @param storeId - Store ID
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @param payload - Shift creation data
 * @returns Created shift
 */
export async function createShift(
  storeId: string,
  year: number,
  month: number,
  payload: {
    userId: string
    date: string
    startTime: string
    endTime: string
    breakMins?: number
  }
) {
  return apiRequest<Shift>(
    `/stores/${storeId}/months/${year}-${month}/shifts`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

/**
 * Publish a schedule month
 * @param storeId - Store ID
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Updated month
 */
export async function publishMonth(
  storeId: string,
  year: number,
  month: number
) {
  return apiRequest<ScheduleMonth>(
    `/stores/${storeId}/months/${year}-${month}/publish`,
    {
      method: 'POST',
    }
  )
}

/**
 * Get schedule month by year and month
 * @param storeId - Store ID
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Schedule month or null if not found
 */
export async function getMonth(
  storeId: string,
  year: number,
  month: number
): Promise<ScheduleMonth | null> {
  try {
    return await apiRequest<ScheduleMonth>(
      `/stores/${storeId}/months/${year}-${month}`
    )
  } catch (error: any) {
    // If 404, return null (month doesn't exist)
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      return null
    }
    throw error
  }
}

/**
 * Create a new schedule month
 * @param storeId - Store ID
 * @param payload - Month creation data
 * @returns Created month
 */
export async function createMonth(
  storeId: string,
  payload: {
    year: number
    month: number
    lockAt?: string // ISO string
  }
) {
  return apiRequest<ScheduleMonth>(`/stores/${storeId}/months`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Copy shifts from one month to another
 * @param storeId - Store ID
 * @param payload - Copy month data
 * @returns Number of shifts copied
 */
export async function copyMonth(
  storeId: string,
  payload: {
    fromYear: number
    fromMonth: number
    toYear: number
    toMonth: number
  }
) {
  return apiRequest<{ copied: number }>(`/stores/${storeId}/months/copy`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Update a shift
 * @param storeId - Store ID
 * @param shiftId - Shift ID
 * @param payload - Shift update data
 * @returns Updated shift
 */
export async function updateShift(
  storeId: string,
  shiftId: string,
  payload: {
    userId?: string
    date?: string
    startTime?: string
    endTime?: string
    breakMins?: number
  }
) {
  return apiRequest<Shift>(`/stores/${storeId}/shifts/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * Delete a shift
 * @param storeId - Store ID
 * @param shiftId - Shift ID
 */
export async function deleteShift(storeId: string, shiftId: string) {
  return apiRequest<{ ok: boolean }>(`/stores/${storeId}/shifts/${shiftId}`, {
    method: 'DELETE',
  })
}

/**
 * Shift type from API
 */
export interface Shift {
  id: string
  storeId: string
  monthId: string
  userId: string
  date: string // ISO date string
  startTime: string // HH:mm
  endTime: string // HH:mm
  breakMins: number
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELED'
  isCanceled: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name: string
  }
  month?: {
    id: string
    year: number
    month: number
    status: 'OPEN' | 'DRAFT' | 'PUBLISHED'
  }
}

/**
 * Schedule month type from API
 */
export interface ScheduleMonth {
  id: string
  storeId: string
  year: number
  month: number
  status: 'OPEN' | 'DRAFT' | 'PUBLISHED'
  lockAt: string | null
  createdAt: string
  updatedAt: string
}

