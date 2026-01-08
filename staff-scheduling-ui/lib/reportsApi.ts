/**
 * Reports API client
 */

import { apiRequest } from "./api"

export interface WeeklySummary {
  from: string
  to: string
  totalMins: number
  paidMins: number
  breakMins: number
  overtimeMins: number
  byDay: Array<{
    date: string
    paidMins: number
    overtimeMins: number
  }>
}

export interface MonthlySummary {
  year: number
  month: number
  totalMins: number
  paidMins: number
  breakMins: number
  overtimeMins: number
}

export interface StaffMonthlySummary {
  year: number
  month: number
  users: Array<{
    userId: string
    userName: string
    userEmail: string
    totalMins: number
    paidMins: number
    breakMins: number
    overtimeMins: number
  }>
}

/**
 * Get my weekly summary
 * @param storeId - Store ID
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @returns Weekly summary
 */
export async function getMyWeeklySummary(
  storeId: string,
  from: string,
  to: string
): Promise<WeeklySummary> {
  return apiRequest<WeeklySummary>(`/stores/${storeId}/me/summary/weekly?from=${from}&to=${to}`)
}

/**
 * Get my monthly summary
 * @param storeId - Store ID
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Monthly summary
 */
export async function getMyMonthlySummary(
  storeId: string,
  year: number,
  month: number
): Promise<MonthlySummary> {
  return apiRequest<MonthlySummary>(`/stores/${storeId}/me/summary/monthly/${year}-${month}`)
}

/**
 * Get staff monthly summary (OWNER/MANAGER only)
 * @param storeId - Store ID
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Staff monthly summary
 */
export async function getStaffMonthlySummary(
  storeId: string,
  year: number,
  month: number
): Promise<StaffMonthlySummary> {
  return apiRequest<StaffMonthlySummary>(`/stores/${storeId}/summary/monthly/${year}-${month}`)
}

/**
 * Convert minutes to hours and minutes string
 * @param mins - Minutes
 * @returns Formatted string (e.g., "8h 30m")
 */
export function formatMinutes(mins: number): string {
  // Handle NaN, null, undefined, or invalid numbers
  if (typeof mins !== 'number' || isNaN(mins) || mins === null || mins === undefined) {
    return '0m'
  }
  
  // Ensure non-negative
  const validMins = Math.max(0, Math.floor(mins))
  const hours = Math.floor(validMins / 60)
  const minutes = validMins % 60
  
  if (hours === 0) {
    return `${minutes}m`
  }
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes}m`
}

/**
 * Convert minutes to decimal hours
 * @param mins - Minutes
 * @returns Decimal hours (e.g., 8.5)
 */
export function minutesToDecimalHours(mins: number): number {
  return Math.round((mins / 60) * 10) / 10
}

